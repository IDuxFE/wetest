import { useDialog, useMessage } from 'naive-ui'
import { ref, Ref, h } from 'vue'
import { ToolsStatus } from '../../types'
import CaseConfig from '../../components/caseConfig/index'

function useStartRecord(): () => Promise<void> {
  const dialog = useDialog()
  const message = useMessage()

  const caseInfo = ref({
    name: '',
    origin: window.location.origin,
    saveMock: false,
    loginCase: false,
    viewport: {
      width: 1920,
      height: 968,
    },
  })

  const errorMsg = {
    fail: '创建用例失败，请重试！',
    exist: '用例已存在，请删除用例或者更改用例名！',
  }

  return function () {
    return new Promise((res, rej) => {
      dialog.info({
        title: '请输入用例名称',
        content: () =>
          h(CaseConfig, {
            info: caseInfo.value,
            onChange(info) {
              if (info.name) {
                // 去除空格，避免末尾有空格导致 git 无法正常识别文件夹
                info.name = info.name.trim()
              }
              caseInfo.value = info
            },
          }),
        positiveText: '确认',
        onNegativeClick: rej,
        async onPositiveClick() {
          const createResult = await window.__wetest_createCase(caseInfo.value)

          if (createResult !== 'success') {
            message.error(`创建用例失败！${errorMsg[createResult]}`)
            return false
          }

          message.success('创建用例成功！')

          await window.__wetest_startRecord({
            context: window.__wetest_contextId,
            page: window.__wetest_pageId,
            url: location.href,
          })
          res()
          return true
        },
      })
    })
  }
}

export function useRecord(toolsStatus: Ref<ToolsStatus>): () => Promise<void> {
  const startRecord = useStartRecord()

  return async function handler() {
    if (!toolsStatus.value.recording) {
      await startRecord()
      toolsStatus.value.recording = true
      window.location.reload()
    } else {
      window.__wetest_finishRecord({
        context: window.__wetest_contextId,
      })
      toolsStatus.value.recording = false
    }
  }
}
