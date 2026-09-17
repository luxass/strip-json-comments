import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  exports: true,
  format: ["cjs", "esm"],
  // Keep historical output names (index.js / index.cjs).
  // Newer tsdown defaults to fixed .mjs/.cjs extensions.
  fixedExtension: false,
  clean: true,
  dts: true,
  treeshake: true,
  publint: true,
});
