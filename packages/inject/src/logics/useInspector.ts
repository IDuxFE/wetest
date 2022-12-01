/*
 * 高亮dom工具
 */

import { addEventListener } from '../utils/dom'
import { shallowRef } from 'vue'

export function useInspector() {
  const hoveringTarget = shallowRef<HTMLElement | null>(null)
  let removeListener = () => {}
  function stopInspecting() {
    removeListener()
    hoveringTarget.value = null
  }
  function inspect() {
    removeListener()
    removeListener = addEventListener(
      document,
      'mouseover',
      event => {
        // 工具内的dom忽略
        if ((event as any).path?.map(item => item.tagName).includes('X-WETEST')) {
          hoveringTarget.value = null
        } else {
          hoveringTarget.value = event.target as HTMLElement
        }
      },
      true,
    )
  }
  return {
    hoveringTarget,
    stopInspecting,
    inspect,
  }
}
