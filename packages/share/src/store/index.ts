import { EngineState } from './type'
import { O } from 'ts-toolbelt'
import { RecorderConfig, RunnerConfig, TestInfoImpl } from '@wetest/engine'

let globals = require('node-global-storage')


export function setTestInfoImplState(v: TestInfoImpl) {
    globals.set('testInfoImpl', v)
}

export function getTestInfoImplState() {
    return globals.get('testInfoImpl') as TestInfoImpl
}

export function setRunnerConfig(v: O.Partial<RunnerConfig, 'deep'>) {
    globals.set('runnerConfig', v)
}

export function getRunnerConfig() {
    return globals.get('runnerConfig') as RunnerConfig
}

export function setRecordConfig(v: O.Partial<RecorderConfig, 'deep'>) {
    globals.set('recordConfig', v)
}

export function getRecordConfig() {
    return globals.get('recordConfig') as RecorderConfig
}

export function setEngineState(v: EngineState) {
    globals.set('engineState', v)
}

export function getEngineState(): EngineState {
    return globals.get('engineState')
}

export function getEngineIsRunning(): boolean {
    return globals.get('engineState') === 'running'
}
