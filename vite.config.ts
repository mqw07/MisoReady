import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";
import { loadEnv, type Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { handleGenerate } from "./api/generate.ts";

function misoGenerateApi(): Plugin {
  return {
    name: "miso-generate-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/api/generate") {
          next();
          return;
        }
        void respondGenerate(req, res);
      });
    },
  };
}

async function respondGenerate(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(", "));
    }
    const method = req.method ?? "GET";
    const request = new Request("http://127.0.0.1/api/generate", {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : body,
    });
    const response = await handleGenerate(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "Generation failed. Try again in a moment." }));
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of ["LLM_API_KEY", "LLM_API_URL", "LLM_MODEL"]) {
    const value = env[key];
    if (value && !process.env[key]) process.env[key] = value;
  }

  return {
    plugins: [react(), tailwindcss(), misoGenerateApi()],
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: true,
    },
  };
});
