/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = parseInt(env.VITE_PORT || process.env.PORT || '5173', 10);
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3000';

  return {
    plugins: [react()],

    server: {
      https: {
        key: fs.readFileSync(path.resolve(__dirname, 'server.key')),
        cert: fs.readFileSync(path.resolve(__dirname, 'server.cert')),
      },
      host: true,
      port: port,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiTarget,
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
      port: port,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiTarget,
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
  };
});
