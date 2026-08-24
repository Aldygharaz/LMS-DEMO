import devServer from "@hono/vite-dev-server"
import path from "path"
const __dirname = import.meta.dirname
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    devServer({ entry: "server/boot.ts", exclude: [/^\/(?!api\/).*$/] }),
    inspectAttr(), 
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: 'auto',
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        maximumFileSizeToCacheInBytes: 5000000,
        runtimeCaching: [
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        name: "LMS Sokara",
        short_name: "Sokara",
        description: "Sistem Manajemen Pembelajaran Sekolah Offline First",
        theme_color: "#0097E6",
        background_color: "#FFFFFF",
        display: "standalone",
        icons: [
          {
            src: "/favicon.ico",
            sizes: "16x16 32x32",
            type: "image/x-icon"
          },
          {
            src: "/favicon-32x32.png",
            sizes: "32x32",
            type: "image/png"
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "./contracts"),
      "@db": path.resolve(__dirname, "./db"),
      "db": path.resolve(__dirname, "./db"),
    },
  },
  envDir: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router"],
          "vendor-query": ["@tanstack/react-query", "@trpc/client", "@trpc/react-query"],
          "vendor-icons": ["lucide-react"],
          "vendor-ui": ["@formkit/auto-animate", "canvas-confetti", "sonner"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});

