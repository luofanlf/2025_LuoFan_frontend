import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 配置代理解决跨域问题
    proxy: {
      // 将 /api 开头的请求代理到后端
      '/api': {
        target: 'http://localhost:8080', // 你的后端地址
        changeOrigin: true,              // 改变请求头中的origin
        secure: false,                   // 允许代理到HTTP服务器
        // rewrite: (path) => path.replace(/^\/api/, '') // 如果需要移除/api前缀
      }
    }
  }
})
