import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config";
export default defineConfig((env) => {
  const cfg = (base as any)(env);
  return mergeConfig(cfg, { build: { manifest: true, sourcemap: true, outDir: "dist-measure" } });
});
