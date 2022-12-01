import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs'
import path from 'path'

/**
 *创建目录
 *
 * @export
 * @param {(string | string[])} paths
 */
export function createDir(paths: string | string[]) {
  if (typeof paths === 'string') {
    paths = [paths]
  }
  paths.forEach(path => {
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true })
    }
  })
}

/**
 * 刪除目录
 *
 * @export
 * @param {(string | string[])} paths
 */
export function rmDir(paths: string | string[]) {
  if (typeof paths === 'string') {
    paths = [paths]
  }
  paths.forEach(path => {
    if (existsSync(path)) {

      // 这里存在报错文件的时候，会删除失败
      rmSync(path, {recursive: true})
    }
  })
}

/**
 * 写入json文件
 *
 * @export
 * @param {Record<string, any>} json
 * @param {string} output
 */
export function writeJson(json: Record<string, any>, output: string) {
  createDir(path.dirname(output))
  writeFileSync(output, JSON.stringify(json, null, 2), { encoding: 'utf-8' })
}

/**
 * 读取json文件内容
 *
 * @export
 * @template T
 * @param {string} path
 * @returns {*}  {T}
 */
export function readJson<T extends Record<string, any>>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8'))
}

/**
 * 向文件追加内容
 *
 * @export
 * @param {string} output
 * @param {string} content
 */
export function appendFile(output: string, content: string): void {
  createDir(path.dirname(output))
  if (existsSync(output)) {
    appendFileSync(output, content, 'utf-8')
  } else {
    writeFileSync(output, content, { flag: 'a+' })
  }
}

/**
 * 获取快照内容
 *
 * @export
 * @param {string} snapshotPath
 * @returns {*}  {Record<string, string>}
 */
export function getSnapshotData(snapshotPath: string): Record<string, string> {
  const data = Object.create(null)
  let snapshotContents = ''

  if (existsSync(snapshotPath)) {
    snapshotContents = readFileSync(snapshotPath, 'utf8')
    const populate = new Function('exports', snapshotContents)
    populate(data)
  }

  return data
}
