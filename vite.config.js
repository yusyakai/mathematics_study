import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages ではリポジトリ名のパス配下で公開されるため、ワークフローから BASE_PATH を渡す
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
})
