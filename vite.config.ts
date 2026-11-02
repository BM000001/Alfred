import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // O repositório é publicado em https://<usuario>.github.io/Alfred/
  // Em desenvolvimento local, a base também funciona normalmente.
  base: '/Alfred/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
