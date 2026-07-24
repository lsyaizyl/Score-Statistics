import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, "dist");
const serverDir = path.join(distDir, "server");
const openaiDistDir = path.join(distDir, ".openai");

const startTime = performance.now();

const [indexHtml, stylesCss, appJs, coreJs, workerSource] = await Promise.all([
  fs.readFile(path.join(projectRoot, "public", "index.html"), "utf8"),
  fs.readFile(path.join(projectRoot, "public", "styles.css"), "utf8"),
  fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8"),
  fs.readFile(path.join(projectRoot, "src", "core.js"), "utf8"),
  fs.readFile(path.join(projectRoot, "src", "site-worker.js"), "utf8"),
]);

const staticAssets = {
  "index.html": indexHtml,
  "styles.css": minifyCss(stylesCss),
  "app.js": appJs,
  "shared/core.js": coreJs,
};

const generatedWorker = workerSource.replace(
  "const STATIC_ASSETS = __STATIC_ASSETS__;",
  `const STATIC_ASSETS = ${JSON.stringify(staticAssets)};`,
);
if (generatedWorker === workerSource) {
  console.error("ERROR: STATIC_ASSETS placeholder not found in site-worker.js");
  process.exit(1);
}

await fs.rm(distDir, { recursive: true, force: true });
await Promise.all([
  fs.mkdir(serverDir, { recursive: true }),
  fs.mkdir(openaiDistDir, { recursive: true }),
]);
await Promise.all([
  fs.writeFile(path.join(serverDir, "index.js"), generatedWorker),
  fs.copyFile(path.join(projectRoot, "src", "core.js"), path.join(serverDir, "core.js")),
  fs.copyFile(path.join(projectRoot, ".openai", "hosting.json"), path.join(openaiDistDir, "hosting.json")),
]);

const elapsed = (performance.now() - startTime).toFixed(0);
const stats = await fs.stat(path.join(serverDir, "index.js"));
console.log(`Build completed in ${elapsed}ms. Worker size: ${(stats.size / 1024).toFixed(1)}KB`);

function minifyCss(css) {
  // Preserve calc() expressions by temporarily replacing them
  const calcPlaceholders = [];
  const preserved = css.replace(/calc\([^)]*\)/g, (match) => {
    calcPlaceholders.push(match);
    return `__CALC_${calcPlaceholders.length - 1}__`;
  });
  return preserved
    .replace(/\/\*[\s\S]*?\*\//g, "")        // Remove comments
    .replace(/\s+/g, " ")                     // Collapse whitespace
    .replace(/\s*([{}:;,])\s*/g, "$1")        // Remove space around selectors
    .replace(/;}/g, "}")                      // Remove last semicolon in blocks
    .replace(/__CALC_(\d+)__/g, (_, index) => calcPlaceholders[Number(index)])  // Restore calc()
    .trim();
}
