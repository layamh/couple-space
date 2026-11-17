import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite 配置。
 * - base 由 VITE_BASE_PATH 决定；未配置时 dev 用 '/'，build 用 GitHub Pages 子路径 '/couple-space/'。
 * - 别名 '@' 指向 src，与 tsconfig.json 的 paths 保持一致。
 */
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  const base = env.VITE_BASE_PATH || (command === 'serve' ? '/' : '/couple-space/');
  const srcPath = new URL('./src', import.meta.url).pathname;

  return {
    base,
    plugins: [react()],
    resolve: {
      alias: {
        '@': srcPath,
      },
    },
    server: {
      host: true,
      port: 5173,
    },
    preview: {
      host: true,
      port: 4173,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
    },
  };
});
