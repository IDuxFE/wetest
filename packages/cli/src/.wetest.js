
module.exports = {
    recorder: {
        // selector相关的开放配置
        selector: {
            // 元素埋点标记，当不配置的该项的时候，使用wetest无埋点选择器
            buryingPoint: '',

            // 不作为选择器的class
            excludeClass: [],

            // 不作为选择器的包含以下修饰的class，例如xxxx_btn-hover
            excludeClassModify: /(-hover|active)/,

            // 不作为选择器的属性
            excludeAttr: /(id.*)/,

            // 排除指定内容的id，例如id="id-xxx"的ID不会作为有效选择器
            excludeIdByVal: /(id.*)/
        }
    },

    runner: {

        // 无头浏览器信息，可以增加firefox、webkit浏览器信息
        userAgent: {
            chromium: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36'
        },

        // 登录url，用来判断是否过期需要重登录
        loginUrl: 'https://github.com/login',

        // 不需要等待的请求，这列请求对业务没有影响，但对自动化执行可能会形成阻塞
        abortUrl: /(.*sentry_key.*|.*matomo.*)/,

        // 往系统中塞入自定义 cookies
        cookies: [],

        // 报告配置，新云图线上拨测提出需求
        reporter: {

            // 测试报告是否总是输出追踪栈，默认只是错误的用例输出
            alwaysShowTracing: false,

            // 测试报告的追踪栈是否包含图片（图片帧）
            tracingScreenshots: true
        }
    }
}
