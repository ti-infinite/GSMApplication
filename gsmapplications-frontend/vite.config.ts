import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Carga .env / .env.local en el config (Node). El prefijo '' incluye también
  // las que no llevan VITE_. process.env NO se llena solo desde los .env.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:80',
          changeOrigin: true,
        },
        '/ih-api': {
          target: env.VITE_IH_AGENT_URL,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/ih-api/, ''),
        },
      },
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react':  ['react', 'react-dom'],
            'vendor-router': ['react-router-dom'],
            'vendor-query':  ['@tanstack/react-query'],
            'vendor-i18n':   ['i18next', 'react-i18next'],
            'vendor-ui':     [
              'lucide-react',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-dialog',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-slot',
            ],
            'vendor-utils':  ['clsx', 'tailwind-merge', 'class-variance-authority', 'js-cookie'],
          },
        },
      },
    },
  }
})
