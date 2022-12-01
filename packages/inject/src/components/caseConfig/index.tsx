import { NForm, NFormItem, NInput, NSwitch, NRadioGroup, NRadio } from 'naive-ui'
import { Case } from '@wetest/engine'
import { defineComponent, ref } from 'vue'
import { func, object } from 'vue-types'

type CaseInfo = Pick<Case, 'name' | 'origin' | 'saveMock' | 'loginCase' | 'viewport'>

const maxLength = 100

// TODO:校验输入合法性
export default defineComponent({
  props: {
    info: object<CaseInfo>().isRequired,
    onChange: func<(info: CaseInfo) => void>().isRequired,
  },
  setup(props) {
    function onValChange(changedVal: Partial<typeof props.info>) {
      props.onChange?.({
        ...props.info,
        ...changedVal,
      })
    }

    const viewportOptions = [
      {
        label: '大屏',
        width: 1920,
        height: 968,
      },
      {
        label: '小屏',
        width: 1366,
        height: 768,
      },
    ] as const

    const viewportChose = ref(0)

    function chooseViewport(index) {
      viewportChose.value = index
      onValChange({ viewport: { width: viewportOptions[index].width, height: viewportOptions[index].height } })
    }

    return () => (
      <NForm>
        <NFormItem label="用例名" path="name">
          <NInput
            value={props.info.name}
            placeholder={`请输入非中文字符，不超过${maxLength}个`}
            minlength={2}
            maxlength={maxLength}
            onInput={val => onValChange({ name: val })}
          />
        </NFormItem>
        <NFormItem label="是否为登录用例" path="loginCase">
          <NSwitch value={props.info.loginCase} onChange={val => onValChange({ loginCase: val })} />
        </NFormItem>
        <NFormItem label="是否保存接口数据" path="saveMock">
          <NSwitch value={props.info.saveMock} onChange={val => onValChange({ saveMock: val })} />
        </NFormItem>
        <NFormItem label="浏览器宽高" path="name">
          <NRadioGroup value={viewportChose.value} onUpdateValue={chooseViewport}>
            {viewportOptions.map((item, index) => (
              <NRadio key={index} value={index}>
                {item.label}({item.width}*{item.height})
              </NRadio>
            ))}
          </NRadioGroup>
        </NFormItem>
      </NForm>
    )
  },
})
