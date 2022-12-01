import { resolve } from 'path'
import replace from '@rollup/plugin-replace'
import { OutputOptions, Plugin } from 'rollup'
import postcss from 'rollup-plugin-postcss'

export type Format = 'es' | 'cjs' | 'iife' | 'amd'

export const packagesRoot = resolve(__dirname, '../../', 'packages')

export const buildConfigs: {
  [target: string]: {
    formats: (Format | { format: Format; output?: string })[]
    plugins?: Plugin[]
    output?: OutputOptions
  }
} = {
  cli: {
    formats: ['cjs'],
    output: {
      banner: '#!/usr/bin/env node',
    },
  },
  engine: {
    formats: ['es', 'cjs'],
  },
  inject: {
    formats: [
      {
        format: 'iife',
        output: resolve(packagesRoot, 'engine/inject/index.js'),
      },
    ],
    output: {
      banner: `document.addEventListener('DOMContentLoaded', function(){`,
      footer: `})`,
    },
    plugins: [
      styleInjectPlugin(),
      replace({
        preventAssignment: true,
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
    ],
  },
  marker: {
    formats: ['es', 'cjs'],
  },

  'ai-selector': {
    formats: ['es', 'cjs'],
  },

  'share': {
    formats: ['es', 'cjs'],
  }
}

/**
 * inject是iife，所以需要处理下，
 * 在DOMContentLoaded后再inject style
 *
 * @returns
 */
function styleInjectPlugin() {
  return postcss({
    extensions: ['.css', '.less'],
    // @ts-ignore
    use: [['less', { javascriptEnabled: true }]],
  })
}
