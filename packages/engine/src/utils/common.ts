import { chromium, firefox, webkit, PageScreenshotOptions, Page, BrowserType } from 'playwright'
import { BrowserName } from '../types'
import pretty from 'pretty'
import PageSelector from './pageSelector'
import { SelectorInfo } from '@idux/wetest-ai-selector'
import { Log } from './log'

export function getBrowser(browser: BrowserName): BrowserType {
  return {
    chromium,
    firefox,
    webkit,
  }[browser]
}

/**
 * 截图工具
 *
 * @export
 * @param {Page} page
 * @param {{
 *     path: string
 *     selector?: string
 *   }} options
 */
export async function screenshot(
  page: Page,
  options: {
    path: string
    selector?: string
  },
) {
  const screenshotParams: PageScreenshotOptions = {}
  if (options.selector) {
    const boudingRect = await page.locator(options.selector).boundingBox()
    if (boudingRect) {
      screenshotParams.clip = boudingRect
    }
  }
  // FIXME:odiff暂时不支持buffer对比和输出，官方近期会开始支持，这里先直接生成图片
  await page.screenshot({
    path: options.path,
    ...screenshotParams,
  })
}

/**
 * 获取
 *
 * @export
 * @param {Page} page
 * @param {{
 *     path: string
 *     selector: string
 *     filter?: (snap: string) => string
 *   }} {
 *     path,
 *     selector,
 *     filter = str => str,
 *   }
 */
export async function getSnapshot(
  page: Page,
  {
    selector,
    filter = str => str,
  }: {
    selector: string
    filter?: (snap: string) => string
  },
) {
  const snapshot = await page.locator(selector).evaluate(node => node.outerHTML)
  return filter(pretty(snapshot))
}

/**
 * 删除对象中符合条件的项
 *
 * FIXME: 后续需要优化，不然太多JSON操作了，性能受影响
 *
 * @export
 * @param {Record<string, any>} obj
 * @param {(key: string, value: any) => boolean} deleteFn
 * @returns {Record<string, any>}
 */
export function deleteDeep(
  obj: Record<string, any>,
  omitParams: RegExp | ((key: string, value: string) => boolean),
): Record<string, any> {
  const deleteFn = (key: string, val: any) => {
    if (omitParams instanceof RegExp) {
      return omitParams.test(key)
    }
    return omitParams(key, val)
  }
  return JSON.parse(
    JSON.stringify(obj, (key, value) => {
      if (deleteFn(key, value)) {
        return undefined
      }
      return value
    }),
  )
}

export function sleep(timeout?: number) {
  return new Promise(resolve => setTimeout(resolve, timeout))
}

export async function autoTrySelector(
  fn: Function,
  selectorInfo: SelectorInfo,
  page: Page,
  allowFirstSelectorEmpty = false,
) {
  let firstSelector = selectorInfo.firstSelector

  if (!firstSelector.length && !allowFirstSelectorEmpty) {
    const pageSelector = new PageSelector(selectorInfo, page)
    await pageSelector.generateFirstSelector()
    firstSelector = pageSelector.getFirstSelector()
  }

  if (!firstSelector.length) {
    throw new Error('[running]元素选择器缺失，请检查是否存在错误（改动引发）或者增加埋点属性后重新录制用例')
  }

  for (let i = 0; i < firstSelector.length; i++) {
    try {
      Log.runneSelectorLog(firstSelector[i], i + 1)
      const result = await fn(firstSelector[i])
      return result
    } catch (error) {
      if (i < firstSelector.length - 1) {
        continue
      }

      throw error
    }
  }
}
