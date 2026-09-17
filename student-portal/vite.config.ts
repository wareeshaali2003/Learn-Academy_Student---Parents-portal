import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.VITE_ERP_BASE_URL': JSON.stringify(env.VITE_ERP_BASE_URL),
      'process.env.VITE_ERP_API_KEY': JSON.stringify(env.VITE_ERP_API_KEY),
      'process.env.VITE_ERP_API_SECRET': JSON.stringify(env.VITE_ERP_API_SECRET),
      'process.env.VITE_CLASSROOM_SERVER_URL': JSON.stringify(env.VITE_CLASSROOM_SERVER_URL),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      exclude: ['@mediapipe/tasks-vision'],
    },
    server: {
      proxy: {
        '/api': {
          target: 'https://learnschool.online',
          changeOrigin: true,
          secure: true,
        },
        '/files': {
          target: 'https://learnschool.online',
          changeOrigin: true,
          secure: true,
        },
        // Google Classroom integration backend (server/index.js)
        '/gc-api': {
          target: env.VITE_CLASSROOM_SERVER_URL || 'http://localhost:4000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/gc-api/, '/api/classroom'),
        },
        '/gc-auth': {
          target: env.VITE_CLASSROOM_SERVER_URL || 'http://localhost:4000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/gc-auth/, '/auth'),
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});