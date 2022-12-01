import { useInspector } from '../../logics/useInspector'
import { defineComponent, computed, watchEffect } from 'vue'
import { addEventListener } from '../../utils/dom'
import { object } from 'vue-types'
import { ToolsStatus } from '../../types'
import { ShadowRoot } from 'vue-shadow-dom'

export default defineComponent({
  props: {
    toolsStatus: object<ToolsStatus>().isRequired,
  },
  setup(props) {
    const { hoveringTarget, stopInspecting, inspect } = useInspector()

    const removeClickListener = addEventListener(document, 'click', () => {
      stopInspecting()
      removeClickListener()
    })

    const hightLightStyle = computed(() => {
      const rect = (hoveringTarget.value ?? document.body).getBoundingClientRect()

      return {
        display: hoveringTarget.value ? 'block' : 'none',
        position: 'absolute',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        backgroundColor: 'rgba(220, 111, 111, 0.498)',
      } as const
    })

    // const selectorStyle = computed(() => {
    //   const rect = (hoveringTarget.value ?? document.body).getBoundingClientRect()
    //   let top = rect.top + rect.height + 8

    //   if (rect.height >= document.body.offsetHeight - 42) {
    //     top = 0
    //   }
    //   return {
    //     display: hoveringTarget.value ? 'block' : 'none',
    //     position: 'absolute',
    //     left: `${rect.left}px`,
    //     top: `${top}px`,
    //     backgroundColor: 'rgba(0, 0, 0, 0.5)',
    //     color: '#fff',
    //     padding: '0 8px',
    //   } as const
    // })

    watchEffect(() => {
      if (
        props.toolsStatus.hovering ||
        props.toolsStatus.asserting.elementScreenshot ||
        props.toolsStatus.asserting.elementSnapshot ||
        props.toolsStatus.asserting.elementVisible ||
        props.toolsStatus.asserting.elementValue ||
        props.toolsStatus.asserting.elementIsChecked
      ) {
        inspect()
      } else {
        stopInspecting()
        removeClickListener()
      }
    })

    const containerStyle = {
      position: 'fixed',
      inset: '0px',
      pointerEvents: 'none',
      display: 'block',
      zIndex: 999999,
    } as const

    return () => (
      <div style={containerStyle}>
        <ShadowRoot abstract>
          <div style={hightLightStyle.value}></div>
        </ShadowRoot>
      </div>
    )
  },
})
