import chalk from 'chalk'


export class Log {
    static runnerActionLog(action:string) {
        console.log(chalk.green(`[wetest] running action:${action}`))
    }

    static runneSelectorLog(selectors:string, index:number) {
        console.log(chalk.yellow(`[wetest] target element ${index} selector: ${selectors}`))
    }
}