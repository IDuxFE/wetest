import { createApp, h } from 'vue'
import { addEventListener } from './utils/dom'
import Inject from './inject'
import Provider from './components/provider'
import { useInit } from './logics/useInit'

export * from './types'

useInit()
const toolbarElement = document.createElement('x-wetest')
toolbarElement.classList.add('wetest')

// 阻止toolbar的点击冒泡，防止记录无用的action
addEventListener(toolbarElement, 'click', (e: Event) => e.stopPropagation())

createApp(h(Provider, {to: toolbarElement},[h(Inject)])).mount(toolbarElement)
document.body.appendChild(toolbarElement)
