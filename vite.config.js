import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages ではリポジトリ名のパス配下で公開されるため、ワークフローから BASE_PATH を渡す
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  build: {
    rolldownOptions: {
      // 既存の学習アプリ（/）と、別アプリの着眼点トレーナー（/thinking/）
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        thinking: resolve(import.meta.dirname, 'thinking/index.html'),
      },
    },
  },
})
