
export type TestStatus = 'pass' | 'fail'


// 步骤执行信息接口
export interface Step {
    stepId: string
    title: string
    startTime: number
    endTime?: number
    error?: string
    status: TestStatus
}

// 用例执行信息接口
export interface TestInfo {
    testId: string
    name: string
    startTime: number
    endTime?: number
    steps: Step[]
    errors: string[]
    status: string
}

export interface TestInfoImplParams {
    name: string
}