
import { addEventListener } from '../../utils/dom'
import throttle from 'lodash-es/throttle'
import { computed, onMounted, ref } from 'vue'

export function useDragToolbar() {

    const toolbarRef = ref<HTMLDivElement>()
    const pos = ref({
        left: 0,
        top: 0
    })
    const clickPos = ref({
        left: 0,
        top: 0
    })
    const throttleFn = throttle((e: MouseEvent) => {
        pos.value.left = e.clientX - clickPos.value.left
        pos.value.top = e.clientY - clickPos.value.top
    }, 100)
    const onMousedown = (e: MouseEvent) => {
        clickPos.value = {
            left: e.offsetX,
            top: e.offsetY
        }

        // @ts-ignore
        const removeMoveEvent = addEventListener(document, 'mousemove', throttleFn)
        const removeUpEvent = addEventListener(document, 'mouseup', () => {
            removeMoveEvent()
            removeUpEvent()
        })
    }
    const toolbarStyle = computed(() => {

        // 限制值为 0-range
        function getViewRange (range, range2) {
            return Math.max(Math.min(range, range2), 0)
        }
        const toolbarWidth = toolbarRef.value?.offsetWidth ?? 0
        const toolbarHeight = toolbarRef.value?.offsetHeight ?? 0
        const maxLeft = document.documentElement.clientWidth - toolbarWidth
        const maxTop = document.documentElement.clientHeight - toolbarHeight
        let left = getViewRange(maxLeft, pos.value.left)
        let top = getViewRange(maxTop, pos.value.top)

        return {
            left: left + 'px',
            top: top + 'px'
        }
    })

    onMounted(() => {

        const toolbarWidth = toolbarRef.value?.offsetWidth ?? 0
        const toolbarHeight = toolbarRef.value?.offsetHeight ?? 0
        const documentEle = document.documentElement
        pos.value = {
            left: documentEle.clientWidth - toolbarWidth - 24,
            top: documentEle.clientHeight - toolbarHeight - 40
        }
    })
    return {
        toolbarRef,
        toolbarStyle,
        onMousedown
    }
}
