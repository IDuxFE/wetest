import { Page, BrowserContext, ElementHandle } from 'playwright'
import { SelectorCfg } from '@wetest/ai-selector'
import { CaseManger } from '../caseManager'
import { MockProxy } from '../mockProxy'

export type BrowserName = 'chromium' | 'firefox' | 'webkit'

// 计算元素的选择器
export type SelectorTransfer = (target: ElementHandle) => string

// 处理快照字符串
export type SnapshotTransfer = (snap: string) => string

export type CustomProxy = (mockProxy: MockProxy) => Parameters<BrowserContext['route']>[]

export interface CommonConfig {
  /**
   * 处理快照字符串
   *
   * @type {SnapshotTransfer}
   * @memberof RunnerConfig
   */
  snapshotTransfer?: SnapshotTransfer

  //  代理配置
  proxy?: {
    /**
     * 剔除指定参数
     * 例如时间戳等每次请求都不一样的参数
     *
     */
    omitParams?: RegExp | ((key: string, value: string) => boolean)

    /**
     * 自定义代理，可以做一些特殊的拦截
     */
    customProxy?: CustomProxy
  }
}

export type RecorderConfig = CommonConfig & {
  /**
   * 用例输出的根目录
   *
   * @type {string}
   * @memberof RecorderConfig
   */
  rootDir: string

  /**
   * 登录身份状态保存path
   *
   * @type {string}
   * @memberof RecorderConfig
   */
  stateDir: string

  browser: {
    /**
     * 使用的浏览器
     *
     * @type {BrowserName}
     */
    type: BrowserName
  }

  /**
   * 计算元素的选择器，可根据业务情况自行实现，
   * 内部默认使用css-selector-generator：https://github.com/fczbkk/css-selector-generator
   *
   * @type {SelectorTransfer}
   * @memberof RunnerConfig
   */
  // selectorTransfer?: SelectorTransfer

  /**
   * 创建单条用例后，开始录制之前
   *
   * @param {{ page: Page; caseManager: CaseManger }} args
   * @memberof RecorderConfig
   */
  beforeStartRecord?: (args: { page: Page; caseManager: CaseManger }) => void

  /**
   * 用例开始录制后，此时action列表中已有newContext和newPage两个action
   *
   * @param {{ page: Page; caseManager: CaseManger }} args
   * @memberof RecorderConfig
   */
  afterStartRecord?: (args: { page: Page; caseManager: CaseManger }) => void

  /**
   * 结束单条用例录制之前，此时除了截图，其他的用例信息还未写入本地文件
   *
   * @param {{ caseManager: CaseManger }} args
   * @memberof RecorderConfig
   */
  beforeFinishRecord?: (args: { caseManager: CaseManger }) => void

  /**
   * 结束单条用例录制之后，此时所有用例信息已存储到本地文件
   *
   * @param {{ caseManager: CaseManger }} args
   * @memberof RecorderConfig
   */
  afterFinishRecord?: (args: { caseManager: CaseManger }) => void

  selector: SelectorCfg
}

interface Cookies {
  name: string;

  value: string;

  /**
   * either url or domain / path are required. Optional.
   */
  url?: string;

  /**
   * either url or domain / path are required Optional.
   */
  domain?: string;

  /**
   * either url or domain / path are required Optional.
   */
  path?: string;

  /**
   * Unix time in seconds. Optional.
   */
  expires?: number;

  /**
   * Optional.
   */
  httpOnly?: boolean;

  /**
   * Optional.
   */
  secure?: boolean;

  /**
   * Optional.
   */
  sameSite?: "Strict"|"Lax"|"None";
}

export type RunnerConfig = CommonConfig & {
  /**
   * 错误输出目录
   *
   * @type {string}
   */
  errorsDir: string

  /**
  * 身份状态存储文件
  *
  * @type {string}
  */
  stateDir: string

   /**
  * 浏览器信息自定义，无头浏览器需要自定义，否则可能被业务拦截
  *
  * @type {object}
  */
  userAgent: {
    chromium?: string
    firefox?: string
    webkit?: string
  }

  /**
  * 回放时往系统中添加自定义 cookies
  *
  * @type {string}
  */
  cookies: Cookies[]

  /**
  * 系统登录页地址
  *
  * @type {string}
  */
  loginUrl: string

  /**
  * 将系统中一些加载内容给拦截掉
  *
  * @type {string}
  */
  abortUrl?: string | RegExp | ((url: URL) => boolean)

  /**
   * trace数据存放目录
   *
   * @type {string}
   */
  traceDir: string

  /**
   * 回归时，使用的环境
   * 例如录制时的url为https://baidu.com/index
   * env设置为http://localhost:8080
   * 那么回归时会自动将https://baidu.com替换成http://localhost:8080
   *
   * @type {string}
   * @memberof RunnerConfig
   */
  origin?: string

  /**
   * 断言失败时，重试的次数
   *
   * @type {number}
   * @memberof RunnerConfig
   */
  retries?: number

  // 浏览器配置
  browser: {
    /**
     * 浏览器类型
     *
     * @type {BrowserName}
     */
    type: BrowserName

    /**
     * 是否使用无头浏览器
     *
     * @type {boolean}
     */
    headless: boolean
  }

  /**
   * 执行action的时间间隔（ms）
   *
   * @type {number}
   * @memberof RunnerConfig
   */
  actionInterval?: number

  /**
   * 测试报告配置
   *
   * @type {number}
   * @memberof RunnerConfig
   */
  reporter: {

    // 测试报告是否总是输出追踪栈，默认只是错误的用例输出
    alwaysShowTracing: boolean,

    // 测试报告的追踪栈是否包含图片（图片帧）
    tracingScreenshots: boolean
  }

  /**
   * 单条用例执行之前
   *
   * @param {{caseManager: CaseManger}} args
   * @memberof RunnerConfig
   */
  beforeRunCase?: (args: { caseManager: CaseManger }) => void

  /**
   * 单条用例执行后
   * TODO: 补全result功能
   *
   * @param {{ caseManager: CaseManger; result: any }} args
   * @memberof RunnerConfig
   */
  afterRunCase?: (args: { caseManager: CaseManger; result: any }) => void
}
