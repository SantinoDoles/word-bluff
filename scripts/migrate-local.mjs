import { existsSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import "./sites-env.mjs";
const config = new URL("../wrangler.local.json", import.meta.url);
if (!existsSync(config)) {
  copyFileSync(new URL("../wrangler.local.example.json", import.meta.url), config);
}
const result = spawnSync(process.execPath, [
  fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url)),
  "d1", "migrations", "apply", "DB", "--local", "--config",
  fileURLToPath(config), "--persist-to", ".wrangler/state",
], { stdio: "inherit", windowsHide: true });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
