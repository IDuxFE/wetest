// 选择器
export interface SelectorInfo {
  levelSelectorMap: LevelSelectorMap
  firstSelector: string[]
}

// 各级元素选择器Map
export interface LevelSelectorMap {
    [propName: number]: SelectorMap
}

// 元素选择器Map
export interface SelectorMap {
  [propName: number]: string
  length?: number
}

export interface SelectorCfg {
  buryingPoint: string
  excludeClass: string[]
  excludeClassModify: RegExp
  excludeAttr: RegExp,
  excludeIdByVal: RegExp
}