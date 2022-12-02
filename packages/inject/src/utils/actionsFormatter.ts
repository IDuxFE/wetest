import { getModifiersByEvent, getScrollOffset, getSelector } from './dom'
import {
  ClickAction,
  HoverAction,
  WaitForTimeoutAction,
  InputAction,
  PressAction,
  ScreenshotAssertion,
  ScrollAction,
  SnapshotAssertion,
  UrlAssertion,
  VisibleAssertion,
  ValueAssertion,
  isCheckedAssertion,
} from '@idux/wetest-engine'
import dayjs from 'dayjs'
import { SelectorInfo } from '@idux/wetest-ai-selector'

export function getHoverAction(event: MouseEvent): HoverAction | null {
  if (!event.target) return null
  return {
    action: 'hover',
    context: window.__wetest_contextId,
    page: window.__wetest_pageId,
    params: {
      selector: getSelector(event.target),
    },
  }
}

export function getWaitForTimeout(params: WaitForTimeoutAction['params']): WaitForTimeoutAction {
  return {
    action: 'waitForTimeout',
    context: window.__wetest_contextId,
    page: window.__wetest_pageId,
    params,
  }
}

export function getClickAction(event: MouseEvent): ClickAction | null {
  if (!event.target || !canClick(event)) return null
  return {
    action: 'click',
    context: window.__wetest_contextId,
    page: window.__wetest_pageId,
    params: {
      selector: getSelector(event.target),
      modifiers: getModifiersByEvent(event),
    },
  }
}

export function getInputAction(event: InputEvent): InputAction | null {
  if (!event.target) return null
  return {
    action: 'input',
    context: window.__wetest_contextId,
    page: window.__wetest_pageId,
    params: {
      selector: getSelector(event.target),
      content: (event.target as HTMLInputElement).value,
    },
  }
}

// TODO:keyboard这里会比较复杂，需要处理奇奇怪怪的按键，后续优化
export function getPressAction(event: KeyboardEvent): PressAction | null {
  if (!canPress(event) || !event.target) return null

  return {
    action: 'press',
    context: window.__wetest_contextId,
    page: window.__wetest_pageId,
    params: {
      selector: getSelector(event.target),
      key: event.key,
      modifiers: getModifiersByEvent(event),
    },
  }
}

export function getValueAssertion(event: MouseEvent): ValueAssertion | null {
  if (!event.target || (event.target as HTMLInputElement).value === undefined) return null
  return {
    action: 'assertion',
    context: window.__wetest_contextId,
    page: window.__wetest_pageId,
    params: {
      type: 'value',
      selector: getSelector(event.target),
      value: (event.target as HTMLInputElement).value,
    },
  }
}
export function getIsCheckedAssertion(event: MouseEvent): isCheckedAssertion | null {
  if (
    event.target &&
    ((event.target as HTMLInputElement).type === 'checkbox' || (event.target as HTMLInputElement).type === 'radio')
  ) {
    return {
      action: 'assertion',
      context: window.__wetest_contextId,
      page: window.__wetest_pageId,
      params: {
        type: 'isChecked',
        selector: getSelector(event.target),
        checked: (event.target as HTMLInputElement).checked,
      },
    }
  }
  return null
}

export function getScrollAction(event: MouseEvent): ScrollAction | null {
  if (!event.target) return null
  return {
    action: 'scroll',
    context: window.__wetest_contextId,
    page: window.__wetest_pageId,
    params: {
      selector: getSelector(event.target),
      ...getScrollOffset(event.target),
    },
  }
}

export function getScreenshotAssertion(event?: MouseEvent): ScreenshotAssertion {
  if (!event?.target) {
    return {
      action: 'assertion',
      context: window.__wetest_contextId,
      page: window.__wetest_pageId,
      params: {
        type: 'screenshot',
        name: `full_screenshot_${dayjs().valueOf()}.png`,
      },
    }
  }

  return {
    action: 'assertion',
    context: window.__wetest_contextId,
    page: window.__wetest_pageId,
    params: {
      selector: getSelector(event.target),
      type: 'screenshot',
      name: `element_screenshot_${dayjs().valueOf()}.png`,
    },
  }
}

export function getSnapshotAssertion(event: MouseEvent): SnapshotAssertion | null {
  if (!event.target) return null
  return {
    action: 'assertion',
    context: window.__wetest_contextId,
    page: window.__wetest_pageId,
    params: {
      type: 'snapshot',
      selector: getSelector(event.target),
      name: `element_snapshot_${dayjs().valueOf()}`,
    },
  }
}

export function getUrlAssertion(): UrlAssertion {
  return {
    action: 'assertion',
    context: window.__wetest_contextId,
    page: window.__wetest_pageId,
    params: {
      type: 'url',
      url: location.href,
    },
  }
}

export function getVisibleAssertion(selector: SelectorInfo): VisibleAssertion {
  return {
    action: 'assertion',
    context: window.__wetest_contextId,
    page: window.__wetest_pageId,
    params: {
      type: 'visible',
      selector: selector,
    },
  }
}

function canPress(event: KeyboardEvent): boolean {
  // 只拦截input上的键盘输入

  if (!['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) {
    return true
  }

  const modifiers = getModifiersByEvent(event)

  // 这三个键属于文本输入，在input处处理
  if (['Backspace', 'Delete', 'AltGraph'].includes(event.key)) return false

  // 忽略ctrl+v，在input处理
  if (/macintosh|mac os x/i.test(navigator.userAgent)) {
    if (event.key === 'v' && event.metaKey) return false
  } else {
    if (event.key === 'v' && event.ctrlKey) return false
    if (event.key === 'Insert' && event.shiftKey) return false
  }

  // process为过程中，比如中文输入法在选词之前的阶段，这里不记录
  if (['Shift', 'Control', 'Meta', 'Alt', 'Process', 'CapsLock'].includes(event.key)) return false

  // 单字符且没有修饰符的，当做input处理
  if (event.key.length <= 1 && !modifiers.length) return false

  // shift加单个英文字符当做大小写转换，当做input处理
  if (event.key && modifiers.length === 1 && modifiers[0] === 'Shift') return false

  return true
}

function filterCheckbox(event: PointerEvent): false | void {
  // checkbox 也是 input框
  if ((event.target as HTMLElement).tagName !== 'INPUT') {
    return
  }

  // #18 过滤掉 label 默认行为的点击事件
  if (!event.pointerType && (event.x || event.y)) {
    return false
  }
}

function canClick(event: MouseEvent): boolean {
  if (filterCheckbox(event as PointerEvent) === false) {
    return false
  }

  return true
}
