import { defineComponent } from 'vue'
import { NDialogProvider, NMessageProvider, NConfigProvider } from 'naive-ui'
import { string, oneOfType, object } from 'vue-types'
import { useSelectorInfoProvide } from '../logics/useSelectorInfo'

export default defineComponent({
  props: {
    to: oneOfType([string(), object<HTMLElement>()]).isRequired,
  },
  setup(props, { slots }) {
    useSelectorInfoProvide(props.to as HTMLElement)

    return () => (
      <>
        <NConfigProvider>
          <NDialogProvider to={props.to}>
            <NMessageProvider to={props.to}>{slots}</NMessageProvider>
          </NDialogProvider>
        </NConfigProvider>
      </>
    )
  },
})
