import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // ✅ MediaPipe ke liye zaroor add karein
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },

  // agar already server config hai to usme merge karein
  server: {
    proxy: {
      '/api': {
        target: 'http://your-erpnext-server.com', // apna ERPNext URL yahan
        changeOrigin: true,
      },
    },
  },
})