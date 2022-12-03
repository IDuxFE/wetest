import { getDefaultSelectorCfg } from './utils/util'
import { SelectorInfo, SelectorMap, LevelSelectorMap, SelectorCfg } from './types'
import { ATTR_ARRAY, ATTR_MAP } from './const'
import { Selector } from './utils/selector/selector'
import { merge } from 'lodash'

export * from './types'

interface Options {
  selectorInfo?: SelectorInfo
  selectorCfg: SelectorCfg
}

interface RecursionOptions {
  maxLevel: number
  el: Element
}

export default class DomSelector {
  private curLevelKey: number

  private level: number

  private selector: Selector

  private maxKeyNum: number

  private recursionMaxLevel: number

  private selectorInfo: SelectorInfo

  private targetDirectSelectorMap = {}

  private selectorCfg: SelectorCfg = getDefaultSelectorCfg()

  constructor(options: Options) {
    this.curLevelKey = 0
    this.level = 0
    // this.maxLevel = 5
    this.maxKeyNum = 10

    this.recursionMaxLevel = 6

    this.selector = new Selector()

    merge(this.selectorCfg, options.selectorCfg)

    this.selectorInfo = options?.selectorInfo
      ? options.selectorInfo
      : {
          levelSelectorMap: {},
          firstSelector: [],
        }
  }

  private getSelectorIterator(selectorMap: SelectorMap) {
    let keys = Object.keys(selectorMap).sort((a, b) => Number(a) - Number(b))
    let idx = -1
    let jumpArr: string[] = []
    let jumpIdx = -1

    return {
      next() {
        let selector = selectorMap[keys[++idx]]
        return selector
      },
      jumpNext() {
        let selector = selectorMap[jumpArr[++jumpIdx]]
        return selector
      },
      saveJumpItem() {
        jumpArr.push(keys[idx])
      },
    }
  }

  private getSelectorMatch(selector: string, root: Node, el: Element) {
    let eleArr: Element[] = []

    try {
      eleArr = this.selector.$$(selector, root)
    } catch {
      return null
    }

    // todo： 这里需要把子元素考虑进去，有些点击其实是可以到子元素的，限制住 === e会去掉一部分选择器了
    return eleArr.some(element => element === el) ? eleArr.length : 2
  }

  public async getActualSelector() {
    return this.selectorInfo.firstSelector[0]
  }

  private checkSelectorHealthy(targetDirectSelector) {
    // 判断选择器是否健康，防止因为因为第一层的选择器太强大导致firstselector都包含同一个第一层选择器
    if (this.targetDirectSelectorMap[targetDirectSelector] && this.targetDirectSelectorMap[targetDirectSelector] > 1) {
      return false
    }

    return true
  }

  // todo：这里后续版本可以加上选择器训练优化算法（回放执行action的过程中干掉已经无效的选择器，根据最新的应用dom生成）
  private recursionMathEl(
    levelSelectorMap: LevelSelectorMap,
    level: number,
    selector: string,
    options: RecursionOptions,
    targetDirectSelector: string,
  ) {
    if (this.selectorInfo.firstSelector.length > 2 || level > options.maxLevel) {
      return
    }

    if (!this.checkSelectorHealthy(targetDirectSelector)) {
      return
    }

    let selectorMap = levelSelectorMap[level]

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
      curSelector = `${curSelector} >> visible = true`
      let unionselector = selector ? `${curSelector} >> ${selector}` : curSelector

      let curSelectorEles: Element[] = []
      try {
        curSelectorEles = this.selector.$$(curSelector, document)
      } catch {
        curSelectorEles = []
      }

      // 如果当前层级的选择此是nth的，不能直接作为最终唯一匹配选择器，需要向上查找（也就是最终的结果，开头的元素选择器不能是nth的）
      if (curSelector.includes('nth=') || curSelectorEles.length > 1) {
        iterator.saveJumpItem()
        curSelector = iterator.next()
        continue
      }

      let result = this.getSelectorMatch(unionselector, document, options.el)

      if (!result) {
        curSelector = iterator.next()
        continue
      }

      if (result === 1) {
        // let headMatchResult = this.getSelectorMatch(unionselector.split(/\s*>>\s*nth/)[0], document)

        // if (headMatchResult && headMatchResult > 1) {
        //     iterator.saveJumpItem()
        //     curSelector = iterator.next()
        //     continue
        // }

        // success找到
        // return unionselector
        this.selectorInfo.firstSelector.push(unionselector)

        // 收集元素第一层选择器，防止firstselector中的选择器在目标元素层都是一样的
        if (this.targetDirectSelectorMap[targetDirectSelector]) {
          this.targetDirectSelectorMap[targetDirectSelector]++
        } else {
          this.targetDirectSelectorMap[targetDirectSelector] = 1
        }

        curSelector = iterator.next()
        continue
      }

      if (result > 1) {
        iterator.saveJumpItem()
        curSelector = iterator.next()
        continue
      }
    }

    // 这里开始处理selector匹配多个元素的情况
    curSelector = iterator.jumpNext()

    while (curSelector) {
      curSelector = `${curSelector} >> visible = true`
      let unionselector = selector ? `${curSelector} >> ${selector}` : curSelector

      if (level === 0) {
        targetDirectSelector = curSelector
      }

      this.recursionMathEl(levelSelectorMap, level + 1, unionselector, options, targetDirectSelector)

      curSelector = iterator.jumpNext()
    }
  }

  public getCurrentLevelMap() {
    return this.selectorInfo.levelSelectorMap[this.level]
  }

  public getSelectorInfo() {
    return this.selectorInfo
  }

  private setCurrentLevelMap(map: SelectorMap) {
    return (this.selectorInfo.levelSelectorMap[this.level] = map)
  }

  // private setFirstSelector (selector: string, overWrite = false) {
  //     if (!this.selectorInfo.firstSelector || overWrite) {
  //         this.selectorInfo.firstSelector = selector
  //     }
  // }

  public getElementText(el: Element) {
    return el.textContent
      ?.split('\n')
      .map(text => text.trim())
      .filter(text => !!text)
  }

  private beforeGoNextLevel() {
    this.level++
    this.curLevelKey = 0
  }

  private beforeCurRecursion() {
    if (!this.getCurrentLevelMap()) {
      this.setCurrentLevelMap({})
    }
  }

  private afterAction(el: Element) {
    // 生成默认元素选择器（这里后续可以增加优化检测，加大默认选择器的命中率）
    // let elSelectorMap = this.selectorInfo.levelSelectorMap[0]

    // if (elSelectorMap) {
    //     this.setFirstSelector(elSelectorMap[Object.keys(elSelectorMap)[0]])
    // }

    this.recursionMathEl(
      this.selectorInfo.levelSelectorMap,
      0,
      '',
      {
        maxLevel: this.recursionMaxLevel,
        el: el,
      },
      '',
    )
  }

  private generateLevelMap(val: string | string[], options = { isNextLevel: false }) {
    let curLevelMap = this.getCurrentLevelMap()

    if (options.isNextLevel) {
      this.curLevelKey = this.curLevelKey - (this.curLevelKey % 10) + 10
    }

    if (Array.isArray(val)) {
      val.forEach(v => {
        this.generateLevelMap(v)
      })

      return
    }

    if (curLevelMap[this.curLevelKey]) {
      this.curLevelKey += 1
    }

    curLevelMap[this.curLevelKey] = val
  }

  private combineWithNth(selector: string, el: Element) {
    if (!el.parentElement) {
      return selector
    }

    let elements: Element[] = []
    try {
      elements = this.selector.$$(selector, el.parentElement)
    } catch {
      elements = []
    }

    if (elements && elements.length > 1) {
      for (let i = 0; i < elements.length; i++) {
        if (elements[i] === el || elements[i].parentElement === el) {
          return `${selector} >> nth=${i}`
        }
      }
    }

    return selector
  }

  private processElementText(el: Element) {
    return this.combineWithNth(`text="${el.textContent}"`, el)
  }

  private processElementID(el: Element) {
    return this.combineWithNth(`id=${el.id}`, el)
  }

  private processElementAttr(el: Element) {
    let attributeArr = ATTR_ARRAY.filter(attr => {
      const val = el.getAttribute(attr)
      return val && !this.selectorCfg.excludeAttr.test(val)
    }).sort((a, b) => ATTR_MAP[b] - ATTR_MAP[a])

    // 根据权重取10个（一般不会走到这，不太可能一个元素有超过10个属性，写上以防万一）
    if (attributeArr.length > this.maxKeyNum) {
      attributeArr.splice(this.maxKeyNum - 1)
    }

    return attributeArr.map(attr => {
      let selector = `${el.tagName.toLocaleLowerCase()}[${attr}="${el.getAttribute(attr)}"]`

      return this.combineWithNth(selector, el)
    })
  }

  // 这里还是要优化一下，不能一味class全部拼接，会降低可用性，每个class都应该是作为当前元素的一个selector
  private processElementClass(el: Element) {
    let classArr = el.classList
      .toString()
      .trim()
      .split(/\s+/)
      .filter(cla => !this.selectorCfg.excludeClass.includes(cla) && !this.selectorCfg.excludeClassModify.test(cla))
    let selector = `.${classArr.join('.')}`

    return this.combineWithNth(selector, el)
  }

  private processElementTag(el: Element) {
    let selector = el.tagName.toLocaleLowerCase()

    return this.combineWithNth(selector, el)
  }

  private processBuryingPoint(el: Element) {
    const attr = this.selectorCfg.buryingPoint
    return `${el.tagName.toLocaleLowerCase()}[${attr}="${el.getAttribute(attr)}"]`
  }

  private isAccessId(v) {
    return !this.selectorCfg.excludeIdByVal.test(v)
  }

  public generateSelectMap(el: Element | null, options = { includeTextSelector: true }) {
    if (el && el.tagName.toLocaleLowerCase() !== 'html') {
      this.beforeCurRecursion()

      // 配置的埋点属性，就以生成的埋点属性为先
      if (this.selectorCfg.buryingPoint) {
        this.generateLevelMap(this.processBuryingPoint(el))
      }

      // ID
      if (el.id && this.isAccessId(el.id)) {
        this.generateLevelMap(this.processElementID(el))
      }

      // 文本
      if (options?.includeTextSelector && el.textContent?.trim()) {
        this.generateLevelMap(this.processElementText(el))
      }

      // 摘选的元素属性（需要包含tagetname）
      if (el.attributes.length) {
        this.generateLevelMap(this.processElementAttr(el), { isNextLevel: true })
      }

      // class
      if (el.classList.toString()) {
        this.generateLevelMap(this.processElementClass(el), { isNextLevel: true })
      }

      // tag (真的啥都没有的话，只能匹配tag)
      this.generateLevelMap(this.processElementTag(el), { isNextLevel: true })

      this.beforeGoNextLevel()
      this.generateSelectMap(el.parentElement, { includeTextSelector: false })
    }
  }

  public getDomSelectorInfo(el: Element, options = { includeTextSelector: true }) {
    this.generateSelectMap(el, options)
    this.afterAction(el)

    return this
  }
}
