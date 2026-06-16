import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;
const port = 1422;
const DASHBOARD_PROXY_ROUTE = "/__dashboard_proxy__";
const DASHBOARD_PROXY_HOSTS = new Set([
  "api.github.com",
  "blog.pridesec.com.br",
  "feeds.feedburner.com",
  "github.com",
  "infoq.com",
  "rss.tecmundo.com.br",
  "www.infoq.com",
]);

function dashboardProxyPlugin() {
  return {
    name: "dashboard-proxy",
    configureServer(server: {
      middlewares: {
        use: (
          handler: (
            req: import("node:http").IncomingMessage,
            res: import("node:http").ServerResponse,
            next: () => void,
          ) => void | Promise<void>,
        ) => void;
      };
    }) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url == null) {
          next();
          return;
        }

        const requestUrl = new URL(req.url, `http://localhost:${port}`);
        if (requestUrl.pathname !== DASHBOARD_PROXY_ROUTE || req.method !== "POST") {
          next();
          return;
        }

        try {
          const body = await readRequestBody(req);
          const payload = JSON.parse(body) as {
            body?: string;
            headers?: Record<string, string>;
            method?: string;
            url?: string;
          };

          if (!payload.url) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ message: "Missing url." }));
            return;
          }

          const target = new URL(payload.url);
          if (
            target.protocol !== "https:" ||
            !DASHBOARD_PROXY_HOSTS.has(target.hostname.toLowerCase())
          ) {
            res.statusCode = 403;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ message: "Target host is not allowed." }));
            return;
          }

          const upstream = await fetch(target, {
            method: payload.method?.toUpperCase() || "GET",
            headers: payload.headers,
            body: payload.body,
          });

          res.statusCode = upstream.status;
          const contentType = upstream.headers.get("content-type");
          if (contentType) {
            res.setHeader("Content-Type", contentType);
          }
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("Access-Control-Allow-Origin", "*");

          const bytes = Buffer.from(await upstream.arrayBuffer());
          res.end(bytes);
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              message: error instanceof Error ? error.message : String(error),
            }),
          );
        }
      });
    },
  };
}

function readRequestBody(
  req: import("node:http").IncomingMessage,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), dashboardProxyPlugin()],

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
      : undefined,

    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
