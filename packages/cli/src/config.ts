// import { merge } from 'lodash-es'  lodash-es在ts+-node下报错，调试的时候换成这个吧
import { merge } from 'lodash'
import { GlobalConfig } from './types'
import { cosmiconfigSync } from 'cosmiconfig'
import typeScriptLoader from 'cosmiconfig-ts-loader'

export class Config {
  config: GlobalConfig = {}

  private cliConfig: GlobalConfig = {}

  private explorer!: ReturnType<typeof cosmiconfigSync>

  constructor(cliConfig: GlobalConfig, configPath?: string) {
    this.cliConfig = cliConfig
    this.explorer = cosmiconfigSync('wetest', {
      loaders: {
        '.ts': typeScriptLoader(),
      },
    })
    configPath && this.loadConfigFile(configPath)
  }

  get recorderConfig() {
    return merge({}, this.config.recorder, this.cliConfig.recorder)
  }

  get runnerConfig() {
    return merge({}, this.config.runner, this.cliConfig.runner)
  }

  get reporterConfig() {
    return this.config.reporter ?? {}
  }

  async loadConfigFile(configPath: string) {
    this.config = this.explorer.load(configPath)?.config
  }
}
