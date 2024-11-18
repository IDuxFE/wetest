import { BrowserName } from '@idux/wetest-engine'
import {
  chromium,
  firefox,
  webkit,
  Browser,
  BrowserContext,
  Page,
  BrowserType,
  LaunchOptions,
  BrowserContextOptions,
} from 'playwright'
import { EventEmitter } from 'stream'
import { flattenDeep } from 'lodash'
import { useTraceStart, useTracestop } from './hooks/useTrace'
import type TestInfoImpl from './utils/testInfoImpl'
import { Step } from './types/testInfo'
import { getEngineIsRunning, getRunnerConfig } from '@idux/wetest-share'

export function getBrowser(browser: BrowserName): BrowserType {
  return {
    chromium,
    firefox,
    webkit,
  }[browser]
}

export class BrowserManger extends EventEmitter {
  browser?: Browser

  private contextIdMap: Map<string, BrowserContext> = new Map()
  private contextMap: Map<BrowserContext, Map<string, Page>> = new Map()

  initListener(testInfoImpl: TestInfoImpl) {
    let stepIndex = 0
    const createInstrumentationListener = () => {
      return {
        onApiCallBegin: (apiCall, stackTrace, id, userData) => {
          // playwright api开始监听器
          const stepId = `pw:api@${apiCall}@${stepIndex++}`

          const step: Step = {
            stepId,
            startTime: Date.now(),
            title: `操作浏览器api：${apiCall}`,
            status: 'pass',
          }

          testInfoImpl.addStep(step)

          userData.userObject = step
        },
        onApiCallEnd: (userData, error) => {
          // playwright api结束监听器

          const step = userData.userObject

          if (step) {
            step.endTime = Date.now()
          }

          if (error) {
            step.error = error.toString()
            step.status = 'fail'
          }
        },
      }
    }

    const onDidCreateBrowserContext = async context => {
      const listener = createInstrumentationListener()

      context._instrumentation.addListener(listener)
    }

    for (const browserType of [chromium, firefox, webkit]) {
      // 为个浏览器注册playwright api监听器
      ;(browserType as any)._onDidCreateContext = onDidCreateBrowserContext
    }
  }

  async launch(browserName: BrowserName, launchOptions: LaunchOptions) {
    const browserType = getBrowser(browserName)
    this.browser = await browserType.launch(launchOptions)
    return this
  }

  getContext(cxtId: string) {
    const context = this.contextIdMap.get(cxtId)
    if (!context) {
      throw new Error(`[BrowserManger] Context(${cxtId}) not found.`)
    }
    return context
  }

  async newContext(id: string, options?: BrowserContextOptions) {
    if (!this.browser) {
      throw new Error('[wetest: BrowserManager] you should launch a browser before create context')
    }

    if (getEngineIsRunning()) {
      const runnerConfig = getRunnerConfig()

      let userAgent = runnerConfig.userAgent

      if (options && userAgent && userAgent[this.browser.browserType().name()]) {
        options.userAgent = userAgent[this.browser.browserType().name()]
      }
    }

    const context = await this.browser.newContext(options)
    this.contextIdMap.set(id, context)

    this.emit('newContext', context, id)
    return context
  }

  getPage(cxtId: string, pageId: string) {
    const page = this.contextMap.get(this.getContext(cxtId))?.get(pageId)
    if (!page) {
      throw new Error(`Page(${pageId}) under Context(${cxtId}) not found.`)
    }
    return page
  }

  setPage(page: Page, cxtId: string, pageId: string) {
    const context = this.getContext(cxtId)
    const pageMap = this.contextMap.get(context) ?? new Map()
    pageMap.set(pageId, page)
    this.contextMap.set(context, pageMap)
    this.emit('newPage', page, pageId, cxtId)
  }

  async newPage(cxtId: string, pageId: string) {
    const context = this.getContext(cxtId)
    const page = await context.newPage()
    this.setPage(page, cxtId, pageId)
    return page
  }

  /**
   * 广播page
   * 遍历pages，执行evaluate
   *
   * @param {string} evaluate
   * @param {string} [cxtId]
   * @memberof BrowserManger
   */
  async broadcastPage(evaluate: string, cxtId?: string) {
    const contexts = cxtId ? [this.getContext(cxtId)] : this.browser?.contexts() ?? []
    const pages = flattenDeep(contexts.map(cxt => cxt.pages()))
    await Promise.all(pages.map(page => page.evaluate(evaluate)))
  }

  async closeContext(id?: string | string[]) {
    let contexts: BrowserContext[] = []
    if (!id) {
      contexts = this.browser?.contexts() ?? []
    } else {
      const ids = Array.isArray(id) ? id : [id]
      contexts = ids.map(id => this.getContext(id))
    }
    return Promise.all(contexts.map(ctx => ctx.close()) ?? [])
  }

  async close() {
    await this.closeContext()
    await this.browser?.close()
  }

  async stopTracing(saveTracPath: string, id?: string | string[]) {
    let contexts: BrowserContext[] = []
    if (!id) {
      contexts = this.browser?.contexts() ?? []
    } else {
      const ids = Array.isArray(id) ? id : [id]
      contexts = ids.map(id => this.getContext(id))
    }
    return Promise.all(
      contexts.map(async ctx => {
        return await useTracestop(ctx, saveTracPath)
      }) ?? [],
    )
  }

  async startTracing(context: BrowserContext, options = {}) {
    return await useTraceStart(context, options)
  }
}
