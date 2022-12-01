import { Action } from './action'

export interface Case {
  name: string
  origin: string
  saveMock: boolean
  loginCase: boolean
  skip: boolean
  viewport?: {
    width: number
    height: number
  }
  actions: Action[]
}
