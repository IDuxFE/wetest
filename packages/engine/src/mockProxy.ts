import { Request, Page, Response, BrowserContext } from 'playwright'
import crypto from 'crypto'
import { readJson, writeJson } from './utils/fs'
import { get, set, last, merge } from 'lodash'
import qs from 'qs'
import { deleteDeep } from './utils/common'
import { CustomProxy } from './types'

interface ResponseInfo {
  status: number
  headers: Record<string, string>
  body: string
}

interface RequestInfo {
  method: string
  data?: string
  params?: string
  url: string
}

interface RequestPool {
  pages: {
    [pageId: string]: {
      [url: string]: {
        [requestHash: string]: string[]
      }
    }
  }
  responses: {
    [hash: string]: ResponseInfo
  }
  request: {
    [hash: string]: Omit<RequestInfo, 'url'>
  }
  customData: {
    [key: string]: any
  }
}

interface ProxyOptions {
  omitParams: RegExp | ((key: string, value: string) => boolean)
}

function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex')
}

/**
 * 获取删除了某些params的url
 *
 * @param {string} url
 * @param {ProxyOptions['omitParams']} omitParams
 * @returns {string}
 */
function parseUrl(
  url: string,
  omitParams: ProxyOptions['omitParams'],
): {
  url: string
  params: Record<string, any>
} {
  let [realUrl, urlParamsText] = url.split('?')
  const urlParams = deleteDeep(urlParamsText ? qs.parse(urlParamsText) : {}, omitParams)

  return {
    url: realUrl,
    params: urlParams,
  }
}

/**
 * 获取删除了某些params的postData
 *
 * @param {string} data
 * @param {ProxyOptions['omitParams']} omitParams
 * @returns {string}
 */
function getPostDataAfterOmit(data: string, omitParams: ProxyOptions['omitParams']): string {
  let res = data
  try {
    res = JSON.stringify(deleteDeep(JSON.parse(data), omitParams))
  } catch (error) {
    error
  }
  return res
}

function getRequestInfo(request: Request, omitParams: ProxyOptions['omitParams']): RequestInfo {
  const method = request.method()
  const urlParsed = parseUrl(request.url(), omitParams)

  return {
    url: urlParsed.url,
    method,
    params: JSON.stringify(urlParsed.params),
    data: getPostDataAfterOmit(request.postData() ?? '', omitParams),
  }
}

async function getResponseInfo(response: Response): Promise<ResponseInfo> {
  return {
    status: response.status(),
    headers: await response.allHeaders(),
    body: await response.text(),
  }
}

export class MockProxy {
  requestPool: RequestPool = {
    pages: {},
    responses: {},
    request: {},
    customData: {},
  }

  monitoring = false

  options: ProxyOptions = {
    omitParams: () => false,
  }

  constructor(options?: Partial<ProxyOptions>) {
    merge(this.options, options)
  }

  startMonitoring() {
    this.monitoring = true
  }

  addCustomProxy(context: BrowserContext, proxy: CustomProxy) {
    proxy(this).forEach(args => context.route(...args))
  }

  /**
   * 监听page，记录接口数据
   *
   * @param {Page} page
   * @param {string} pageId
   * @memberof MockProxy
   */
  monitorPage(page: Page, pageId: string) {
    page.on('response', async res => {
      if (!this.monitoring) {
        return
      }

      // 只拦截json的请求
      if (res.request().resourceType() === 'xhr') {
        console.log(`[MockProxy] 监听中 page[${pageId}], url[${res.url()}]`)
        const resName = await this.storeResponse(res)
        this.storeRequest(res.request(), resName, pageId)
      }
    })
  }

  /**
   * 代理page，伪造接口数据
   * TODO:需要考虑接口循环的场景怎么处理
   *
   * @param {{
   *     page: Page
   *     pageId: string
   *     origin: string 接口的origin
   *     originCurrent: string 当前接口环境的origin
   *   }} {
   *     page,
   *     pageId,
   *     origin,
   *     originReplace,
   *   }
   * @memberof MockProxy
   */
  proxyPage({
    page,
    pageId,
    origin,
    originCurrent,
  }: {
    page: Page
    pageId: string
    origin?: string
    originCurrent?: string
  }) {
    const urlPool = this.requestPool.pages[pageId]

    if (!urlPool) return
    Object.entries(urlPool).map(([url, requestContent]) => {
      let index = 0
      let urlCurrent = origin && originCurrent ? url.replace(origin, originCurrent) : url
      page.route(new RegExp(`${urlCurrent}($|\\?)`), (route, request) => {
        // eslint-disable-next-line no-unused-vars
        const { url: _, ...requestInfo } = getRequestInfo(request, this.options.omitParams)
        const requestHash = md5(JSON.stringify(requestInfo))
        const responseHash = requestContent[requestHash]?.[index++] ?? last(requestContent[requestHash])
        const response = this.requestPool.responses[responseHash]

        if (response) {
          route.fulfill(response)
        } else {
          route.continue()
        }
        console.log(
          `[MockProxy] 代理${response ? '成功' : '失败'}！page[${pageId}], url[${url}], requestHash[${requestHash}]`,
        )
      })
    })
  }

  /**
   * 存储请求信息
   *
   * @param {Request} request
   * @param {string} responseHash
   * @param {string} pageId
   * @memberof MockProxy
   */
  async storeRequest(request: Request, responseHash: string, pageId: string) {
    const { url, ...requestInfo } = getRequestInfo(request, this.options.omitParams)
    const requestHash = md5(JSON.stringify(requestInfo))

    this.requestPool.request[requestHash] = requestInfo

    const path = [pageId, url, requestHash]
    const requestPool: string[] = get(this.requestPool.pages, path)
    if (!requestPool) {
      set(this.requestPool.pages, path, [responseHash])
    } else {
      requestPool.push(responseHash)
    }
  }

  /**
   * 存储响应信息
   *
   * @param {Response} response
   * @returns {Promise<string>}
   * @memberof MockProxy
   */
  async storeResponse(response: Response): Promise<string> {
    const resInfo = await getResponseInfo(response)
    const hash = md5(JSON.stringify(resInfo))
    this.requestPool.responses[hash] = resInfo
    return hash
  }

  save(output: string) {
    writeJson(this.requestPool, output)
  }

  load(file: string) {
    this.requestPool = readJson(file)
  }

  reset() {
    this.requestPool = {
      pages: {},
      responses: {},
      request: {},
      customData: {},
    }
    this.monitoring = false
  }
}
