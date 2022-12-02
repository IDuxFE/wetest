import { computed, ComputedRef, Ref } from 'vue'
import { Action } from '@idux/wetest-engine'
import { ToolInfo, ToolsStatus } from '../../types'
import { getScreenshotAssertion, getUrlAssertion } from '../../utils/actionsFormatter'
import { getDefaultToolsStatus } from './useToolbar'
import { merge } from 'lodash-es'
import { useSelectorInfo } from '../useSelectorInfo'

/**
 * 全屏截图
 *
 * @export
 * @param {Ref<ToolsStatus>} toolsStatus
 * @param {(action: Action) => void} recordAction
 * @returns {*}  {ComputedRef<ToolInfo>}
 */
export function useFullScreenshot(
  toolsStatus: Ref<ToolsStatus>,
  recordAction: (action: Action) => void,
): ComputedRef<ToolInfo> {
  return computed(() => ({
    text: '全屏截图',
    active: false,
    disabled: !toolsStatus.value.recording,
    handler() {
      if (!toolsStatus.value.recording) return
      toolsStatus.value = {
        ...getDefaultToolsStatus(),
        recording: toolsStatus.value.recording,
      }
      recordAction(getScreenshotAssertion())
    },
  }))
}

/**
 * 元素截图
 *
 * @export
 * @param {Ref<ToolsStatus>} toolsStatus
 * @returns {*}  {ComputedRef<ToolInfo>}
 */
export function useElementScreenshot(toolsStatus: Ref<ToolsStatus>): ComputedRef<ToolInfo> {
  return computed(() => ({
    text: '元素截图',
    active: toolsStatus.value.asserting.elementScreenshot,
    disabled: !toolsStatus.value.recording,
    handler() {
      if (!toolsStatus.value.recording) return
      toolsStatus.value = merge(getDefaultToolsStatus(), {
        recording: toolsStatus.value.recording,
        asserting: {
          elementScreenshot: !toolsStatus.value.asserting.elementScreenshot,
        },
      })
    },
  }))
}

/**
 * 截图工具的配置
 *
 * @export
 * @param {Ref<ToolsStatus>} toolsStatus
 * @param {(action: Action) => void} recordAction
 * @returns {*}
 */
export function useScreenshot(toolsStatus: Ref<ToolsStatus>, recordAction: (action: Action) => void) {
  const fullScreenshot = useFullScreenshot(toolsStatus, recordAction)
  const elementScreenshot = useElementScreenshot(toolsStatus)
  const screenshotTools = computed(() => [fullScreenshot.value, elementScreenshot.value])
  return computed(() => ({
    text: '截图断言',
    hotKey: 'Ctrl+4',
    active: screenshotTools.value.some(item => item.active),
    disabled: !toolsStatus.value.recording,
    children: screenshotTools.value,
  }))
}

export function useElementValue(toolsStatus: Ref<ToolsStatus>) {
  return computed(() => ({
    text: 'value断言',
    hotKey: 'Ctrl+6',
    active: toolsStatus.value.asserting.elementValue,
    disabled: !toolsStatus.value.recording,
    handler() {
      if (!toolsStatus.value.recording) return
      toolsStatus.value = merge(getDefaultToolsStatus(), {
        recording: toolsStatus.value.recording,
        asserting: {
          elementValue: !toolsStatus.value.asserting.elementValue,
        },
      })
    },
  }))
}

export function useElementSnapshot(toolsStatus: Ref<ToolsStatus>) {
  return computed(() => ({
    text: '元素快照',
    hotKey: 'Ctrl+5',
    active: toolsStatus.value.asserting.elementSnapshot,
    disabled: !toolsStatus.value.recording,
    handler() {
      if (!toolsStatus.value.recording) return
      toolsStatus.value = merge(getDefaultToolsStatus(), {
        recording: toolsStatus.value.recording,
        asserting: {
          elementSnapshot: !toolsStatus.value.asserting.elementSnapshot,
        },
      })
    },
  }))
}

export function useElementVisible(toolsStatus: Ref<ToolsStatus>) {
  const { updateSelectorInfo } = useSelectorInfo()

  return computed(() => ({
    text: '元素可见',
    active: toolsStatus.value.asserting.elementVisible,
    disabled: !toolsStatus.value.recording,
    handler(event: MouseEvent) {
      if (!toolsStatus.value.recording) return

      updateSelectorInfo({
        x: event.clientX,
        y: event.clientY,
        show: true,
      })

      toolsStatus.value = merge(getDefaultToolsStatus(), {
        recording: toolsStatus.value.recording,
        asserting: {
          elementVisible: !toolsStatus.value.asserting.elementVisible,
        },
      })
    },
  }))
}

export function useUrlAssertion(toolsStatus: Ref<ToolsStatus>, recordAction: (action: Action) => void) {
  return computed(() => ({
    text: '断言url',
    active: false,
    hotKey: 'Ctrl+3',
    disabled: !toolsStatus.value.recording,
    handler() {
      if (!toolsStatus.value.recording) return
      toolsStatus.value = merge(getDefaultToolsStatus(), {
        recording: toolsStatus.value.recording,
      })
      recordAction(getUrlAssertion())
    },
  }))
}

/**
 * 是否被选中 checkbox 、radio
 *
 * @export
 * @param {Ref<ToolsStatus>} toolsStatus
 * @returns {*}  {ComputedRef<ToolInfo>}
 */
export function useElementIsChecked(toolsStatus: Ref<ToolsStatus>): ComputedRef<ToolInfo> {
  return computed(() => ({
    text: 'isChecked',
    active: toolsStatus.value.asserting.elementIsChecked,
    disabled: !toolsStatus.value.recording,
    handler() {
      if (!toolsStatus.value.recording) return
      toolsStatus.value = merge(getDefaultToolsStatus(), {
        recording: toolsStatus.value.recording,
        asserting: {
          elementIsChecked: !toolsStatus.value.asserting.elementIsChecked,
        },
      })
    },
  }))
}
