/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import type { Plugin } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

// @ts-ignore
import { contextPath, serverPort } from './src/main/vue/develop/devConf'

/** dev サーバーで index.html を index.spa.html に差し替える */
function spaHtmlPlugin(): Plugin {
  const spaHtml = readFileSync(resolve(__dirname, 'index.spa.html'), 'utf-8')
  return {
    name: 'spa-html',
    transformIndexHtml(html) {
      return spaHtml
    },
  }
}

export default defineConfig(({ mode, command }) => ({
  // 本番は ${staticContentPath}/km/assets/ 配下で配信されるため、CSS 内の
  // url()（同梱フォント等）をルート絶対 (/...) ではなく CSS からの相対にする。
  // dev serve はルート基準のままにする。
  base: command === 'build' ? './' : '/',
  plugins: [vue(), ...(command === 'serve' ? [spaHtmlPlugin()] : [])],
  resolve: {
    alias: [{ find: '@', replacement: resolve(__dirname, 'src/main/vue') }],
  },
  build: {
    outDir: 'src/main/webapp/km/assets',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/main/vue/main.ts'),
      output: {
        format: 'iife',
        entryFileNames: 'index.js',
        assetFileNames: '[name][extname]',
        manualChunks: undefined,
      },
    },
    sourcemap: mode === 'development',
    target: 'esnext',
    minify: mode === 'production' ? 'esbuild' : false,
    cssCodeSplit: false,
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      [contextPath]: {
        target: `http://localhost:${serverPort}`,
        changeOrigin: true,
        headers: {
          Origin: `http://localhost:${serverPort}`,
        },
      },
    },
  },
}))
