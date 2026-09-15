import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'src/main/index.ts'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'src/preload/index.ts'),
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    publicDir: resolve(__dirname, 'public'),
    plugins: [react()],
    resolve: {
      alias: {
        '@kai/planner': resolve(__dirname, '../../packages/planner/src/index.ts'),
        '@kai/avatar-engine': resolve(__dirname, '../../packages/avatar-engine/src/index.ts'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
        },
        external: ['@kai/windows-engine', '@kai/browser-engine', 'child_process'],
      },
    },
  },
});
