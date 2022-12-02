import type { EngineApis, InjectApis } from '@idux/wetest-engine'

type PromisifyFunc<T extends (...args: any[]) => any> = (...args: Parameters<T>) => Promise<ReturnType<T>>

// 将object里的函数promise化
type PromisifyObject<T extends Object> = {
  [k in keyof T]: T[k] extends (...args: any[]) => any ? PromisifyFunc<T[k]> : T[k]
}

declare global {
  interface Window extends PromisifyObject<EngineApis>, InjectApis {}
}
