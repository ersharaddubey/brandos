import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isQA = mode === 'qa';
  const backend = isQA
    ? 'http://localhost:5003'
    : 'http://localhost:5002';

  return {
    plugins: [react()],
    server: {
      port: isQA ? 5174 : 5173,
      proxy: {
        '/api': backend,
        '/uploads': backend,
      },
    },
  };
});
