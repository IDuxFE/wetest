import { Assertor } from './assertor'
import { merge } from 'lodash'
import { join } from 'path'
import { BrowserContext, Page, BrowserContextOptions } from 'playwright'
import { EventEmitter } from 'stream'
import { Action, EngineApis, RecorderConfig } from './types'
import { getUuid } from './utils/uuid'
import { CaseManger } from './caseManager'
import { MockProxy } from './mockProxy'
import { O } from 'ts-toolbelt'
import { BrowserManger } from './browserManager'
import { writeJson } from './utils/fs'
import { existsSync } from 'fs'
import { getRecordConfig, loginCaseFileName } from '@wetest/share'
import { getDefaultSelectorCfg } from '@wetest/ai-selector/utils/util'

class Recorder extends EventEmitter {
  private browserManager = new BrowserManger()
  private caseManger?: CaseManger
  private assertor?: Assertor
  private mockProxy!: MockProxy

  private options: RecorderConfig = {
    rootDir: process.cwd(),
    stateDir: join(process.cwd(), 'state.json'),
    snapshotTransfer: getRecordConfig().snapshotTransfer,
    browser: {
      type: 'chromium',
    },
    selector: getDefaultSelectorCfg()
  }

  private recording = false

  constructor(options?: O.Partial<RecorderConfig, 'deep'>) {
    super()
    merge(this.options, options)
    this.options.stateDir = join(this.options.rootDir, 'state.json')
    this.mockProxy = new MockProxy({
      omitParams: this.options.proxy?.omitParams,
    })
  }

  private async prepareContext(context: BrowserContext, ctxId = getUuid()) {
    context.on('page', page => {
      this.onPage(page, ctxId)
    })

    context.on('close', () => {
      this.recordAction({
        action: 'closeContext',
        params: {
          id: ctxId,
        },
      })
    })

    await context.addInitScript({
      path: join(__dirname, '../inject/index.js'),
    })

    const isRecording: EngineApis['__wetest_isRecording'] = () => this.recording

    await context.exposeFunction('__wetest_isRecording', isRecording)
    await context.exposeBinding('__wetest_recordAction', ({ page }, action: Action) => {
      this.recordAction(action)

      if (action.action === 'assertion') {
        this.assertor?.assert(action, page)
      }
    })
    await context.exposeFunction('__wetest_createCase', this.createCase)
    await context.exposeFunction('__wetest_startRecord', this.startRecord)
    await context.exposeFunction('__wetest_finishRecord', this.finishRecord)
    await context.exposeFunction('__wetest_getwetestCfg', this.getwetestCfg)
    await context.exposeFunction('__wetest_exit', this.exit)
  }

  private async onPage(page: Page, ctxId: string, pageId = getUuid()) {
    this.browserManager.setPage(page, ctxId, pageId)

    this.preparePage(page, ctxId, pageId)

    if (await page.opener()) {
      this.caseManger?.setSignal({
        name: 'popup',
        pageId: pageId,
      })
    } else {
      await page.waitForEvent('domcontentloaded')
      this.recordAction({
        action: 'newPage',
        context: ctxId,
        params: {
          url: page.url(),
          id: pageId,
        },
      })
    }
  }

  private preparePage(page: Page, ctxId: string, pageId = getUuid()) {
    page.on('close', () => {
      this.recordAction({
        action: 'closePage',
        context: ctxId,
        params: {
          id: pageId,
        },
      })
    })

    page.on('domcontentloaded', () => {
      page.evaluate(`window.__wetest_contextId = '${ctxId}'`)
      page.evaluate(`window.__wetest_pageId = '${pageId}'`)
    })

    this.mockProxy.monitorPage(page, pageId)
  }

  private async recordAction(action: Action) {
    if (!this.recording) return
    this.caseManger?.recordAction(action)
  }

  async start({ url = 'http://localhost:8080' }: { url: string }) {
    await this.browserManager.launch(this.options.browser.type, { headless: false })
    this.browserManager.browser?.on('disconnected', this.exit)

    // 录制登录状态的  还要在看一下路径具体怎么保存和拿取
    const contextId = getUuid()
    const contextParams: BrowserContextOptions = {
      ignoreHTTPSErrors: true,
    }

    if (existsSync(this.options.stateDir)) {
      contextParams.storageState = this.options.stateDir
    }
    const context = await this.browserManager.newContext(contextId, contextParams)
    await this.prepareContext(context, contextId)

    const page = await context.newPage()
    await page.goto(url, {
      waitUntil: 'domcontentloaded'
    })
  }

  private getwetestCfg: EngineApis['__wetest_getwetestCfg'] = () => {
    return {
      selectorCfg: getRecordConfig().selector,
    }
  }

  private createCase: EngineApis['__wetest_createCase'] = caseInfo => {
    // 如果是登录的用例，在文件名上打个标记，方便后面重新认证的时候快速找到
    if (caseInfo.loginCase) {
      caseInfo.name = `${loginCaseFileName}/${caseInfo.name}`
    }
    this.caseManger = new CaseManger(join(this.options.rootDir, caseInfo.name))
    return this.caseManger.create(caseInfo)
  }

  private startRecord: EngineApis['__wetest_startRecord'] = ({ context, page, url }) => {
    if (!this.caseManger) {
      throw new Error('[wetest: Recorder] start record before create case!')
    }

    this.caseManger.case.viewport &&
      this.browserManager.getPage(context, page).setViewportSize(this.caseManger.case.viewport)

    this.assertor = new Assertor(
      Object.assign({}, this.caseManger.pathResolve, { snapshotTransfer: this.options.snapshotTransfer }),
    )

    if (this.caseManger.case.saveMock) {
      this.mockProxy.startMonitoring()
      this.options.proxy?.customProxy &&
        this.mockProxy.addCustomProxy(this.browserManager.getContext(context), this.options.proxy.customProxy)
    }

    this.options.beforeStartRecord?.({ page: this.browserManager.getPage(context, page), caseManager: this.caseManger })

    this.recording = true

    this.recordAction({
      action: 'newContext',
      params: {
        id: context,
      },
    })
    this.recordAction({
      action: 'newPage',
      context,
      params: {
        id: page,
        url,
      },
    })

    this.syncStatus()

    this.options.afterStartRecord?.({ page: this.browserManager.getPage(context, page), caseManager: this.caseManger })
  }

  private finishRecord: EngineApis['__wetest_finishRecord'] = async ({ context }: { context: string }) => {
    if (!this.caseManger) {
      throw new Error(`[wetest: Recorder] don't have a case but calling finish record!`)
    }

    // 如果是登录用例，需要保存认证信息
    if (this.caseManger.case.loginCase) {
      this.recordAction({
        action: 'saveStatus',
        context: '1001',
        page: '1002',
        params: {},
      })
    }

    this.recordAction({
      action: 'closeContext',
      params: {
        id: context,
      },
    })

    this.options.beforeFinishRecord?.({ caseManager: this.caseManger })

    this.recording = false
    this.caseManger.save()
    this.mockProxy.save(this.caseManger.pathResolve.mockFile)
    this.mockProxy.reset()
    this.assertor && writeJson(this.assertor?.snapshots, this.caseManger.pathResolve.snapshotFile)
    this.syncStatus()

    this.options.afterFinishRecord?.({ caseManager: this.caseManger })
  }

  private exit: EngineApis['__wetest_exit'] = async () => {
    await this.browserManager.close()
    this.emit('exit')
  }

  private syncStatus() {
    this.browserManager.broadcastPage(`window.__wetest_syncStatus(${this.recording})`)
  }
}

export { Recorder }
