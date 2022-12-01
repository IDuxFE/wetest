import { BaseManualAction } from './action'
import { SelectorInfo } from '@wetest/ai-selector/types'

export type Assertion = UrlAssertion | SnapshotAssertion | ScreenshotAssertion | VisibleAssertion | ValueAssertion | isCheckedAssertion

export interface BaseAssertion extends BaseManualAction {
  action: 'assertion'
  context: string
  page: string
  params: {
    type: string
  }
}

export interface UrlAssertion extends BaseAssertion {
  params: {
    type: 'url'
    url: string
  }
}

export interface VisibleAssertion extends BaseAssertion {
  params: {
    type: 'visible'
    selector: SelectorInfo
  }
}

export interface SnapshotAssertion extends BaseAssertion {
  params: {
    type: 'snapshot'
    selector: SelectorInfo
    name: string
  }
}

export interface ValueAssertion extends BaseAssertion {
  params: {
    type: 'value'
    selector: SelectorInfo
    value: string
  }
}
export interface isCheckedAssertion extends BaseAssertion {
  params: {
    type: 'isChecked'
    selector: SelectorInfo
    checked: boolean
  }
}


export interface ScreenshotAssertion extends BaseAssertion {
  params: {
    type: 'screenshot'
    name: string
    selector?: SelectorInfo
    area?: {
      x: number
      y: number
      height: number
      width: number
    }
  }
}
