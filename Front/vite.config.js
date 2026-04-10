import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tailwindcss()],
  preview: {
    allowedHosts: [
      "app.grupofxmetalicos.com.br",
      "www.app.grupofxmetalicos.com.br",
      "grupofxmetalicos.com.br",
      "www.grupofxmetalicos.com.br",
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
