import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  clean: true,
  // Bundle the shared package in, since it ships TypeScript source
  noExternal: ["@opendoor/shared"],
});
