// vite.config.ts
import { defineConfig } from "file:///C:/Users/86137/Desktop/xm/pet/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/86137/Desktop/xm/pet/frontend/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";
import { visualizer } from "file:///C:/Users/86137/Desktop/xm/pet/frontend/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import { VitePWA } from "file:///C:/Users/86137/Desktop/xm/pet/frontend/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\86137\\Desktop\\xm\\pet\\frontend";
var vite_config_default = defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // PWA配置
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "\u5BA0\u7269\u5065\u5EB7\u76D1\u6D4B\u793E\u533A\u5E73\u53F0",
        short_name: "\u5BA0\u7269\u5065\u5EB7",
        description: "\u4E13\u4E1A\u7684\u5BA0\u7269\u5065\u5EB7\u76D1\u6D4B\u548C\u793E\u533A\u4EA4\u6D41\u5E73\u53F0\uFF0C\u901A\u8FC7AI\u5206\u6790\u5E2E\u52A9\u60A8\u4E86\u89E3\u5BA0\u7269\u5065\u5EB7\u72B6\u51B5",
        theme_color: "#f97316",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300
                // 5分钟
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 86400
                // 1天
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
    ...mode === "analyze" ? [
      visualizer({
        filename: "dist/stats.html",
        open: true,
        gzipSize: true,
        brotliSize: true
      })
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      "@/components": path.resolve(__vite_injected_original_dirname, "./src/components"),
      "@/pages": path.resolve(__vite_injected_original_dirname, "./src/pages"),
      "@/hooks": path.resolve(__vite_injected_original_dirname, "./src/hooks"),
      "@/services": path.resolve(__vite_injected_original_dirname, "./src/services"),
      "@/utils": path.resolve(__vite_injected_original_dirname, "./src/utils"),
      "@/types": path.resolve(__vite_injected_original_dirname, "./src/types")
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
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
          "react-vendor": ["react", "react-dom"],
          // 将路由相关库分离
          "router": ["react-router-dom"],
          // 将UI组件库分离
          "ui-vendor": ["lucide-react"],
          // 将工具库分离
          "utils": ["axios", "date-fns"]
        },
        // 为chunk文件添加hash
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          var _a;
          const info = ((_a = assetInfo.name) == null ? void 0 : _a.split(".")) || [];
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name || "")) {
            return `assets/images/[name]-[hash].${ext}`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || "")) {
            return `assets/fonts/[name]-[hash].${ext}`;
          }
          return `assets/[ext]/[name]-[hash].${ext}`;
        }
      }
    },
    // 启用压缩
    minify: "terser",
    terserOptions: {
      compress: {
        // 移除console.log
        drop_console: true,
        // 移除debugger
        drop_debugger: true
      }
    },
    // 生成source map用于调试
    sourcemap: false,
    // 设置chunk大小警告限制
    chunkSizeWarningLimit: 1e3,
    // 启用CSS代码分割
    cssCodeSplit: true
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "axios",
      "lucide-react"
    ],
    exclude: ["@vite/client", "@vite/env"]
  },
  // 启用esbuild优化
  esbuild: {
    // 移除生产环境的console和debugger
    drop: ["console", "debugger"]
  },
  // 测试配置
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFw4NjEzN1xcXFxEZXNrdG9wXFxcXHhtXFxcXHBldFxcXFxmcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcODYxMzdcXFxcRGVza3RvcFxcXFx4bVxcXFxwZXRcXFxcZnJvbnRlbmRcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzLzg2MTM3L0Rlc2t0b3AveG0vcGV0L2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7Ly8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ2aXRlc3RcIiAvPlxyXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXHJcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXHJcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInXHJcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnXHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgICAvLyBQV0FcdTkxNERcdTdGNkVcclxuICAgIFZpdGVQV0Eoe1xyXG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcclxuICAgICAgaW5jbHVkZUFzc2V0czogWydmYXZpY29uLmljbycsICdhcHBsZS10b3VjaC1pY29uLnBuZyddLFxyXG4gICAgICBtYW5pZmVzdDoge1xyXG4gICAgICAgIG5hbWU6ICdcdTVCQTBcdTcyNjlcdTUwNjVcdTVFQjdcdTc2RDFcdTZENEJcdTc5M0VcdTUzM0FcdTVFNzNcdTUzRjAnLFxyXG4gICAgICAgIHNob3J0X25hbWU6ICdcdTVCQTBcdTcyNjlcdTUwNjVcdTVFQjcnLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnXHU0RTEzXHU0RTFBXHU3Njg0XHU1QkEwXHU3MjY5XHU1MDY1XHU1RUI3XHU3NkQxXHU2RDRCXHU1NDhDXHU3OTNFXHU1MzNBXHU0RUE0XHU2RDQxXHU1RTczXHU1M0YwXHVGRjBDXHU5MDFBXHU4RkM3QUlcdTUyMDZcdTY3OTBcdTVFMkVcdTUyQTlcdTYwQThcdTRFODZcdTg5RTNcdTVCQTBcdTcyNjlcdTUwNjVcdTVFQjdcdTcyQjZcdTUxQjUnLFxyXG4gICAgICAgIHRoZW1lX2NvbG9yOiAnI2Y5NzMxNicsXHJcbiAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogJyNmZmZmZmYnLFxyXG4gICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcclxuICAgICAgICBvcmllbnRhdGlvbjogJ3BvcnRyYWl0JyxcclxuICAgICAgICBzY29wZTogJy8nLFxyXG4gICAgICAgIHN0YXJ0X3VybDogJy8nLFxyXG4gICAgICAgIGljb25zOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJ3B3YS0xOTJ4MTkyLnBuZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXHJcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6ICdwd2EtNTEyeDUxMi5wbmcnLFxyXG4gICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxyXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF1cclxuICAgICAgfSxcclxuICAgICAgd29ya2JveDoge1xyXG4gICAgICAgIGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2Z30nXSxcclxuICAgICAgICBydW50aW1lQ2FjaGluZzogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXlxcL2FwaVxcLy8sXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdOZXR3b3JrRmlyc3QnLFxyXG4gICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnYXBpLWNhY2hlJyxcclxuICAgICAgICAgICAgICBuZXR3b3JrVGltZW91dFNlY29uZHM6IDMsXHJcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogNTAsXHJcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiAzMDAgLy8gNVx1NTIwNlx1OTQ5RlxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdXJsUGF0dGVybjogL1xcLig/OnBuZ3xqcGd8anBlZ3xzdmd8Z2lmfHdlYnApJC8sXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcclxuICAgICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ2ltYWdlcy1jYWNoZScsXHJcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogMTAwLFxyXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogODY0MDAgLy8gMVx1NTkyOVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF1cclxuICAgICAgfSxcclxuICAgICAgZGV2T3B0aW9uczoge1xyXG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlXHJcbiAgICAgIH1cclxuICAgIH0pLFxyXG4gICAgLy8gXHU1M0VBXHU1NzI4XHU1MjA2XHU2NzkwXHU2QTIxXHU1RjBGXHU0RTBCXHU1NDJGXHU3NTI4YnVuZGxlXHU1MjA2XHU2NzkwXHU1NjY4XHJcbiAgICAuLi4obW9kZSA9PT0gJ2FuYWx5emUnID8gW1xyXG4gICAgICB2aXN1YWxpemVyKHtcclxuICAgICAgICBmaWxlbmFtZTogJ2Rpc3Qvc3RhdHMuaHRtbCcsXHJcbiAgICAgICAgb3BlbjogdHJ1ZSxcclxuICAgICAgICBnemlwU2l6ZTogdHJ1ZSxcclxuICAgICAgICBicm90bGlTaXplOiB0cnVlLFxyXG4gICAgICB9KVxyXG4gICAgXSA6IFtdKVxyXG4gIF0sXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcclxuICAgICAgJ0AvY29tcG9uZW50cyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9jb21wb25lbnRzJyksXHJcbiAgICAgICdAL3BhZ2VzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3BhZ2VzJyksXHJcbiAgICAgICdAL2hvb2tzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2hvb2tzJyksXHJcbiAgICAgICdAL3NlcnZpY2VzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3NlcnZpY2VzJyksXHJcbiAgICAgICdAL3V0aWxzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3V0aWxzJyksXHJcbiAgICAgICdAL3R5cGVzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3R5cGVzJyksXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiA1MTczLFxyXG4gICAgaG9zdDogdHJ1ZSxcclxuICAgIHByb3h5OiB7XHJcbiAgICAgICcvYXBpJzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCcsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICAvLyBcdTU0MkZcdTc1MjhcdTRFRTNcdTc4MDFcdTUyMDZcdTUyNzJcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgLy8gXHU2MjRCXHU1MkE4XHU1MjA2XHU1MjcyXHU0RUUzXHU3ODAxXHU1NzU3XHJcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XHJcbiAgICAgICAgICAvLyBcdTVDMDZSZWFjdFx1NzZGOFx1NTE3M1x1NUU5M1x1NTIwNlx1NzlCQlx1NTIzMFx1NTM1NVx1NzJFQ1x1NzY4NGNodW5rXHJcbiAgICAgICAgICAncmVhY3QtdmVuZG9yJzogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcclxuICAgICAgICAgIC8vIFx1NUMwNlx1OERFRlx1NzUzMVx1NzZGOFx1NTE3M1x1NUU5M1x1NTIwNlx1NzlCQlxyXG4gICAgICAgICAgJ3JvdXRlcic6IFsncmVhY3Qtcm91dGVyLWRvbSddLFxyXG4gICAgICAgICAgLy8gXHU1QzA2VUlcdTdFQzRcdTRFRjZcdTVFOTNcdTUyMDZcdTc5QkJcclxuICAgICAgICAgICd1aS12ZW5kb3InOiBbJ2x1Y2lkZS1yZWFjdCddLFxyXG4gICAgICAgICAgLy8gXHU1QzA2XHU1REU1XHU1MTc3XHU1RTkzXHU1MjA2XHU3OUJCXHJcbiAgICAgICAgICAndXRpbHMnOiBbJ2F4aW9zJywgJ2RhdGUtZm5zJ10sXHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyBcdTRFM0FjaHVua1x1NjU4N1x1NEVGNlx1NkRGQlx1NTJBMGhhc2hcclxuICAgICAgICBjaHVua0ZpbGVOYW1lczogJ2Fzc2V0cy9qcy9bbmFtZV0tW2hhc2hdLmpzJyxcclxuICAgICAgICBlbnRyeUZpbGVOYW1lczogJ2Fzc2V0cy9qcy9bbmFtZV0tW2hhc2hdLmpzJyxcclxuICAgICAgICBhc3NldEZpbGVOYW1lczogKGFzc2V0SW5mbykgPT4ge1xyXG4gICAgICAgICAgY29uc3QgaW5mbyA9IGFzc2V0SW5mby5uYW1lPy5zcGxpdCgnLicpIHx8IFtdO1xyXG4gICAgICAgICAgY29uc3QgZXh0ID0gaW5mb1tpbmZvLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgaWYgKC9cXC4ocG5nfGpwZT9nfGdpZnxzdmd8d2VicHxpY28pJC9pLnRlc3QoYXNzZXRJbmZvLm5hbWUgfHwgJycpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBgYXNzZXRzL2ltYWdlcy9bbmFtZV0tW2hhc2hdLiR7ZXh0fWA7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoL1xcLih3b2ZmMj98ZW90fHR0ZnxvdGYpJC9pLnRlc3QoYXNzZXRJbmZvLm5hbWUgfHwgJycpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBgYXNzZXRzL2ZvbnRzL1tuYW1lXS1baGFzaF0uJHtleHR9YDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiBgYXNzZXRzL1tleHRdL1tuYW1lXS1baGFzaF0uJHtleHR9YDtcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIC8vIFx1NTQyRlx1NzUyOFx1NTM4Qlx1N0YyOVxyXG4gICAgbWluaWZ5OiAndGVyc2VyJyxcclxuICAgIHRlcnNlck9wdGlvbnM6IHtcclxuICAgICAgY29tcHJlc3M6IHtcclxuICAgICAgICAvLyBcdTc5RkJcdTk2NjRjb25zb2xlLmxvZ1xyXG4gICAgICAgIGRyb3BfY29uc29sZTogdHJ1ZSxcclxuICAgICAgICAvLyBcdTc5RkJcdTk2NjRkZWJ1Z2dlclxyXG4gICAgICAgIGRyb3BfZGVidWdnZXI6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgLy8gXHU3NTFGXHU2MjEwc291cmNlIG1hcFx1NzUyOFx1NEU4RVx1OEMwM1x1OEJENVxyXG4gICAgc291cmNlbWFwOiBmYWxzZSxcclxuICAgIC8vIFx1OEJCRVx1N0Y2RWNodW5rXHU1OTI3XHU1QzBGXHU4QjY2XHU1NDRBXHU5NjUwXHU1MjM2XHJcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXHJcbiAgICAvLyBcdTU0MkZcdTc1MjhDU1NcdTRFRTNcdTc4MDFcdTUyMDZcdTUyNzJcclxuICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcclxuICB9LFxyXG4gIC8vIFx1NEYxOFx1NTMxNlx1NEY5RFx1OEQ1Nlx1OTg4NFx1Njc4NFx1NUVGQVxyXG4gIG9wdGltaXplRGVwczoge1xyXG4gICAgaW5jbHVkZTogW1xyXG4gICAgICAncmVhY3QnLFxyXG4gICAgICAncmVhY3QtZG9tJyxcclxuICAgICAgJ3JlYWN0LXJvdXRlci1kb20nLFxyXG4gICAgICAnYXhpb3MnLFxyXG4gICAgICAnbHVjaWRlLXJlYWN0JyxcclxuICAgIF0sXHJcbiAgICBleGNsdWRlOiBbJ0B2aXRlL2NsaWVudCcsICdAdml0ZS9lbnYnXSxcclxuICB9LFxyXG4gIC8vIFx1NTQyRlx1NzUyOGVzYnVpbGRcdTRGMThcdTUzMTZcclxuICBlc2J1aWxkOiB7XHJcbiAgICAvLyBcdTc5RkJcdTk2NjRcdTc1MUZcdTRFQTdcdTczQUZcdTU4ODNcdTc2ODRjb25zb2xlXHU1NDhDZGVidWdnZXJcclxuICAgIGRyb3A6IFsnY29uc29sZScsICdkZWJ1Z2dlciddLFxyXG4gIH0sXHJcbiAgLy8gXHU2RDRCXHU4QkQ1XHU5MTREXHU3RjZFXHJcbiAgdGVzdDoge1xyXG4gICAgZ2xvYmFsczogdHJ1ZSxcclxuICAgIGVudmlyb25tZW50OiAnanNkb20nLFxyXG4gICAgc2V0dXBGaWxlczogWycuL3NyYy90ZXN0L3NldHVwLnRzJ10sXHJcbiAgICBjc3M6IHRydWVcclxuICB9XHJcbn0pKSJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsa0JBQWtCO0FBQzNCLFNBQVMsZUFBZTtBQUx4QixJ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
