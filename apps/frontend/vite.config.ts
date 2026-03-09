/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'server.key')),
      cert: fs.readFileSync(path.resolve(__dirname, 'server.cert')),
    },
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  preview: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'server.key')),
      cert: fs.readFileSync(path.resolve(__dirname, 'server.cert')),
    },
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },

  build: {
    // Warn if a chunk exceeds 800 kB
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime in its own chunk (stable, long-cacheable)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Ant Design is large — isolate it
          'vendor-antd': ['antd', '@ant-design/icons'],
          // ECharts is very large — lazy-loaded only on the Stats page
          'vendor-echarts': ['echarts', 'echarts-for-react'],
          // State management & HTTP
          'vendor-utils': ['zustand', 'axios', 'dayjs'],
        }
      }
    }
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
