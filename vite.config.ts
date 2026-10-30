import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { loadEnv, type Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { handleNodeGenerate } from "./api/generate.ts";
import handleNodeReviewAnswer from "./api/review-answer.ts";

function misoGenerateApi(): Plugin {
  return {
    name: "miso-generate-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] === "/api/review-answer") {
          void handleNodeReviewAnswer(req, res);
          return;
        }
        if (req.url?.split("?")[0] !== "/api/generate") {
          next();
          return;
        }
        void handleNodeGenerate(req, res);
      });
    },
  };
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
