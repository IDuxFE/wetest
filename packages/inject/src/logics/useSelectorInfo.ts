import { inject, provide, Ref, ref } from 'vue'
import { SelectorInfo } from '../types'

export const useSelectorInfo = () => {
  const selectorInfo = inject<Ref<SelectorInfo>>('selectorInfo')!
  const updateSelectorInfo = inject<(info: Partial<SelectorInfo>) => void>('updateSelectorInfo')!

  return { selectorInfo, updateSelectorInfo }
}

export const useSelectorInfoProvide = (to?: HTMLElement) => {
  const selectorInfo = ref<SelectorInfo>({
    value: {
      levelSelectorMap: {},
      firstSelector: []
    },
    show: false,
    x: 0,
    y: 0,
    onConfirm: () => {},
    onCancel: () => {},
    to,
  })

  provide('selectorInfo', selectorInfo)
  provide('updateSelectorInfo', (info: Partial<SelectorInfo>) => Object.assign(selectorInfo.value, info))
}
