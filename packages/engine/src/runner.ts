import { Assertor } from './assertor'
import { CaseManger } from './caseManager'
import { merge, pick } from 'lodash'
import { Page, BrowserContextOptions } from 'playwright'
import { Action, ManualAction } from './types'
import { EventEmitter } from 'stream'
import { BrowserManger } from './browserManager'
import { MockProxy } from './mockProxy'
import { RunnerConfig } from './types'
import { O } from 'ts-toolbelt'
import { join } from 'path'
import { rmDir, writeJson } from '@idux/wetest-share'
import { existsSync } from 'fs'
// import NetworkHelper from './utils/networkHelper'
import TestInfoImpl from './utils/testInfoImpl'
import { autoTrySelector } from './utils/common'
import { Log } from './utils/log'
import { setTestInfoImplState, getRunnerConfig, getTestInfoImplState } from '@idux/wetest-share'
import dayjs from 'dayjs'
import { reqSmsCode } from '@idux/wetest-inject/logics/toolbar/useSmsCode'

class Runner extends EventEmitter {
  private options: RunnerConfig = {
    errorsDir: join(process.cwd(), '__errors__'),
    stateDir: join(process.cwd(), 'state.json'),
    traceDir: join(process.cwd(), 'traceData'),
    loginUrl: '',
    cookies: [],
    browser: {
      type: 'chromium',
      headless: true,
      launchOptions: {},
    },
    reporter: {
      alwaysShowTracing: false,

      tracingScreenshots: true,
    },
    userAgent: {},
    timeout: 30000,
    waitForNetwork: true,
  }
  private caseName: string = ''
  private traceMap = new Map()
  // private networkHelper: any
  private browserManager!: BrowserManger
  private caseManager!: CaseManger
  private assertor!: Assertor

  constructor(options?: O.Partial<RunnerConfig, 'deep'>) {
    super()
    merge(this.options, options)
  }

  private async init(caseDir: string, fileName: string) {
    if (!this.browserManager) {
      this.browserManager = new BrowserManger()
      await this.browserManager.launch(this.options.browser.type, {
        ...this.options.browser.launchOptions,
        headless: this.options.browser.headless,
        slowMo: this.options.actionInterval,
      })
    }
    this.caseManager = new CaseManger(caseDir)
    this.caseManager.load()

    const runnerConfig = getRunnerConfig()

    this.assertor = new Assertor({
      ...this.caseManager.pathResolve,
      runtimeDir: join(this.options.errorsDir, fileName),
      snapshotTransfer: runnerConfig.snapshotTransfer,
      origin: {
        old: this.caseManager.case.origin,
        new: this.options.origin,
      },
    })

    this.assertor.loadSnapshots()

    if (this.caseManager.case.saveMock) {
      const mockProxy = new MockProxy({
        omitParams: this.options.proxy?.omitParams,
      })
      mockProxy.load(this.caseManager.pathResolve.mockFile)

      this.browserManager.on('newPage', (page: Page, pageId: string) => {
        mockProxy.proxyPage({ page, pageId, origin: this.caseManager?.case.origin, originCurrent: this.options.origin })
      })

      this.browserManager.on('newContext', context => {
        this.options.proxy?.customProxy && mockProxy.addCustomProxy(context, this.options.proxy.customProxy)
      })
    }
  }

  async stopTracing(testInfoImpl: TestInfoImpl) {
    return await this.browserManager.stopTracing(
      join(this.options.traceDir, `${testInfoImpl.getTestInfo().testId}.zip`),
    )
  }

  async runCase(caseDir: string, fileName: string) {
    await this.init(caseDir, fileName)
    const errorsDir = join(this.options.errorsDir, fileName)
    this.options.beforeRunCase?.({ caseManager: this.caseManager })
    this.caseName = this.caseManager.case.name
    const runnerConfig = getRunnerConfig()

    // 执行登录用例前需要把已有的state删掉，防止污染
    if (this.caseManager.case.loginCase && existsSync(this.options.stateDir)) {
      rmDir(this.options.stateDir)
    }

    const testInfoImpl = new TestInfoImpl({ name: fileName })
    this.browserManager.initListener(testInfoImpl)
    setTestInfoImplState(testInfoImpl)
    for (let index = 0; index < this.caseManager.case.actions.length; index++) {
      const action = this.caseManager.case.actions[index]
      const startTime = Date.now()

      try {
        await this.runAction(action)
      } catch (error) {
        if (error instanceof Error) {
          if ((action as ManualAction).page && this.browserManager) {
            const pageUrl = this.browserManager
              .getPage((action as ManualAction).context, (action as ManualAction).page)
              .url()

            if (!this.caseManager.case.loginCase && pageUrl === runnerConfig.loginUrl) {
              error.message = '[user-state-error]'
              await this.stopTracing(testInfoImpl)
              await this.browserManager.closeContext()
              throw error
            }
          }

          writeJson(
            {
              action,
              message: error.message,
              cause: [...this.traceMap.keys()],
            },
            join(errorsDir, 'error.log'),
          )

          if (error.message.includes('waitForLoadState') && error.message.includes('Timeout')) {
            ;[...this.traceMap.keys()].forEach(item => {
              testInfoImpl.addStep({
                stepId: 'pw:timeout@1',
                title: '资源加载超时',
                startTime,
                endTime: Date.now(),
                error: `[${dayjs(startTime).format('YYYY-MM-DD HH:mm:ss')}] 等待超时： ${item}`,
                status: 'fail',
              })
            })
          }

          await this.stopTracing(testInfoImpl)
          testInfoImpl.complete('fail')
          this.emit('testEnd', testInfoImpl.getTestInfo())

          if (this.caseManager.case.loginCase) {
            error.message = '[login-error]'
          } else {
            await this.browserManager.closeContext()
          }
          throw error
        }
      }
    }

    testInfoImpl.complete('pass')
    this.emit('testEnd', testInfoImpl.getTestInfo())

    // 成功执行，删除error下的目录
    rmDir(errorsDir)

    this.options.afterRunCase?.({ caseManager: this.caseManager, result: [] })
  }

  private async runAction(action: Action) {
    Log.runnerActionLog(action.action)
    const runnerConfig = getRunnerConfig()
    if (action.action === 'assertion') {
      // await this.networkHelper.waitForNetworkSettled()
      await this.assertor.runAssertion(action, this.browserManager.getPage(action.context, action.page))
      return
    }

    if (action.action === 'newContext') {
      const contextParams: BrowserContextOptions = {
        viewport: this.caseManager.case.viewport,
        ignoreHTTPSErrors: true,
      }
      if (existsSync(this.options.stateDir)) {
        contextParams.storageState = this.options.stateDir
      }
      const context = await this.browserManager.newContext(action.params.id, contextParams)
      await this.browserManager.startTracing(context, {
        screenshots: this.options.reporter.tracingScreenshots,
        snapshots: true,
        title: this.caseName,
      })

      if (runnerConfig.abortUrl) {
        await context.route(runnerConfig.abortUrl, (route, request) => {
          console.log('--global abort url:', request.url())
          route.abort()
        })
      }
      return
    }

    if (action.action === 'closeContext') {
      const {
        params: { id },
      } = action

      const ctx = this.browserManager.getContext(id)

      const testInfoImpl = getTestInfoImplState()

      // 当配置了总是输出跟踪栈，成功的时候也需要输出
      if (this.options.reporter.alwaysShowTracing) {
        await this.stopTracing(testInfoImpl)
      }

      await ctx.close()
      return
    }

    if (action.action === 'newPage') {
      const {
        context: cxtId,
        params: { id: pageId, url },
      } = action
      const context = this.browserManager.getContext(cxtId)
      const page = await context.newPage()

      page.on('request', interceptedRequest => {
        const url = interceptedRequest.url()
        this.traceMap.set(url, interceptedRequest)
      })

      page.on('requestfinished', interceptedRequest => {
        const url = interceptedRequest.url()
        this.traceMap.delete(url)
      })

      if (runnerConfig.abortUrl) {
        await page.route(runnerConfig.abortUrl, (route, req) => {
          console.log('----page abort url', req.url())
          route.abort()
        })
      }

      // this.networkHelper = new NetworkHelper(page)
      const newUrl =
        this.caseManager?.case.origin && this.options.origin
          ? url.replace(this.caseManager?.case.origin, this.options.origin)
          : url
      this.browserManager.setPage(page, cxtId, pageId)
      await page.goto(newUrl, {
        waitUntil: 'load',
      })

      if (this.options.waitForNetwork) {
        await page.waitForLoadState('networkidle', {
          timeout: this.options.timeout,
        })
      }

      page.setDefaultTimeout(this.options.timeout)
      return
    }

    if (action.action === 'saveStatus') {
      const { context: cxtId } = action

      const context = this.browserManager.getContext(cxtId)
      context.addCookies(this.options.cookies)
      await context.storageState({ path: this.options.stateDir })
    }

    if (action.action === 'closePage') {
      const {
        context: cxtId,
        params: { id: pageId },
      } = action
      await this.browserManager.getPage(cxtId, pageId).close()
      return
    }

    if (action.action === 'error') {
      throw new Error(`Action: action '${action.action}' is invalid.`)
    }

    // await this.networkHelper.waitForNetworkSettled()
    await this.runManualAction(action)
  }

  private async runManualAction(action: ManualAction) {
    const { context: cxtId, page: pageId, signals = {} } = action
    const page = this.browserManager.getPage(cxtId, pageId)

    let actionPromise = () => Promise.resolve()

    if (action.action === 'click') {
      // 配置：https://playwright.dev/docs/api/class-page#page-click
      const options = pick(action.params, [
        'button',
        'clickCount',
        'delay',
        'force',
        'modifiers',
        'noWaitAfter',
        'position',
        'strict',
        'timeout',
        'trial',
      ])
      const pageFn = (selector: string) => page.click(selector, options)
      actionPromise = () => autoTrySelector(pageFn, action.params.selector, page)
    }
    if (action.action === 'hover') {
      const pageFn = (selector: string) => page.hover(selector)
      actionPromise = () => autoTrySelector(pageFn, action.params.selector, page)
    }
    if (action.action === 'waitForTimeout') {
      await page.waitForTimeout(action.params.time)
    }
    if (action.action === 'smsCode') {
      const params = action.params
      const smsCode = await reqSmsCode(params)
      if (smsCode) {
        console.log("I'm waitting for 1 seconds before filling smsCode:", smsCode)
        await page.waitForTimeout(1000)
        const inputEl = page.locator(params.smsId)
        if (await inputEl.isVisible()) {
          await inputEl.fill(`${smsCode}`)
        } else {
          throw new Error(`[wetest: SmsCode]: Can't find smsId: ${params.smsId}`)
        }
        console.log("I'm done for everything")
      } else {
        throw new Error(`[wetest: SmsCode]: SmsCode is Empty`)
      }
    }
    if (action.action === 'input') {
      const pageFn = (selector: string) => page.fill(selector, action.params.content)
      actionPromise = () => autoTrySelector(pageFn, action.params.selector, page)
    }
    if (action.action === 'press') {
      const modifier = action.params.modifiers?.join('+')
      const key = modifier ? `${modifier}+${action.params.key}` : action.params.key
      const pageFn = (selector: string) => page.press(selector, key)
      actionPromise = () => autoTrySelector(pageFn, action.params.selector, page)
    }
    if (action.action === 'scroll') {
      actionPromise = async () => {
        await page.evaluate(`window.scrollTo(${action.params.x}, ${action.params.y})`)
      }
    }

    if (signals.popup) {
      const [popupPage] = await Promise.all([page.waitForEvent('popup'), actionPromise()])
      this.browserManager.setPage(popupPage, cxtId, signals.popup.pageId)
    } else {
      // await this.networkHelper.waitForNetworkSettled()
      await actionPromise()
    }
    await page.waitForTimeout(600)
    if (this.options.waitForNetwork) {
      await page.waitForLoadState('networkidle', {
        timeout: this.options.timeout,
      })
    }
  }

  async finish() {
    await this.browserManager?.close()
  }
}

export { Runner }
