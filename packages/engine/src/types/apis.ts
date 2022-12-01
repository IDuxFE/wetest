import { Action, Case } from '.'
import { wetestCfg } from '@wetest/inject'

/**
 * engine提供给inject使用的api
 *
 * @export
 * @interface EngineApis
 */
export interface EngineApis {
  __wetest_contextId: string
  __wetest_pageId: string
  __wetest_cfg: wetestCfg

 /**
   * 初始化web wetest配置
   *
   * @memberof EngineApis
   */
  __wetest_getwetestCfg(): wetestCfg 

  /**
   * 判断是否录制中
   *
   * @returns {*}  {boolean}
   * @memberof EngineApis
   */
  __wetest_isRecording(): boolean

  /**
   * 记录action
   *
   * @param {Action} action
   * @memberof EngineApis
   */
  __wetest_recordAction(action: Action): void

  /**
   * 创建用例
   *
   * @param {(Pick<Case, 'name' | 'saveMock'>)} caseInfo
   * @returns {*}  {('success' | 'exist' | 'fail')}
   * @memberof EngineApis
   */
  __wetest_createCase(caseInfo: Pick<Case, 'name' | 'origin' | 'saveMock' | 'loginCase' |'viewport'>): 'success' | 'exist' | 'fail'

  /**
   * 退出录制
   *
   * @memberof EngineApis
   */
  __wetest_exit(): void

  /**
   * 开始录制
   *
   * @param {{ context: string; page: string; url: string }} params
   * @memberof EngineApis
   */
  __wetest_startRecord(params: { context: string; page: string; url: string }): void

  /**
   * 停止录制
   *
   * @param {{ context: string }} params
   * @memberof EngineApis
   */
  __wetest_finishRecord(params: { context: string }): void

  /**
   * 计算元素的选择器
   *
   * @memberof EngineApis
   */
  __wetest_selectorTransfer?: (target: HTMLElement) => string
}

/**
 * engine调用inject的api，需要inject实现
 *
 * @export
 * @interface InjectApis
 */
export interface InjectApis {
  /**
   * 同步状态
   *
   * @param {boolean} isRecording
   * @memberof InjectApis
   */
  __wetest_syncStatus(isRecording: boolean): void

  /**
   * 显隐toolbar
   *
   * @param {boolean} visible
   * @memberof InjectApis
   */
  __wetest_toggleShowToolbar(visible: boolean): void

  /**
   * 展示消息
   *
   * @param {({
   *     type: 'error' | 'success' | 'info'
   *     title?: string
   *     content: string
   *     during?: number
   *   })} params
   * @memberof InjectApis
   */
  __wetest_notice(params: { type: 'error' | 'success' | 'info'; title?: string; content: string; during?: number }): void
}
