import { Action } from '@idux/wetest-engine'
import { getSelector } from '../../utils/dom'
import { ref, Ref, onMounted, onUnmounted } from 'vue'
import { ToolsStatus } from '../../types'
import {
  getClickAction,
  getHoverAction,
  getInputAction,
  getPressAction,
  getScreenshotAssertion,
  getSnapshotAssertion,
  getVisibleAssertion,
  getValueAssertion,
  getIsCheckedAssertion,
} from '../../utils/actionsFormatter'
import { addEventListener, preventEvent } from '../../utils/dom'

export function useRecorder(toolsStatus: Ref<ToolsStatus>, recordAction: (action: Action) => void) {
  const listeners = ref<(() => void)[]>([])

  const getClickAction = useClick(toolsStatus, recordAction)

  function listenerWrapper<T extends Event>(action: (event: T) => void) {
    return (event: Event) => {
      if (
        !toolsStatus.value.recording ||
        (event.target && event.target instanceof Element && event.target.classList.toString().includes('toolbar')) ||
        (!((event as T) instanceof PointerEvent && (event as PointerEvent).pointerType) &&
          !((event as T) instanceof KeyboardEvent) &&
          !((event as T) instanceof InputEvent) &&
          !((event as T).type === 'scroll'))
      )
        return

      action(event as T)
    }
  }

  function actionWrapper<T extends Event>(getAction: (event: T) => Action | null) {
    return function (event: T) {
      const action = getAction(event as T)
      if (!action) return

      recordAction(action)
    }
  }

  function addRecordActionListeners() {
    listeners.value = [
      addEventListener(document, 'click', listenerWrapper(getClickAction), true),
      addEventListener(document, 'auxclick', listenerWrapper(getClickAction), true),
      addEventListener(document, 'input', listenerWrapper(actionWrapper(getInputAction)), true),
      addEventListener(document, 'keydown', listenerWrapper(actionWrapper(getPressAction)), true),
      // addEventListener(document, 'keyup', listenerWrapper(onKeyup), true),
      // addEventListener(document, 'mousedown', event => _onMouseDown(event as MouseEvent), true),
      // addEventListener(document, 'mouseup', event => _onMouseUp(event as MouseEvent), true),
      // addEventListener(
      //   document,
      //   'mousemove',
      //   // ?????????50ms???debounce?????????????????????????????????
      //   debounce(event => onMousemove(event as MouseEvent), 50),
      //   true,
      // ),
      // addEventListener(document, 'mouseleave', event => _onMouseLeave(event as MouseEvent), true),
      // addEventListener(document, 'focus', () => _onFocus(), true),
      // addEventListener(document, 'scroll', listenerWrapper(actionWrapper(getScrollAction)), true),
      // addEventListener(document, 'wheel', listenerWrapper(actionWrapper(getWheelAction)), true)
    ]
  }

  function removeRecordActionListeners() {
    listeners.value.forEach(remove => remove())
    listeners.value = []
  }

  onMounted(addRecordActionListeners)
  onUnmounted(removeRecordActionListeners)

  return {
    addRecordActionListeners,
    removeRecordActionListeners,
  }
}

function useClick(toolsStatus: Ref<ToolsStatus>, recordAction: (action: Action) => void): (event: MouseEvent) => void {
  return function (event: MouseEvent) {
    if (!event.target) return
    // hovering
    if (toolsStatus.value.hovering) {
      preventEvent(event)
      toolsStatus.value.hovering = false
      recordAction(getHoverAction(event)!)
      return
    }
    // ???????????????
    if (toolsStatus.value.asserting.elementScreenshot) {
      preventEvent(event)
      toolsStatus.value.asserting.elementScreenshot = false
      recordAction(getScreenshotAssertion(event)!)
      return
    }

    // ???????????????
    if (toolsStatus.value.asserting.elementSnapshot) {
      preventEvent(event)
      toolsStatus.value.asserting.elementSnapshot = false
      recordAction(getSnapshotAssertion(event)!)
      return
    }

    // value?????????
    if (toolsStatus.value.asserting.elementValue) {
      preventEvent(event)
      toolsStatus.value.asserting.elementValue = false

      recordAction(getValueAssertion(event)!)
      return
    }

    // isChecked?????????
    if (toolsStatus.value.asserting.elementIsChecked) {
      preventEvent(event)
      toolsStatus.value.asserting.elementIsChecked = false
      // preventDefault ?????????????????????????????????????????????checked???????????????
      const time = setTimeout(() => {
        recordAction(getIsCheckedAssertion(event)!)
        clearTimeout(time)
      })
      return
    }

    // ???????????????
    if (toolsStatus.value.asserting.elementVisible) {
      preventEvent(event)
      recordAction(getVisibleAssertion(getSelector(event.target)))
      toolsStatus.value.asserting.elementVisible = false
      return
    }

    recordAction(getClickAction(event)!)
  }
}
