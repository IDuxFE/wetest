import { BrowserContext } from 'playwright'

export async function useTraceStart(context: BrowserContext, option = {}) {
    return await context.tracing.start(option);
}

export async function useTracestop(context: BrowserContext, saveTracPath: string) {
    if (saveTracPath) {
        return await context.tracing.stop({path: saveTracPath});
    }

    return Promise.resolve()
}