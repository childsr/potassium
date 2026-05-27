import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Potassium',
      fileName: (format) => {
        if (format === 'es') return 'main.mjs';
        if (format === 'cjs') return 'main.js';
        return `main.${format}.js`;
      },
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['@bananaseed/event_stream'],
      output: {
        exports: 'named'
      }
    },
    sourcemap: true,
    emptyOutDir: true
  },
  plugins: [
    dts({
      rollupTypes: true,
      insertTypesEntry: true
    })
  ]
});
