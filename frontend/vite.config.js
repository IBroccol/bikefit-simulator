import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Output the production build directly into Flask's static folder
    outDir: '../app/static/dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost',
      },
      '/bikes': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost',
        bypass(req) {
          // Don't proxy browser navigation requests (GET + text/html Accept).
          // /bikes/* paths are both React routes (/bikes/new, /bikes) and API
          // endpoints (/bikes/add, /bikes/list, etc.). Browser navigations carry
          // Accept: text/html and must be served by Vite as index.html.
          if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
      '/fits': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost',
      },
      // Proxy legacy static assets (vanilla-JS canvas modules, PNG hints served
      // by Flask's /static route) so CanvasPage / ComparePage / ModerationPage
      // can load them during Vite dev server mode.
      '/static': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
