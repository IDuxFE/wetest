import { ToolInfo, ToolsStatus } from '../../types'
import { ref, computed, ComputedRef, Ref } from 'vue'
import { useRecordAction } from '../recorder/useRecordAction'
import { useRecorder } from '../recorder/useRecorder'
import { useRecord } from './useRecord'
import { useElementSnapshot, useUrlAssertion, useElementValue, useElementIsChecked } from './useAssertion'
import { useWaitTimeDialog } from './useWaitForTimeout'
import { getWaitForTimeout } from '../../utils/actionsFormatter'
// import { addEventListener } from '../../utils/dom'

export function getDefaultToolsStatus(): ToolsStatus {
  return {
    recording: false,
    hovering: false,
    asserting: {
      elementScreenshot: false,
      elementSnapshot: false,
      elementVisible: false,
      elementValue: false,
      elementIsChecked: false
    },
  }
}

function useToolsStatus() {
  const toolsStatus = ref<ToolsStatus>(getDefaultToolsStatus())
  window.__wetest_isRecording().then(isRecording => (toolsStatus.value.recording = isRecording))

  // FIXME:这里不知道为啥visibilitychange不生效，需要提个issue问一下，暂时采用__wetest_syncStatus规避
  // addEventListener(document, 'visibilitychange', async () => {
  //   if (document.visibilityState === 'visible') {
  //     window.__wetest_isRecording().then(isRecording => (toolsStatus.value.recording = isRecording))
  //   }
  // })

  window.__wetest_syncStatus = (isRecording: boolean) => {
    toolsStatus.value.recording = isRecording
  }

  return toolsStatus
}

export function useToolbar(): {
  tools: ComputedRef<ToolInfo[]>
  toolsStatus: Ref<ToolsStatus>
} {
  const toolsStatus = useToolsStatus()
  const { recordAction, recordPreventedAction } = useRecordAction(toolsStatus)

  const { addRecordActionListeners, removeRecordActionListeners } = useRecorder(toolsStatus, recordAction)

  const recordWaitForTimeout = useWaitTimeDialog()

  const recordBtnHandler = useRecord(toolsStatus)

  // const screenshotAssertion = useScreenshot(toolsStatus, recordAction)
  const snapshotAssertion = useElementSnapshot(toolsStatus)
  const urlAssertion = useUrlAssertion(toolsStatus, recordAction)
  const elementValue = useElementValue(toolsStatus)
  const elementIsChecked = useElementIsChecked(toolsStatus)

  const isRecordAction = ref(true)

  const recordOpr = computed(() => {

    return {
      text: '记录',
      active: false,
      disabled: false,
      children: [
        {
          text: toolsStatus.value.recording ? '结束' : '开始',
          active: false,
          disabled: false,
          hotKey: 'Ctrl+1',
          handler() {
            toolsStatus.value.recording && recordPreventedAction()
            recordBtnHandler()

            if (!isRecordAction.value) {
              addRecordActionListeners()
              isRecordAction.value = true
            }
          },
        },
        {
          text: isRecordAction.value ? '暂停' : '继续',
          active: false,
          disabled: !toolsStatus.value.recording,
          handler() {
            if (isRecordAction.value) {
              removeRecordActionListeners()
            } else {
              addRecordActionListeners()
            }
            isRecordAction.value = !isRecordAction.value
          },
        }
      ]
    }
  })

  const tools = computed(() => [
    recordOpr.value,
    {
      text: 'Hover',
      active: toolsStatus.value.hovering,
      disabled: !toolsStatus.value.recording,
      hotKey: 'Ctrl+2',
      handler() {
        toolsStatus.value = {
          ...getDefaultToolsStatus(),
          recording: toolsStatus.value.recording,
          hovering: !toolsStatus.value.hovering,
        }
      },
    },
    {
      text: 'WaitForTimeout',
      active: false,
      disabled: !toolsStatus.value.recording,
      handler() {
        removeRecordActionListeners()
        recordWaitForTimeout()
          .then(async data => {
            await recordAction(getWaitForTimeout(data))
          })
          .finally(addRecordActionListeners)
      },
    },
    urlAssertion.value,
    // TODO 截图中的文字对比在linux下有问题
    // screenshotAssertion.value,
    snapshotAssertion.value,
    elementValue.value,
    elementIsChecked.value,
    {
      text: 'exit',
      active: false,
      hotKey: 'Ctrl+6',
      disabled: toolsStatus.value.recording,
      handler() {
        recordPreventedAction()
        window.__wetest_exit()
      },
    },
  ])

  return {
    tools,
    toolsStatus,
  }
}
