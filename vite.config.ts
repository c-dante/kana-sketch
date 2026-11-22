/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { examplesPlugin } from "./dev/examples-plugin";

export default defineConfig({
  base: "./",
  plugins: [preact(), examplesPlugin()],
  server: { host: true, allowedHosts: ["cachy-box.local"] },
  preview: { host: true, allowedHosts: ["cachy-box.local"] },
  test: { environment: "node" },
});
