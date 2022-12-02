import { RecorderConfig, RunnerConfig } from '@idux/wetest-engine'
import { TestInfo } from '@idux/wetest-engine/types/testInfo'
import { O } from 'ts-toolbelt'

export interface ReporterConfig {
  /**
   * 报告输出目录
   *
   * @type {string}
   * @memberof Reporter
   */
  output: string
}

export interface AllConfig {
  recorder: RecorderConfig
  runner: RunnerConfig
  reporter: ReporterConfig
}

// 用例集执行信息接口
export interface TestCollectInfo {
  startTime: number
  endTime?: number
  pass: number
  fail: number
  all: number
  testInfos: TestInfo[]
}

export type GlobalConfig = O.Partial<AllConfig, 'deep'>
