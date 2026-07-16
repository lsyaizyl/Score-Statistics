import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, "dist");
const serverDir = path.join(distDir, "server");
const staticAssets = {
  "index.html": await fs.readFile(path.join(projectRoot, "public", "index.html"), "utf8"),
  "styles.css": await fs.readFile(path.join(projectRoot, "public", "styles.css"), "utf8"),
  "app.js": await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8"),
  "shared/core.js": await fs.readFile(path.join(projectRoot, "src", "core.js"), "utf8"),
};

const workerSource = await fs.readFile(path.join(projectRoot, "src", "site-worker.js"), "utf8");
const generatedWorker = workerSource.replace(
  "const STATIC_ASSETS = __STATIC_ASSETS__;",
  `const STATIC_ASSETS = ${JSON.stringify(staticAssets)};`,
);

await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(serverDir, { recursive: true });
await fs.writeFile(path.join(serverDir, "index.js"), generatedWorker);
await fs.copyFile(path.join(projectRoot, "src", "core.js"), path.join(serverDir, "core.js"));

console.log(`Built Sites worker at ${path.join(serverDir, "index.js")}`);
