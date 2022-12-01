import { readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import * as fs from 'fs-extra'
import execa from 'execa'
import { OutputOptions, rollup, watch, RollupOptions } from 'rollup'
import chalk from 'chalk'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import filesize from 'rollup-plugin-filesize'
import typescript from 'rollup-plugin-typescript2'
import { buildConfigs, Format, packagesRoot } from './config'
// import flatDts from 'rollup-plugin-flat-dts'
// import { terser } from 'rollup-plugin-terser'
import json from '@rollup/plugin-json'
import Vue3JsxPlugin from '@vitejs/plugin-vue-jsx'

export function getAllTargets() {
  return readdirSync(packagesRoot).filter(
    target => statSync(resolve(packagesRoot, target)).isDirectory() && !getPkgContent(target)?.private,
  )
}

export function getPkgContent(target: string): Record<string, any> {
  return require(resolve(packagesRoot, target, 'package.json'))
}

export function getInputConfigs(target = '', config: RollupOptions = {}): RollupOptions {
  const pkgRoot = resolve(packagesRoot, target)
  const pkg = getPkgContent(target)
  const { plugins = [], ...others } = config
  return {
    input: resolve(pkgRoot, 'src/index.ts'),
    external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
    onwarn(warning) {
      // antd组件库会报this的错误
      if (warning.code === 'THIS_IS_UNDEFINED') {
        return
      }
    },
    plugins: [
      nodeResolve({
        extensions: ['.js', '.ts', '.tsx', '.vue', '.less', '.css'],
      }),
      json(),
      commonjs(),
      Vue3JsxPlugin(),
      typescript({
        tsconfig: resolve(__dirname, '../../tsconfig.json'),
        tsconfigOverride: {
          include: [`${pkgRoot}/src/**/*`],
        },
      }),
      ...(buildConfigs[target].plugins ?? []),
      ...plugins,
    ],
    ...others,
  }
}

export function getOutputConfigs(target = ''): OutputOptions[] {
  const pkg = getPkgContent(target)
  const defaultConfig: Record<Format, OutputOptions> = {
    es: {
      file: resolve(packagesRoot, target, pkg.module ?? pkg.exports ?? ''),
    },
    cjs: {
      file: resolve(packagesRoot, target, pkg.main ?? ''),
      exports: 'named',
    },
    iife: {
      file: resolve(packagesRoot, target, `dist/index.global.js`),
    },
    amd: {
      file: resolve(packagesRoot, target, `dist/index.amd.js`),
    },
  }
  return buildConfigs[target].formats.map(format => {
    let type = format as Format
    let output: string | undefined
    if (typeof format !== 'string') {
      type = format.format
      output = format.output
    }

    let config: OutputOptions = {
      format: type as Format,
      ...defaultConfig[type],
      ...buildConfigs[target].output,
    }

    if (output) {
      config.file = output
    }

    return config
  })
}

export async function build(target: string): Promise<void> {
  const inputConfigs = getInputConfigs(target, { plugins: [/*terser(),*/ filesize()] })
  const outputConfigs = getOutputConfigs(target)

  for (const { file } of outputConfigs) {
    file && (await fs.remove(file))
  }

  console.log(chalk.yellow(`building package:${target}`))
  const bundle = await rollup(inputConfigs)

  for (let outputConfig of outputConfigs) {
    await bundle.write(outputConfig as OutputOptions)
    console.log(chalk.green(`Success: ${(outputConfig as OutputOptions).file}`))
  }
}

export async function moveInject() {
  const originDir = join(packagesRoot, 'inject/dist')
  const targetDir = join(packagesRoot, 'engine/inject')

  console.log(chalk.yellow(`moving ${originDir} to ${targetDir}`))

  await execa('cp', ['-r', originDir, targetDir], {
    stdout: 'inherit',
  })
  console.log(chalk.green(`Success: moving inject`))
}

export async function develop(target: string) {
  const inputConfigs = getInputConfigs(target)
  const outputConfigs = getOutputConfigs(target).map(item => ({
    ...item,
    sourcemap: true,
  }))

  const watcher = watch({
    ...inputConfigs,
    output: outputConfigs,
  })
  watcher.on('event', event => {
    // event.code 会是下面其中一个：
    //   START        — 监听器正在启动（重启）
    //   BUNDLE_START — 构建单个文件束
    //   BUNDLE_END   — 完成文件束构建
    //   END          — 完成所有文件束构建
    //   ERROR        — 构建时遇到错误
    //   FATAL        — 遇到无可修复的错误
    switch (event.code) {
      case 'START':
        console.log(chalk.green(`watching: ${target}`))
        break
      case 'BUNDLE_START':
        console.log(chalk.yellow(`rebuilding: ${event.input}`))
        break
      case 'BUNDLE_END':
        event.output.forEach(path => {
          console.log(chalk.green(`rebuild success: ${path}`))
        })
        console.log(chalk.green(`rebuild cases ${event.duration}ms`))
        break
      case 'ERROR':
        console.log(chalk.red(event.error))
        break
    }
  })
}
