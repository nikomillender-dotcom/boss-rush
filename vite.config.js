import { readFileSync } from "fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// base: "./" is REQUIRED for itch.io — it serves the build from a sandboxed
// subpath, so all asset URLs must be relative, not absolute "/assets/...".
export default defineConfig({
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__: JSON.stringify("itch"),
  },
  plugins: [react()],
});
