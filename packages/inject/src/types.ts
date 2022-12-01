import { SelectorInfo as DomSelectorInfo } from '@wetest/ai-selector'
import { SelectorCfg } from '@wetest/ai-selector'

export interface ToolsStatus {
  recording: boolean
  hovering: boolean
  asserting: {
    elementScreenshot: boolean
    elementSnapshot: boolean
    elementVisible: boolean
    elementValue: boolean
    elementIsChecked: boolean
  }
}

export interface ToolInfo {
  icon?: string
  text?: string
  active: boolean
  disabled: boolean
  hotKey?: string;
  handler?: ((event?: MouseEvent) => void | Promise<void>) | (() => void | Promise<void>)
  children?: ToolInfo[]
}

export interface SelectorInfo {
  show?: boolean
  x?: number
  y?: number

  // todo： 这里注意下  value不应该是string的
  value?: DomSelectorInfo
  onConfirm?: Function
  onCancel?: Function
  to?: HTMLElement | false
}


export interface wetestCfg {
  selectorCfg: SelectorCfg
}

