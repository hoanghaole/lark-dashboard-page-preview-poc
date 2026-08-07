import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` : './',
  preview: {
    allowedHosts: [".haobi.io.vn", "localhost", "127.0.0.1", true],
  },
  server: {
    allowedHosts: [".haobi.io.vn", "localhost", "127.0.0.1", true],
  },
});
