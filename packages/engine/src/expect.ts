import expectLib from 'expect'
import { Step } from '../src'
import { getTestInfoImplState } from '@idux/wetest-share'
import type { Expect, MatcherState as JestMatcherState } from 'expect/build/types'

function createExpect(actual: unknown) {
  return new Proxy(expectLib(actual), {
    get(target: any, matcherName: any, receiver: any) {
      let matcher = Reflect.get(target, matcherName, receiver)

      return (...args: any[]) => {
        const step: Step = {
          stepId: `expect:api@expect: ${actual || ''}  ${matcherName}  ${args[0] || ''}`,
          startTime: Date.now(),
          title: `断言:api@expect: ${actual || ''}  ${matcherName}  ${args[0] || ''}`,
          status: 'pass',
        }

        const reportStepError = (error: Error) => {
          step.error = error.toString()
          step.status = 'fail'
        }

        try {
          matcher.call(target, ...args)
          step.endTime = Date.now()
        } catch (e: any) {
          reportStepError(e)
          throw e
        } finally {
          createTestInfoStep(step)
        }
      }
    },
  })
}

export const createTestInfoStep = (step: Step) => {
  const testInfoImpl = getTestInfoImplState()

  return testInfoImpl.addStep(step)
}

export const expect: Expect<JestMatcherState> = new Proxy(expectLib as any, {
  apply: function (target: any, thisArg: any, argumentsList: [actual: unknown]) {
    const [actual] = argumentsList
    return createExpect(actual)
  },
})
