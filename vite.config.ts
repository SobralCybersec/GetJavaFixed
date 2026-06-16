import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;
const port = 1422;

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],

  base: "./",

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  envPrefix: ["VITE_", "TAURI_ENV_*"],

  esbuild: {
    drop: mode === "production" ? ["debugger"] : [],
    pure:
      mode === "production"
        ? ["console.debug", "console.info", "console.trace"]
        : [],
  },

  build: {
    target:
      process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome120" : "es2022",
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        settings: path.resolve(__dirname, "settings.html"),
      },
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;

          if (id.includes("@ai-sdk/anthropic")) return "ai-anthropic";
          if (id.includes("@ai-sdk/google")) return "ai-google";
          if (id.includes("@ai-sdk/openai-compatible")) return "ai-openai-compat";
          if (id.includes("@ai-sdk/openai")) return "ai-openai";
          if (id.includes("@ai-sdk/cerebras")) return "ai-cerebras";
          if (id.includes("@ai-sdk/groq")) return "ai-groq";
          if (id.includes("@ai-sdk/xai")) return "ai-xai";
          if (id.includes("@ai-sdk/")) return "ai-sdk-shared";

          if (id.includes("/xterm/") || id.includes("@xterm/")) return "xterm";

          if (
            id.includes("@codemirror/") ||
            id.includes("@uiw/codemirror") ||
            id.includes("@replit/codemirror")
          ) {
            return "codemirror";
          }

          if (id.includes("/streamdown/") || id.includes("@streamdown/")) {
            return "streamdown";
          }

          if (id.includes("/motion/") || id.includes("framer-motion")) {
            return "motion";
          }

          if (
            id.includes("/react-dom/") ||
            id.includes("/react/") ||
            id.includes("/scheduler/")
          ) {
            return "react";
          }

          if (id.includes("@radix-ui/") || id.includes("/radix-ui/")) {
            return "radix";
          }
        },
      },
    },
  },

  clearScreen: false,

  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["proxyexamples/**", "src-tauri/**"],
  },

  server: {
    port,
    strictPort: true,
    host: host ?? "localhost",

    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1424,
        }
      : {
          protocol: "ws",
          host: "localhost",
          port,
        },

    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));