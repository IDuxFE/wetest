import { join } from 'path'
import { copyFileSync } from 'fs'

export default function init () {
    try {
        copyFileSync(join(__dirname, '..', 'dist', '.wetest.js'), join(process.cwd(), '.wetest.js'))
        console.log('初始化成功！生成wetest基础配置项。查看.wetest.js')
    } catch(error) {
        console.log(error)
    }
   
}
