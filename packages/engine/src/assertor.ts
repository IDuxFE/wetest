import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { Page, PageScreenshotOptions } from 'playwright'
import { expect, createTestInfoStep } from './expect'
import pretty from 'pretty'
import {
  Assertion,
  ScreenshotAssertion,
  SnapshotAssertion,
  UrlAssertion,
  VisibleAssertion,
  ValueAssertion,
  isCheckedAssertion,
} from './types'
import { readJson, createDir } from './utils/fs'
import { join } from 'path'
import chalk from 'chalk'
import { writeFileSync, readFileSync, copyFileSync, rmSync } from 'fs'
import { sleep } from './utils/common'
import { autoTrySelector } from './utils/common'
import { SelectorInfo } from '@wetest/ai-selector/types'

const createDOMPurify = require('dompurify')
const { JSDOM } = require('jsdom')

/**
 * 获取
 *
 * @export
 * @param {Page} page
 * @param {{
 *     path: string
 *     selectors: string[]
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
    selectorInfo,
    transfer = sanitizeSnapshot => sanitizeSnapshot,
  }: {
    selectorInfo: SelectorInfo
    transfer?: (snap: string, raw: string) => string
  },
) {
  const snapshot = await autoTrySelector(
    (selector: string) => page.locator(selector).evaluate(node => node.outerHTML),
    selectorInfo,
    page,
    true,
  )
  const rawSnapshot = pretty(snapshot)
  const window = new JSDOM('').window
  const DOMPurify = createDOMPurify(window)
  const sanitizeSnapshot = DOMPurify.sanitize(snapshot, {
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false,
  })
  return transfer(sanitizeSnapshot, rawSnapshot)
}

/**
 * 截图工具
 *
 * @export
 * @param {Page} page
 * @param {{
 *     path: string
 *     selectors?: string[]
 *   }} options
 */
async function screenshot(
  page: Page,
  options: {
    path: string
    selectorInfo?: SelectorInfo
  },
) {
  const screenshotParams: PageScreenshotOptions = {}
  if (options.selectorInfo) {
    const boudingRect = await autoTrySelector(
      (selector: string) => page.locator(selector).boundingBox(),
      options.selectorInfo,
      page,
      true,
    )
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

interface AssertorOptions {
  runtimeDir?: string
  snapshotFile: string
  screenshotsDir: string
  snapshotTransfer?: (snap: string, raw: string) => string
  origin?: {
    old: string
    new?: string
  }
}

export class Assertor {
  private options!: AssertorOptions
  snapshots: Record<string, string> = {}

  constructor(options: AssertorOptions) {
    this.options = options
  }

  /**
   * 加载本地的快照信息
   *
   * @memberof Assertor
   */
  loadSnapshots() {
    this.snapshots = readJson(this.options.snapshotFile)
  }

  /**
   * 断言
   *
   * @param {Assertion} assertion
   * @param {Page} page
   * @memberof Assertor
   */
  async assert(assertion: Assertion, page: Page) {
    switch (assertion.params.type) {
      case 'url':
        await this.runUrlAssertion(assertion as UrlAssertion, page)
        break
      case 'snapshot':
        await this.assertSnapshot(assertion as SnapshotAssertion, page)
        break
      case 'screenshot':
        await this.assertScreenshot(assertion as ScreenshotAssertion, page)
        break
    }
  }

  /**
   * 截图断言
   *
   * @param {ScreenshotAssertion} assertion
   * @param {Page} page
   * @memberof Assertor
   */
  async assertScreenshot(assertion: ScreenshotAssertion, page: Page) {
    await page.evaluate('window.__wetest_toggleShowToolbar(false)')
    await screenshot(page, {
      path: join(this.options.screenshotsDir, assertion.params.name),
      selectorInfo: assertion.params.selector,
    })
    await page.evaluate('window.__wetest_toggleShowToolbar(true)')
  }

  /**
   * 快照断言
   *
   * @param {SnapshotAssertion} assertion
   * @param {Page} page
   * @memberof Assertor
   */
  async assertSnapshot(assertion: SnapshotAssertion, page: Page) {
    const snapshot = await getSnapshot(page, {
      selectorInfo: assertion.params.selector,
      transfer: this.options.snapshotTransfer,
    })
    this.snapshots[assertion.params.name] = snapshot
  }

  /**
   * 执行断言
   *
   * @param {Assertion} assertion
   * @param {Page} page
   * @memberof Assertor
   */
  async runAssertion(assertion: Assertion, page: Page) {
    switch (assertion.params.type) {
      case 'url':
        await this.runUrlAssertion(assertion as UrlAssertion, page)
        break

      case 'visible':
        await this.runVisibleAssertion(assertion as VisibleAssertion, page)
        break

      case 'screenshot':
        // @XXX #15 等 1s 再断言，这里可以看下能不能优化下策略
        await sleep(1500)
        await this.runScreenshotAssertion(assertion as ScreenshotAssertion, page)
        break

      case 'snapshot':
        await this.runSnapshotAssertion(assertion as SnapshotAssertion, page)
        break

      case 'value':
        await this.runValueAssertion(assertion as ValueAssertion, page)
        break
      case 'isChecked':
        await this.runIsCheckedAssertion(assertion as isCheckedAssertion, page)
        break

      default:
        throw new Error('[Assertor] 不支持当前断言类型！')
    }
  }

  /**
   * 执行元素可见断言
   *
   * @param {VisibleAssertion} assertion
   * @param {Page} page
   * @memberof Assertor
   */
  async runVisibleAssertion(assertion: VisibleAssertion, page: Page) {
    const pageFn = async (selector: string) => {
      const result = await page.locator(selector).isVisible()
      expect(result).toBeTruthy()
    }
    await autoTrySelector(pageFn, assertion.params.selector, page, true)
  }

  /**
   * 执行url断言
   *
   * @param {UrlAssertion} assertion
   * @param {Page} page
   * @memberof Assertor
   */
  runUrlAssertion(assertion: UrlAssertion, page: Page) {
    const url = this.options.origin?.new
      ? assertion.params.url.replace(this.options.origin.old, this.options.origin.new)
      : assertion.params.url
    expect(page.url()).toBe(url)
  }

  /**
   * 执行截图断言
   *
   * @param {ScreenshotAssertion} assertion
   * @param {Page} page
   * @memberof Assertor
   */
  async runScreenshotAssertion(assertion: ScreenshotAssertion, page: Page) {
    const oldScreenshotPath = join(this.options.screenshotsDir, assertion.params.name)
    const newScreenshotPath = join(this.options.screenshotsDir, `new_${assertion.params.name}`)
    const diffScreenshotPath = join(this.options.screenshotsDir, `diff_${assertion.params.name}`)

    await screenshot(page, {
      path: newScreenshotPath,
      selectorInfo: assertion.params.selector,
    })

    const testStep = createTestInfoStep({
      stepId: `expect:api@expect: ${assertion.context || ''}  ${assertion.params.name}`,
      startTime: Date.now(),
      title: `断言:api@expect: ${assertion.context || ''}  ${assertion.params.name}`,
      status: 'pass',
    })

    const oldScreenshotPng = PNG.sync.read(readFileSync(oldScreenshotPath))
    const newScreenshotPng = PNG.sync.read(readFileSync(newScreenshotPath))
    const { width, height } = oldScreenshotPng
    const diff = new PNG({ width, height })

    // 对比后像素点差异数量值 1px = 1
    const pxDiffCount = pixelmatch(oldScreenshotPng.data, newScreenshotPng.data, diff.data, width, height, {
      threshold: 0.2, // 色彩比较的阈值，越低越精确，这里给个不太低的值，防止浏览器渲染有的时候字体虚化导致问题
    })

    if (pxDiffCount > 1) {
      // 对比不通过
      const errorDir = this.options.runtimeDir ?? process.cwd()
      createDir(errorDir)

      writeFileSync(diffScreenshotPath, PNG.sync.write(diff))
      copyFileSync(newScreenshotPath, join(errorDir, `new_${assertion.params.name}`))
      copyFileSync(diffScreenshotPath, join(errorDir, `diff_${assertion.params.name}`))
      rmSync(newScreenshotPath)
      rmSync(diffScreenshotPath)

      testStep.status = 'fail'
      testStep.error = `screenshot ${assertion.params.name} compare fail! See ${errorDir}`
      testStep.endTime = Date.now()
      throw new Error(chalk.red(`screenshot ${assertion.params.name} compare fail! See ${errorDir}`))
    } else {
      rmSync(newScreenshotPath)
      testStep.endTime = Date.now()
    }
  }

  /**
   * 执行快照断言
   *
   * @param {SnapshotAssertion} assertion
   * @param {Page} page
   * @param {string} expectSnap
   * @memberof Assertor
   */
  async runSnapshotAssertion(assertion: SnapshotAssertion, page: Page) {
    expect(
      await getSnapshot(page, {
        selectorInfo: assertion.params.selector,
        transfer: this.options.snapshotTransfer,
      }),
    ).toBe(this.snapshots[assertion.params.name])
  }

  /**
   * 执行快照断言
   *
   * @param {SnapshotAssertion} assertion
   * @param {Page} page
   * @param {string} expectSnap
   * @memberof Assertor
   */
  async runValueAssertion(assertion: ValueAssertion, page: Page) {
    expect(
      await autoTrySelector((selector: string) => page.inputValue(selector), assertion.params.selector, page),
    ).toBe(assertion.params.value)
  }
  /**
   * 执行isChecked断言
   *
   * @param {SnapshotAssertion} assertion
   * @param {Page} page
   * @param {string} expectSnap
   * @memberof Assertor
   */
  async runIsCheckedAssertion(assertion: isCheckedAssertion, page: Page) {
    expect(await autoTrySelector((selector: string) => page.isChecked(selector), assertion.params.selector, page)).toBe(
      assertion.params.checked,
    )
  }
}
