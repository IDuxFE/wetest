import type { Assertion } from './assertion'
import type { Signal } from './signal'
import { SelectorInfo } from '@idux/wetest-ai-selector/types'

export type Action = Assertion | BrowserAction | ManualAction

export type ManualAction =
  | ClickAction
  | MousemoveAction
  | HoverAction
  | WaitForTimeoutAction
  | PressAction
  | InputAction
  | ScrollAction
  | SaveStatusAction

export type BrowserAction = NewContext | CloseContext | NewPage | ClosePage | ErrorAction

export type Modifier = 'Shift' | 'Control' | 'Alt' | 'Meta'

export interface BaseAction {
  action: string
  params?: Record<string, any>
  signals?: Partial<Record<Signal['name'], Omit<Signal, 'name'>>>
}

// 浏览器行为
export interface BaseBrowserAction extends BaseAction {
  action: 'newContext' | 'closeContext' | 'newPage' | 'closePage'
  context?: string
  screenShot?: string
}

export interface BaseManualAction extends BaseAction {
  action:
    | 'click'
    | 'dbClick'
    | 'hover'
    | 'waitForTimeout'
    | 'press'
    | 'input'
    | 'mousemove'
    | 'scroll'
    | 'assertion'
    | 'saveStatus'
    | 'wheel'
  context: string
  page: string
  screenShot?: string
}
export interface NewContext extends BaseBrowserAction {
  action: 'newContext'
  params: {
    id: string
  }
}

export interface CloseContext extends BaseBrowserAction {
  action: 'closeContext'
  params: {
    id: string
  }
}
export interface NewPage extends BaseBrowserAction {
  action: 'newPage'
  context: string
  screenShot?: string
  params: {
    id: string
    url: string
  }
}
export interface ClosePage extends BaseBrowserAction {
  action: 'closePage'
  context: string
  params: {
    id: string
  }
}

export interface ClickAction extends BaseManualAction {
  action: 'click' | 'dbClick'
  params: {
    selector: SelectorInfo
    modifiers: Modifier[]
    button?: 'left' | 'right' | 'middle'
    clickCount?: number
    delay?: number
    force?: boolean
    noWaitAfter?: boolean
    position?: {
      x: number
      y: number
    }
    strict?: boolean
    timeout?: number
    trial?: boolean
  }
}

export interface MousemoveAction extends BaseManualAction {
  action: 'mousemove'
  params: {
    selector?: SelectorInfo
    x: number
    y: number
  }
}

export interface HoverAction extends BaseManualAction {
  action: 'hover'
  params: {
    selector: SelectorInfo
  }
}

export interface WaitForTimeoutAction extends BaseManualAction {
  action: 'waitForTimeout'
  params: {
    time: number
  }
}
export interface PressAction extends BaseManualAction {
  action: 'press'
  params: {
    selector: SelectorInfo
    key: string
    modifiers: Modifier[]
  }
}

export interface InputAction extends BaseManualAction {
  action: 'input'
  params: {
    selector: SelectorInfo
    content: string
  }
}

export interface ScrollAction extends BaseManualAction {
  action: 'scroll'
  params: {
    selector: SelectorInfo
    x: number
    y: number
  }
}

// export interface WheelAction extends BaseManualAction {
//   action: 'wheel'
//   params: {
//   }
// }

export interface SaveStatusAction extends BaseManualAction {
  action: 'saveStatus'
}

export interface ErrorAction extends BaseAction {
  action: 'error'
  msg: string
}
