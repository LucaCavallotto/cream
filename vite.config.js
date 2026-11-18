import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'static-app-files',
      generateBundle() {
        for (const file of [
          'data/categories.json',
          'manifest.json',
          'demo.csv',
        ]) {
          this.emitFile({
            type: 'asset',
            fileName: file,
            source: readFileSync(new URL(file, import.meta.url)),
          });
        }
      },
    },
  ],
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
});
