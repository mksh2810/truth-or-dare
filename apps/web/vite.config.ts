import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Vowlet',
        short_name: 'Vowlet',
        description: 'A little truth, a little trouble',
        theme_color: '#F6F1E9',
        background_color: '#F6F1E9',
        display: 'standalone',
        start_url: '/',
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return 'vendor-react';
          }
          if (/[\\/]node_modules[\\/]framer-motion[\\/]/.test(id)) {
            return 'vendor-motion';
          }
          if (/[\\/]node_modules[\\/](firebase|@firebase)[\\/]/.test(id)) {
            return 'vendor-firebase';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
