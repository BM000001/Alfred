import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  // Vercel usa a raiz do domínio; GitHub Pages usa o caminho do repositório.
  base: mode === 'github-pages' ? '/Alfred/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    // A Etapa 1 mantém testes Node próprios na raiz; Vitest valida somente o app React.
    include: ['src/**/*.test.{ts,tsx}'],
  },
}));
