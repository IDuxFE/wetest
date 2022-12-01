import { Page } from 'playwright'
import { SelectorMap, SelectorInfo } from '@wetest/ai-selector/types'


export default class PageSelector {
    private selectorInfo: SelectorInfo

    private page: Page

    constructor (selectorInfo: SelectorInfo, page: Page) {
        this.selectorInfo = selectorInfo
        this.page = page
    }

    private getSelectorIterator (selectorMap: SelectorMap) {
        let keys = Object.keys(selectorMap).sort((a, b) => Number(a) - Number(b))
        let idx = -1
        let jumpArr: string[] = []
        let jumpIdx = -1

        return {
            next () {
                let selector = selectorMap[keys[++idx]]
                return selector
            },
            jumpNext () {
                let selector = selectorMap[jumpArr[++jumpIdx]]
                return selector
            },
            saveJumpItem () {
                jumpArr.push(keys[idx])
            }
        }
    }

    private async recursionMathEl (level: number, selector: string) {
        if (this.selectorInfo.firstSelector.length > 2)  {
            return 
        }
        
        let selectorMap = this.selectorInfo.levelSelectorMap[level]
    
        if (!selectorMap) {
    
            // 这里代表
            // 整个levelSelectorMap是空的（level === 0 的时候）
            // 已经递归完所有的levelSelectorMap，level-1级（也是最后一级递归）递归命中了多个，但没有找到唯一的元素（level > 0的时候）
            //(这时候也给出去兜底，这种情况当前action的执行成功率在1/n,n是selector命中的元素个数)
            // todo：这里后续可以加上命中概率显示在client
            return 
        }
    
        let iterator = this.getSelectorIterator(selectorMap)
        let curSelector = iterator.next()
    
        // 先遍历当前selectorMap iterator，快速找到唯一目标的selector，非唯一的存入JumpItem，后续再遍历与递归，加快算法效率
        while (curSelector) {

            let unionselector = selector ? `${curSelector} >> ${selector}` : curSelector

            let curSelectorEles = await this.page.$$(curSelector)

            // 如果当前层级的选择此是nth的，不能直接作为最终唯一匹配选择器，需要向上查找（也就是最终的结果，开头的元素选择器不能是nth的）
            if (curSelector.includes('nth=') || curSelectorEles.length > 1) {
                iterator.saveJumpItem()
                curSelector = iterator.next()
                continue
            }
    
            let result = await this.page.$$(unionselector)
            
            if (!result.length) {
                curSelector = iterator.next()
                continue
            }
          
            if (result.length === 1) {
                this.selectorInfo.firstSelector.push(unionselector)
                curSelector = iterator.next()
                continue
            }
    
            if (result.length > 1) {
                iterator.saveJumpItem()
                curSelector = iterator.next()
                continue
            }
        }
    
        // 这里开始处理selector匹配多个元素的情况
        curSelector = iterator.jumpNext()
    
        while (curSelector) {
            let unionselector = selector ? `${curSelector} >> ${selector}` : curSelector
    
            
            await this.recursionMathEl(level + 1, unionselector)
    
            curSelector = iterator.jumpNext()
        }
    }

    public async generateFirstSelector () {
        await this.recursionMathEl(0, '')
    }

    public getFirstSelector () {
       return this.selectorInfo.firstSelector
    }
}