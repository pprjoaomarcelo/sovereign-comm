/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    test: {
      globals: true,
      environment: 'jsdom',
    },
    server: {
      host: "0.0.0.0",
      port: 8080,
    },
    define: {
      'process.env': env
    },
    optimizeDeps: {
      esbuildOptions: {
        define: { global: "globalThis" },
      },
    },
    plugins: [react(),],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
});
