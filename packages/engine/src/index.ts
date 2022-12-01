/**
 * TODO:
 * 1. 制定用例的标准数据结构，存储方式
 * 2. 录制任务：调用playwright，调起浏览器，拿到行为数据，转换成标准数据结构，传给外层
 * 3. 录制的时候，将请求的信息一同记录下来，便于用例重跑
 * 4. 测试任务：获取用例数据，转换成playwright需要的数据，重跑用例
 * 5. 可能要实现一个请求代理，重跑时需要对比请求参数等是否和用例一致，一致则需要将结果回传
 */

export * from './recorder'
export * from './runner'
export * from './caseManager'
export * from './mockProxy'

export * from './types'
