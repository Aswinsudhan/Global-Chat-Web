import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import tsconfigPaths from "vite-tsconfig-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: \"${rawPort}\"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig(async () => {
  const cartographerPlugin =
    process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer({
            root: path.resolve(__dirname, ".."),
          }),
        )
      : null;

  const devBannerPlugin =
    process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? await import("@replit/vite-plugin-dev-banner").then((m) =>
          m.devBanner(),
        )
      : null;

  const config: UserConfig = {
    base: basePath,
    plugins: [
      react(),
      runtimeErrorOverlay(),
      tsconfigPaths(),
      cartographerPlugin,
      devBannerPlugin,
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@assets": path.resolve(__dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(__dirname),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };

  return config;
});