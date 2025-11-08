import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  return {
    root: path.resolve(__dirname, 'web'),
    base: './',
    publicDir: path.resolve(__dirname, 'images'), // 将images目录作为public目录
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      assetsDir: 'assets',
      copyPublicDir: true
    },
    server: {
      port: 5173,
      open: true
    }
  }
})


