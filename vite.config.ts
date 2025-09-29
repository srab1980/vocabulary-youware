import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { youwareVitePlugin } from "@youware/vite-plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [youwareVitePlugin(), react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      '/api/proxy/youware': {
        target: 'https://api.youware.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy\/youware/, ''),
        secure: true,
      }
    }
  },
  build: {
    sourcemap: true,
  },
});