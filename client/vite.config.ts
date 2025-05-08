import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import glsl from "vite-plugin-glsl";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    glsl(), // Add GLSL shader support
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "../shared"),
      // Add a browser-compatible EventEmitter implementation
      'events': 'eventemitter3'
    },
  },
  css: {
    // Improve CSS processing configuration
    devSourcemap: true,
    preprocessorOptions: {
      // Add any CSS preprocessor options if needed
    }
  },
  build: {
    outDir: path.resolve(__dirname, "../dist/public"),
    emptyOutDir: true,
    // rollupOptions: {
    //   external: [
    //     '@bedrock_org/passport',
    //     '@bedrock_org/passport/dist/style.css'
    //   ]
    // }
  },
  // Add proxy configuration to forward API requests to the backend server
  server: {
    proxy: {
      // Forward API requests to the backend server
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Forward WebSocket connections to the backend server
      '/ws': {
        target: 'ws://localhost:5000',
        ws: true,
      }
    },
    // Add middleware to handle 500 errors better
    middlewareMode: false
  },
  // Add support for large models and audio files
  assetsInclude: ["**/*.gltf", "**/*.glb", "**/*.mp3", "**/*.ogg", "**/*.wav"],
});