import { Action } from '@idux/wetest-engine'
import { Ref } from 'vue'
import { ToolsStatus } from '../../types'

export function useRecordAction(toolsStatus: Ref<ToolsStatus>): {
  recordAction: (action: Action) => void
  recordPreventedAction: () => void
} {
  let preventedAction: Action | null = null

  async function recordPreventedAction() {
    if (preventedAction) {
      await window.__wetest_recordAction(preventedAction)
      preventedAction = null
    }
  }

  async function recordAction(action: Action | null) {
    if (!toolsStatus.value.recording || !action) return

    // input/scroll先暂存
    if (action.action === 'input' || action.action === 'scroll') {
      const preventCondition =
        !preventedAction ||
        (preventedAction.action === action.action &&
          preventedAction.context === action.context &&
          preventedAction.page === action.page &&
          preventedAction.params.selector === action.params.selector) // todo: 选择器重构后  这里要看看怎么处理

      if (preventCondition) {
        preventedAction = action
        return
      }
    }

    // 先将上一个action推送过去
    await recordPreventedAction()
    window.__wetest_recordAction(action)
  }

  return {
    recordAction,
    recordPreventedAction,
  }
}
