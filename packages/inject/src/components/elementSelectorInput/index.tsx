import { NPopconfirm, NInput } from 'naive-ui'
import { defineComponent } from 'vue'
import { object } from 'vue-types'
import { useSelectorInfo } from '../../logics/useSelectorInfo'
import { SelectorInfo } from '../../types'

export default defineComponent({
  props: {
    info: object<SelectorInfo>().isRequired,
  },

  setup(props) {
    const { updateSelectorInfo } = useSelectorInfo()

    const handlePositiveClick = () => {
      updateSelectorInfo({
        show: false,
      })
      props.info.onConfirm?.()
    }
    const handleNegativeClick = () => {
      updateSelectorInfo({
        show: false
      })
      props.info.onCancel?.()
    }

    return () => (
      <NPopconfirm
        class="x-wetest-pop"
        on-positive-click={handlePositiveClick}
        on-negative-click={handleNegativeClick}
        trigger="manual"
        showIcon={false}
        show={props.info.show}
        x={props.info.x}
        y={props.info.y}
        to={props.info.to}
        width={480}
      >
        <NInput
          value={props.info.value}
          onInput={value => {
            updateSelectorInfo({ value })
          }}
        ></NInput>
      </NPopconfirm>
    )
  },
})
