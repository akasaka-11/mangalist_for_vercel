
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Do NOT expose process.env here: anything in `define` is inlined into the
  // public JS bundle. Use import.meta.env.VITE_* for values that are safe to publish.
});
