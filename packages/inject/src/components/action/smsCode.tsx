import { SmsCodeAction } from '@idux/wetest-engine'
import { FormRules, NAlert, NForm, NFormItem, NInput, NInputNumber, NButton, NTooltip } from 'naive-ui'
import { defineComponent, ref, Ref, PropType, computed, onMounted, onUnmounted } from 'vue'
import { object } from 'vue-types'
const alertText = `1️⃣ 先点击 页面 "获取验证码" 按钮，输入验证码后，🚫 先别点提交/登录！<br/>
2️⃣ 打开此窗口，输入完信息后，点击确定保存。<br/>
3️⃣ 最后回到页面， 点击提交/登录按钮 完成操作。`
export default defineComponent({
  props: {
    data: object<SmsCodeAction['params']>().isRequired,
    formRef: Object as PropType<Ref<any>>,
  },
  setup(props) {
    const tooltipText = `点击按钮，当按钮为on时，点击页面中的短信验证码输入框`
    const ifAllowSmsCodeInputClick = ref(false)
    const elSelectorBtnLabel = computed(() => `点击选择/${ifAllowSmsCodeInputClick.value ? 'on' : 'off'}`)
    const elSelectorBtnType = computed(() => (ifAllowSmsCodeInputClick.value ? 'info' : 'default'))
    const rules: FormRules = ['addr', 'token', 'phone', 'smsId', 'retryTimes'].reduce((obj, cur) => {
      obj[cur] = [
        {
          required: true,
          message: '不能为空',
        },
      ]
      return obj
    }, {})
    const onSelectTarget = () => {
      ifAllowSmsCodeInputClick.value = true
    }
    const saveTargetElUniqueSymbol = (target: HTMLElement) => {
      const id = target.getAttribute('id')
      const classNames = target.getAttribute('class')
      const name = target.getAttribute('name')

      if (id) {
        return `#${id}`
      }
      if (name) {
        return `input[name='${name}']`
      }
      if (classNames) {
        const classNamesArr = classNames.split(' ').filter(Boolean)
        for (let className of classNamesArr) {
          const els = Array.from(document.querySelectorAll(`.${className}`))
          const index = els.indexOf(target)
          if (index !== -1) {
            return els.length === 1 ? `.${className}` : `.${className}:nth-of-type(${index + 1})`
          }
        }
      }
      return ''
    }

    const getTargetSelectorFn = (e: MouseEvent) => {
      if (!ifAllowSmsCodeInputClick.value) {
        return
      }
      const target = e.target as HTMLElement
      if (target) {
        if (target.nodeName === 'INPUT') {
          const uniqueSelectorSymbol = saveTargetElUniqueSymbol(target)
          if (uniqueSelectorSymbol) {
            props.data.smsId = uniqueSelectorSymbol
          } else {
          }
          ifAllowSmsCodeInputClick.value = false
        }
      }
    }

    onMounted(() => {
      document.addEventListener('click', getTargetSelectorFn)
    })
    onUnmounted(() => {
      document.removeEventListener('click', getTargetSelectorFn)
    })

    return () => (
      <NForm rules={rules} ref={props.formRef} model={props.data}>
        <NAlert style="margin-bottom:10px;" title="录制操作提示" type="info">
          <div v-html={alertText}></div>
        </NAlert>
        <NFormItem label="远程请求地址" path="addr">
          <NInput v-model:value={props.data.addr} placeholder="请输入远程请求地址" />
        </NFormItem>
        <NFormItem label="token" path="token">
          <NInput v-model:value={props.data.token} placeholder="请输入远程token" />
        </NFormItem>
        <NFormItem label="手机号码" path="phone">
          <NInput v-model:value={props.data.phone} placeholder="请输入手机号" />
        </NFormItem>
        <NFormItem label="重试次数" path="retryTimes">
          <NInputNumber
            v-slots={{
              suffix: () => '次',
            }}
            min={1}
            v-model:value={props.data.retryTimes}
            placeholder="请输入重试次数"
          />
          <small>（轮询获取验证码次数）</small>
        </NFormItem>
        <NFormItem label="短信验证码输入框选择器" path="smsId">
          <div style={{ display: 'flex', gap: '3px', width: '100%' }}>
            <div style={{ flex: 1 }}>
              <NInput placeholder="支持格式：#id/.class/input:nth-of-type(n)" v-model:value={props.data.smsId}></NInput>
            </div>
            <NTooltip
              trigger="hover"
              v-slots={{
                trigger: (
                  <NButton type={elSelectorBtnType.value} onClick={onSelectTarget}>
                    {elSelectorBtnLabel.value}
                  </NButton>
                ),
              }}
            >
              {tooltipText}
            </NTooltip>
          </div>
        </NFormItem>
      </NForm>
    )
  },
})
