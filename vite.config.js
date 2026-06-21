import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/gradio_api': {
        target: 'http://127.0.0.1:7860',
        changeOrigin: true,
        selfHandleResponse: false,
        proxyTimeout: 300000,
        timeout: 300000,
      },
      '/config': {
        target: 'http://127.0.0.1:7860',
        changeOrigin: true,
        proxyTimeout: 10000,
        timeout: 10000,
      },
    },
  },
});
