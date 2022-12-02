import { Modifier } from '@idux/wetest-engine'
import DomSelector from '@idux/wetest-ai-selector'
// import getCssSelector from 'css-selector-generator'

export function addEventListener(
  target: EventTarget,
  eventName: string,
  listener: (evt: Event) => void,
  useCapture?: boolean,
): () => void {
  target.addEventListener(eventName, listener, useCapture)
  const remove = () => {
    target.removeEventListener(eventName, listener, useCapture)
  }
  return remove
}

/**
 * 获取dom 选择器
 *
 * @export
 * @param {EventTarget} target
 * @param {Document} document
 * @returns
 */
export function getSelector(target: EventTarget) {
  if (!(target instanceof Element)) {
    throw new Error('[wetest: Inject] target should be type of HTMLElement')
  }

  // todo: 这里注意下  返回的选择器是string 需要兼容起来
  // if (window.__wetest_selectorTransfer) {
  //   return window.__wetest_selectorTransfer(target);
  // }

  const selectorCfg = window.__wetest_cfg.selectorCfg

  let domSelector = new DomSelector({
    selectorCfg,
  })

  // 没有提供wetest_selectorTransfer时，使用默认的方法
  return domSelector.getDomSelectorInfo(target).getSelectorInfo()
  // return getCssSelector(target)
}

/**
 * 获取修饰符
 *
 * @export
 * @param {(MouseEvent | KeyboardEvent)} event
 * @returns {Modifier[]}
 */
export function getModifiersByEvent(event: MouseEvent | KeyboardEvent): Modifier[] {
  let modifiers: Modifier[] = []
  if (event.ctrlKey) {
    modifiers.push('Control')
  }
  if (event.metaKey) {
    modifiers.push('Meta')
  }
  if (event.altKey) {
    modifiers.push('Alt')
  }
  if (event.shiftKey) {
    modifiers.push('Shift')
  }

  return modifiers
}

/**
 * 让事件失效
 *
 * @export
 * @param {Event} event
 */
export function preventEvent(event: Event) {
  event.stopImmediatePropagation()
  event.stopPropagation()
  event.preventDefault()
}

export function getScrollOffset(target: EventTarget): {
  x: number
  y: number
} {
  if (target === document) {
    return {
      x: document.documentElement.scrollLeft ?? window.pageXOffset ?? document.body.scrollLeft,
      y: document.documentElement.scrollTop ?? window.pageYOffset ?? document.body.scrollTop,
    }
  }

  return {
    x: (target as HTMLElement).scrollLeft,
    y: (target as HTMLElement).scrollTop,
  }
}
