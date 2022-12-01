import { Command } from 'commander'
import record from './record'
import run from './run'
import init from './init'
import * as pkg from '../package.json'

export * from './types'

const program = new Command()

program.version(`wetest ${pkg.version}`).usage('<command> [options]')

program
  .command('record <url>')
  .description('open a browser to record cases')
  .option('-c, --config [configPath]', 'path of config file', '.wetest.js')
  .option('-o, --output [path]', 'output of cases', process.cwd())
  .option('-b, --browser [browser]', 'output of cases')
  .action((url: string, options) => {
    record(url, options)
  })

program
  .command('run <casesDir>')
  .description('run cases under <casesDir>')
  .option('-hl, --headless', 'headless mode')
  .option('-ai, --action-interval <number>', 'interval between two actions')
  .option('-c, --config [configPath]', 'path of config file', '.wetest.js')
  .option('-fb, --file-glob [fileGlob]', 'glob of file')
  .option('-r, --repeat [repeat]', 'repeatCount')
  .action((casesDir: string, options) => {
    run(casesDir, options)
  })

  program
  .command('init')
  .action(() => {
    init()
  })

program.parse(process.argv)
