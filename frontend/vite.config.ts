/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // PWA配置
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: '宠物健康监测社区平台',
        short_name: '宠物健康',
        description: '专业的宠物健康监测和社区交流平台，通过AI分析帮助您了解宠物健康状况',
        theme_color: '#f97316',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300 // 5分钟
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 86400 // 1天
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    }),
    // 只在分析模式下启用bundle分析器
    ...(mode === 'analyze' ? [
      visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      })
    ] : [])
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    // 启用代码分割
    rollupOptions: {
      output: {
        // 手动分割代码块
        manualChunks: {
          // 将React相关库分离到单独的chunk
          'react-vendor': ['react', 'react-dom'],
          // 将路由相关库分离
          'router': ['react-router-dom'],
          // 将UI组件库分离
          'ui-vendor': ['lucide-react'],
          // 将工具库分离
          'utils': ['axios', 'date-fns'],
        },
        // 为chunk文件添加hash
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name || '')) {
            return `assets/images/[name]-[hash].${ext}`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
            return `assets/fonts/[name]-[hash].${ext}`;
          }
          return `assets/[ext]/[name]-[hash].${ext}`;
        },
      },
    },
    // 启用压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        // 移除console.log
        drop_console: true,
        // 移除debugger
        drop_debugger: true,
      },
    },
    // 生成source map用于调试
    sourcemap: false,
    // 设置chunk大小警告限制
    chunkSizeWarningLimit: 1000,
    // 启用CSS代码分割
    cssCodeSplit: true,
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'lucide-react',
    ],
    exclude: ['@vite/client', '@vite/env'],
  },
  // 启用esbuild优化
  esbuild: {
    // 移除生产环境的console和debugger
    drop: ['console', 'debugger'],
  },
  // 测试配置
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true
  }
}))