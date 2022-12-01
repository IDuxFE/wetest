import glob from 'fast-glob'
import { join, resolve } from 'path'
import { Runner } from '@wetest/engine'
import chalk from 'chalk'
import { Config } from './config'
import { TestCollectInfo } from './types'
import { appendFileSync, writeFileSync, cpSync } from 'fs'
import { createDir, setRunnerConfig, setEngineState, loginCaseFileName } from '@wetest/share'

interface RunCliOptions {
  headless?: boolean
  actionInterval?: string
  config: string
  fileGlob: string
  repeat: number
}

const ErrorDirName = '__errors__'
const stateName = 'state.json'
const reportDirName = '__reporter__'

export default async function run(casesDir: string, options: RunCliOptions) {
  casesDir = resolve(process.cwd(), casesDir)
  const reportWebDir = join(__dirname, '..', 'dist', 'report-web')
  const destReportWebDir = join(casesDir, reportDirName)
  const config = new Config(
    {
      runner: {
        errorsDir: join(casesDir, ErrorDirName),
        stateDir: join(casesDir, stateName),
        traceDir: join(destReportWebDir, 'traceData'),
        actionInterval: options.actionInterval ? Number(options.actionInterval) : undefined,
        browser: {
          headless: !!options.headless,
        }
      },
    },
    options.config,
  )
  setEngineState('running')
  setRunnerConfig(config.runnerConfig)
  const runner = new Runner(config.runnerConfig)
  const errorList: Error[] = []
  const globPath = options.fileGlob ? `${options.fileGlob}/**/case.json` : '**/case.json'
  let loginFileName = ''
  let repeat = Number(options.repeat) || 1

  const testCollectInfo: TestCollectInfo = {
    startTime: Date.now(),
    all: 0,
    pass: 0,
    fail: 0,
    testInfos: []
  }

  runner.on('testEnd', data => {
    testCollectInfo.testInfos.push(data)

    if (data.status === 'fail') {
      testCollectInfo.fail++
    } else {
      testCollectInfo.pass++
    }
    testCollectInfo.all++
  })

  const fileList = glob.sync(globPath, { cwd: casesDir }).map(file => join(file, '..')).sort((a, b) => {

    if (a.includes(loginCaseFileName)) {
      return -1
    }

    let aDir = a.match(/.+\\/)
    let bDir = b.match(/.+\\/)

    if (aDir && bDir && aDir[0] === bDir[0]) {
      return Number(a.match(/\d+/)) - Number(b.match(/\d+/))
    }

    return 0
  })

  if (fileList[0] && fileList[0].includes(loginCaseFileName)) {
    loginFileName = fileList[0]
  }
  const fileIter = fileList[Symbol.iterator]()

  const runCase = async (caseDir: string, fileName: string) => {
    try {
      await runner.runCase(join(casesDir, fileName), fileName)
    } catch (error) {
      console.log(error)
      console.log(chalk.red(`case ${fileName} run fail`))
      errorList.push(error as Error)

      throw (error)
    }
  }

  const buildReport = () => {
    testCollectInfo.endTime = Date.now()

    const reportWebHtml = join(destReportWebDir, 'index.html')
    const reportJSON = join(destReportWebDir, 'report.json')

    createDir(destReportWebDir)

    cpSync(reportWebDir, destReportWebDir, { recursive: true, force: true })

    appendFileSync(reportWebHtml, `<script>\nwindow.wetestReportJson = ${JSON.stringify(testCollectInfo)};</script>`, 'utf-8')
    writeFileSync(reportJSON, JSON.stringify(testCollectInfo))

    if (testCollectInfo.fail) {
      const traceViewResourceDir = join(require.resolve('playwright-core'), '..', 'lib', 'webpack', 'traceViewer')
      cpSync(traceViewResourceDir, join(destReportWebDir, 'traceViewer'), { recursive: true, force: true })
    }
  }

  const finish = async () => {
    await runner.finish()
    buildReport()
    console.log(chalk.blue('finish running cases!'))
    console.log(chalk.green(`pass: ${testCollectInfo.pass}`))
    console.log(chalk.red(`fail: ${testCollectInfo.fail}`))

    // 这里不能使用 process.exit(1)，退出进程太慢了
    process.exit(0)
  }

  while (repeat) {

    let curIndex = 1
    let curCase = fileIter.next()
    while (!curCase.done) {
      try {
        console.log(chalk.yellow(`progress：${curIndex} / ${fileList.length}：${curCase.value}`))
        await runCase(join(casesDir, curCase.value), curCase.value)
      } catch (error) {

        // 用户登录状态失效
        if (error instanceof Error && error.message === '[user-state-error]') {
          console.log(chalk.yellow('retry login...'))
          await runCase(join(casesDir, loginFileName), loginFileName)
          continue
        }

        // 登录用例失败就直接退出吧
        if (error instanceof Error && error.message === '[login-error]') {
          await finish()
        }
      }
      curIndex++
      curCase = fileIter.next()
    }

    repeat--
  }

  await finish()
}
