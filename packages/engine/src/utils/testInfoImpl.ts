import { Step, TestInfoImplParams, TestInfo, TestStatus } from '../types/testInfo'
import { getUuid } from './uuid'


export default class TestInfoImpl {
    private testId: string
    private name: string
    private startTime: number
    private endTime: number
    private steps: Step[] = []
    private errors: string[] = []
    private status: TestStatus = 'pass'

    constructor(params: TestInfoImplParams) {
        this.name = params.name
        this.startTime = this.endTime = Date.now()
        this.testId = `testid@${getUuid()}@${this.startTime}`
    }

    public addStep (step: Step) : Step {
        this.steps.push(step)
        return step
    }

    public complete (status: TestStatus) {
        this.status = status
        this.endTime = Date.now()
    }

    public getTestInfo () : TestInfo {
        this.procssData()

        return {
            testId: this.testId,
            name: this.name,
            startTime: this.startTime,
            endTime: this.endTime,
            errors: this.errors,
            steps: this.steps,
            status: this.status
        }
    }

    private procssData () {
        if (this.status === 'fail') {

            this.steps.forEach(step => {
                if (step.error) {
                    this.errors.push(step.error)
                }
            })
        }
    }
}