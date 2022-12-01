import { Page } from 'playwright'

/**
 * 请求管理
 */
export default class NetworkHelper {
    private _page: Page

    private _pendingRequests: Set<any>

    private resolveFn?: Function

    constructor(page: Page) {
        this._page = page;
        this._pendingRequests = new Set();

        this._initNetworkSettledListeners();
    }
   
    public waitForNetworkSettled() {
        return new Promise((resolve: Function) => {
            if (!this._pendingRequests.size) {
                resolve()
            } else {
                this.resolveFn = resolve
            }
        })
    }
    private _initNetworkSettledListeners() {
        this._page.on('request', request => {

            // todo 这里应该可以去掉了  在runner加了请求abort
            if ((request.url().includes('sentry_key') || request.url().includes('productVersion'))) {
                return 
            }

            this._pendingRequests.add(request)
        });
        this._page.on('requestfailed', request => {
            this._pendingRequests.delete(request)
            if (!this._pendingRequests.size && this.resolveFn) {
                this.resolveFn()
            }
        });
        this._page.on('requestfinished', request => {
            this._pendingRequests.delete(request)
            if (!this._pendingRequests.size && this.resolveFn) {
                this.resolveFn()
            }
        })
    }
}