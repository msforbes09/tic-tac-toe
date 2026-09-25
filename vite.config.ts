/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

export default defineConfig({
  // Served from the root on Cloudflare Pages. BASE_PATH stays for hosting under a sub-path.
  base: process.env.BASE_PATH ?? '/',
  // The splash shows the version; it comes from package.json at build time.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Other sessions may park git worktrees under .claude/; their copies must not run here.
    exclude: [...configDefaults.exclude, '.claude/**'],
    css: false,
  },
})
