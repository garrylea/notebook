/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

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
