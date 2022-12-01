import { defineComponent, ref, computed, watch } from 'vue'
import { array, object } from 'vue-types'
import { useMagicKeys } from '@vueuse/core'
import { ToolInfo } from '../../types'
import './index.less'
import { useDragToolbar } from './useDrag'

function getToolCls(tool: ToolInfo): string[] {
  const basicCls = 'wetest-toolbar__item'
  let result = [basicCls]
  if (tool.active) {
    result.push(`${basicCls}--active`)
  }
  if (tool.disabled) {
    result.push(`${basicCls}--disabled`)
  }
  return result
}

const Tool = defineComponent({
  props: {
    info: object<ToolInfo>().isRequired,
  },
  setup(props) {
    const keys = useMagicKeys()
    const cls = computed(() => getToolCls(props.info))
    const hotKey = props.info.hotKey
    const handler = props.info.handler

    if (hotKey) {
      watch(keys[hotKey], v => {
        if (v && !props.info.disabled) {
          handler?.()
        }
      })
    }

    return () => (
      <div class={cls.value} title={hotKey} onClick={handler}>
        {props.info.text}
        {
          props.info.children?.length ?
            <div class="wetest-toolbar__item-fold">
              {props.info.children?.map(info => (
                <Tool info={info} />
              ))}
            </div> : ''
        }
      </div>
    )
  },
})

export default defineComponent({
  props: {
    tools: array<ToolInfo>().isRequired,
  },
  setup(props) {
    const toolbarVisible = ref(true)
    const { toolbarRef, toolbarStyle, onMousedown } = useDragToolbar()

    window.__wetest_toggleShowToolbar = (visible: boolean) => {
      toolbarVisible.value = visible
    }

    return () => (
      <div class="wetest-toolbar" ref={toolbarRef} style={toolbarStyle.value} v-show={toolbarVisible.value}>
        <div class="wetest-toolbar__move" onMousedown={onMousedown}>||</div>
        {props.tools.map(tool => (
          <Tool info={tool} />
        ))}
      </div>
    )
  },
})
