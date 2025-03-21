// import { useDialog, } from 'naive-ui'
import { NButton } from 'naive-ui'
import { createApp, h, ref } from 'vue'
import SmsCode from '../../components/action/smsCode'
import axios, { AxiosResponse } from 'axios'
import { SmsCodeAction, SmsCodeReqRsp } from '@idux/wetest-engine'

const SUC_CODE = 1
const ERR_CODE = 2
const RETRY_CODE = 3
const DEFAULT_TIMES = 20
function useDivDialog() {
  return function (component, props) {
    const divElement = document.createElement('div')
    document.body.appendChild(divElement)
    const app = createApp({
      render() {
        const onClose = () => {
          app.unmount()
          document.body.removeChild(divElement)
        }
        return h(
          'div',
          {
            style: {
              position: 'fixed',
              top: '50%',
              left: '0',
              width: '500px',
              transform: 'translate(30%, -50%)',
              zIndex: 1000,
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            },
          },
          [
            h(component, props),
            h('div', { style: { display: 'flex', justifyContent: 'flex-end' } }, [
              h(
                NButton,
                {
                  type: 'info',
                  onClick: async () => {
                    try {
                      const ifOk = await props?.onOk()
                      if (ifOk) {
                        onClose()
                      }
                    } catch (err) {
                      console.error(err)
                    }
                  },
                },
                '确定',
              ),
              h(
                NButton,
                {
                  onClick: () => {
                    onClose()
                  },
                },
                '关闭',
              ),
            ]),
          ],
        )
      },
    })

    app.mount(divElement)
  }
}

export function useSmsCodeDialog() {
  const customDialog = useDivDialog()
  return function () {
    const formRef = ref()
    const formData = ref({
      phone: '',
      smsId: '',
      addr: '',
      token: '',
      retryTimes: 20,
    })
    return new Promise<typeof formData.value>((resolve, reject) => {
      customDialog(SmsCode, {
        data: formData.value,
        formRef,
        onOk: async () => {
          try {
            await formRef.value.validate()
            resolve(formData.value)
            return true
          } catch (err) {
            console.error(err)
            reject(err)
          }
          return false
        },
      })
    })
  }
}

let idx = 1
export const reqSmsCode = async (params: SmsCodeAction['params']) => {
  console.log('reqSmsCode is running!')
  try {
    const response: AxiosResponse<SmsCodeReqRsp> = await axios.post<SmsCodeReqRsp>(params.addr, {
      phone: params.phone,
      token: params.token,
    })
    const data = response.data
    const rspCode = data.code
    const retryTimes = params.retryTimes || DEFAULT_TIMES
    switch (rspCode) {
      case SUC_CODE:
        return data.data.code

      case ERR_CODE:
        console.error('fail: request fail, server said code is 0')
        return ''

      case RETRY_CODE:
        console.log(`now retry: ${idx++} times`)
        if (idx < retryTimes) {
          return new Promise(resolve => {
            setTimeout(async () => {
              const result = await reqSmsCode(params)
              resolve(result)
            }, 3000)
          })
        }
        return ''

      default:
        console.error('fail: request successful but response with no code')
        return ''
    }
  } catch (error: any) {
    // 处理错误
    if (axios.isAxiosError(error) && error.response) {
      console.error(`fail:reqSmsCode fail with:${error.response.data?.msg}`)
    } else {
      console.error(`fail:something error when reqSmsCode:${error.msg}`)
    }
  }
  return ''
}
