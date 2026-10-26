import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  clean: true,
  // Bundle every dependency into dist/index.js, so the container needs no node_modules
  noExternal: [/.*/],
});