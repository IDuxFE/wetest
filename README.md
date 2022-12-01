# wetest

## 工具使用场景/边界

> wetest当前能力致力于解决业务绝大部分基础场景的无代码自动化测试（80%场景），未来wetest将进一步深度开发，以达到90%以上的业务场景支持度

### 场景支持度


| 场景     |  支持度  |
| :------- | :------: |
| 表格场景 |   支持   |
| 表单场景 |   支持   |
| 多标签页 |   支持   |
| 静态页面 |   支持   |
| 画布场景 | 暂不支持 |

### 事件支持度


| 事件        |  支持度  |   未来计划   |
| :---------- | :------: | :----------: |
| click       |   支持   |      -      |
| auxclick    |   支持   |      -      |
| hover       |   支持   |      -      |
| input       |   支持   |      -      |
| keydown     |   支持   |      -      |
| dragAndDrop | 暂不支持 | 下个迭代支持 |
| dbclick     | 暂不支持 | 下个迭代支持 |

### 断言支持度


| 断言     |  支持度  |   未来计划   |
| :------- | :------: | :----------: |
| 元素快照 |   支持   |      -      |
| 元素截图 |   支持   |      -      |
| url断言  |   支持   |      -      |
| 全屏截图 |   支持   |      -      |
| 相反断言 | 暂不支持 | 下个迭代支持 |
| 文本断言 | 暂不支持 | 下个迭代支持 |

## 环境要求

- **node > 16.18.0**

## 工具使用者准备工作（user）

```shell
npm i -g playwright

```

```shell
npm i -g @wetest/wetest

```

## 工具开发者准备工作（developer）

```shell
npm i -g pnpm

pnpm install

pnpm build

pnpm dev

cd packages/cli

pnpm link -g
```

## 开始（user and developer）

### 编写工具配置.wetest.js：

通过wetest init 命令生成wetest初始配置，配置说明如下：

```shell
wetest init
```

```javascript
{
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
            excludeAttr: /(id-.*)/,

            // 排除指定内容的id，例如id="id-xxx"的ID不会作为有效选择器
            excludeIdByVal: /(id-.*)/
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
        abortUrl: /(.*sentry_key.*|.*matomo.*)/
    }
}
```

> .wetest.js放置在执行wetest命令根目录下，通过-c 参数指定位置

### 录制用例

**输入启动录制命令：wetest record [pageURL] -o [caseDir] -c [.wetest.jsDir]**

> 解释：为要打开的页面，caseDir为录制的用例存放目录

> [pageURL] 需要打开进行录制的页面

> -o [caseDir] 录制的用例输出存放目录

> -c [.wetest.jsDir] 工具配置文件的存放位置，一般在命令执行根目录新建.wetest.js文件

> 录制命令其他参数：

> -b [browser] 启动录制的浏览器，当前支持chrome、firefox、webkit

> -c [.wetest.jsDir] 工具配置文件.wetest.js的存放位置

> 例子：wetest record https://github.com -o tests -c .wetest.js

### 自动回归用例：

**输入启动录制命令：wetest run [caseDir] -c [.wetest.jsDir]**

> 解释：

> [caseDir]为录制的用例存放目录

> -c [.wetest.jsDir] 工具配置文件的存放位置，一般在命令执行根目录新建.wetest.js文件

> 回放命令其他参数：

> -hl [headless] 是否启动无头浏览器执行用例

> -fb [fileGlob] flob语法筛选回放制定的目录用例

> -ai [action-interval] 设置每个回放动作的间隔时间

> 例子：wetest run tests -c .wetest.js -hl

### 错误报告：

wetest执行完自动化用例后，会在__reporter__生成错误报告（单页web应用），需要在__reporter__下启动服务查看（可用http-server包启动服务）
报告包含了所有自动化用例的执行情况，包括：用例报告、错误报告、用例每一步的执行情况，强烈推荐使用报告中的**快速定位错误**功能

## developer

### 如何调试

- 对于wetest工具层面层面的调试，在开启pnpm dev后（当然是已经pnpm link -g过了），强烈推荐使用visual studio code中terminal的JavaScript Debug terminal断点调试
- 对于自动化报告应用，是独立的Vue单页应用，按照Vue应用调试即可，需要注意的是，自动化报告应用在构建后会复制到@wetest/wetest上，每次执行完用例后注入报告数据，所以如果报告应用要结合报告数据调试的话，目前只能执行完用例后在__reporter__上启动web服务查看，这点确实比较麻烦一些

### 项目结构介绍

#### cli

提供命令行工具，引用了engine的代码

#### engine

基于playwright二次封装，提供录制和回归的功能

```
│  assertor.ts // 断言器
│  browserManager.ts // 浏览器管理，管理page和context
│  caseManager.ts // 用例管理器
│  mockProxy.ts // 数据代理器
│  recorder.ts // 录制器
│  runner.ts // 回归器
```

#### inject

提供工具栏和事件监听等功能，engine通过playwright的api引入，在启动record时，注入inject代码，挂载工具栏和事件监听

#### ai-selector

元素选择器，用于定位操作的元素，执行无埋点生成选择器，当然有埋点更佳，维护性会更好一些

#### share

公共的东西

#### web

wetest报告源码
