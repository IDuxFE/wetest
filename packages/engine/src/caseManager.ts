import { existsSync, readFileSync } from 'fs'
import { last, merge } from 'lodash'
import { join } from 'path'
import { Case, Action, Signal } from './types'
import { createDir, readJson, writeJson } from './utils/fs'

function getInitialCase(): Case {
  return {
    name: '',
    origin: '',
    saveMock: true,
    loginCase: false,
    skip: false,
    actions: [],
  }
}

/**
 * 读取快照信息
 *
 * @param {string} snapshotPath
 * @returns {Record<string, string>}
 */
function readSnapshots(snapshotPath: string): Record<string, string> {
  const data = Object.create(null)
  let snapshotContents = ''

  if (existsSync(snapshotPath)) {
    snapshotContents = readFileSync(snapshotPath, 'utf8')
    const populate = new Function('exports', snapshotContents)
    populate(data)
  }

  return data
}

export class CaseManger {
  caseDir: string = ''

  case: Case = getInitialCase()
  snapshots: Record<string, string> = {}

  constructor(caseDir: string) {
    this.caseDir = caseDir
  }

  get pathResolve() {
    return {
      caseDir: this.caseDir,
      screenshotsDir: join(this.caseDir, 'screenshots'),
      mockFile: join(this.caseDir, 'mock.json'),
      snapshotFile: join(this.caseDir, 'snapshots.json'),
      caseFile: join(this.caseDir, 'case.json'),
    }
  }

  /**
   * 创建新的用例
   *
   * @param {{ saveMock: boolean }} caseInfo
   * @returns {('success' | 'exist' | 'fail')}
   * @memberof CaseManger
   */
  create(caseInfo: { saveMock: boolean }): 'success' | 'exist' | 'fail' {
    if (existsSync(this.caseDir)) {
      return 'exist'
    }

    try {
      createDir(this.caseDir)
    } catch (error) {
      console.error(error)
      return 'fail'
    }

    merge(this.case, caseInfo)

    return 'success'
  }

  /**
   * 加载已有的用例信息
   *
   * @memberof CaseManger
   */
  load() {
    this.case = readJson<Case>(join(this.caseDir, 'case.json'))
    this.snapshots = readSnapshots(join(this.caseDir, 'snapshots.snap'))
  }

  /**
   * 保存用例
   *
   * @memberof CaseManger
   */
  save() {
    writeJson(this.case, this.pathResolve.caseFile)
  }

  /**
   * 记录action
   *
   * @param {Action} action
   * @memberof CaseManger
   */
  recordAction(action: Action) {
    this.case.actions.push(action)
  }

  setSignal(signal: Signal) {
    const { name, ...params } = signal
    const lastAction = last(this.case.actions)

    if (!lastAction) return

    if (!lastAction.signals) {
      lastAction.signals = {}
    }
    lastAction.signals[name] = params
  }

  reset() {
    this.case = getInitialCase()
    this.snapshots = {}
  }
}
