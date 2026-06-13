import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/gradio': {
        target: 'http://127.0.0.1:7860',
        rewrite: (path) => path.replace(/^\/gradio/, ''),
        changeOrigin: true,
      },
    },
  },
});
