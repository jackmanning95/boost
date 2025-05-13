import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react-router-dom'],
    exclude: ['lucide-react']
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom']
  }
});