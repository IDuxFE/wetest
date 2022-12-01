import { BrowserName, Recorder } from '@wetest/engine'
import { Config } from './config'
import { resolve } from 'path'
import { setRecordConfig } from '@wetest/share'

interface RecordCliOptions {
  output?: string
  browser?: BrowserName
  config?: string
}

export default async function record(url: string, options: RecordCliOptions) {
  const config = new Config(
    {
      recorder: {
        optimization: true,
        rootDir: resolve(process.cwd(), options.output || ''),
        browser: {
          type: options.browser,
        },
      },
    },
    options.config,
  )
  setRecordConfig(config.recorderConfig)
  const recorder = new Recorder(config.recorderConfig)

  recorder.start({
    url,
  })
  recorder.on('exit', () => {
    // 这里不能使用 process.exit(1)，退出进程太慢了
    process.exitCode = 0
  })
}
