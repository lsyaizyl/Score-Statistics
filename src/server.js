import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { SpreadsheetFile } from "@oai/artifact-tool";
import { GROUPS, ROAD_TASKS } from "./core.js";
import { createRosterTemplateWorkbook, createScoreWorkbook, readRosterWorkbook } from "./excel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const defaultPublicDir = path.join(projectRoot, "public");
const xlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function createRequestHandler({ publicDir = defaultPublicDir, tmpDir = path.join(projectRoot, "tmp", "uploads") } = {}) {
  return async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");

      if (request.method === "GET" && url.pathname === "/api/config") {
        return sendJson(response, 200, { groups: GROUPS, tasks: ROAD_TASKS });
      }

      if (request.method === "GET" && url.pathname === "/shared/core.js") {
        const source = await fs.readFile(path.join(projectRoot, "src", "core.js"));
        response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
        response.end(source);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/template") {
        const workbook = createRosterTemplateWorkbook();
        const output = await SpreadsheetFile.exportXlsx(workbook);
        await sendXlsx(response, output, "道路工程参赛名单模板.xlsx", tmpDir);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/roster") {
        const payload = await readJsonBody(request);
        if (!payload.base64) {
          return sendJson(response, 400, { error: "缺少 base64 文件内容" });
        }
        await fs.mkdir(tmpDir, { recursive: true });
        const safeName = sanitizeFilename(payload.filename || "roster.xlsx");
        const inputPath = path.join(tmpDir, `${randomUUID()}-${safeName}`);
        await fs.writeFile(inputPath, Buffer.from(stripDataUrlPrefix(payload.base64), "base64"));
        try {
          const result = await readRosterWorkbook(inputPath);
          return sendJson(response, 200, result);
        } finally {
          await fs.unlink(inputPath).catch(() => {});
        }
      }

      if (request.method === "POST" && url.pathname === "/api/export") {
        const payload = await readJsonBody(request);
        const workbook = await createScoreWorkbook({
          entries: Array.isArray(payload.entries) ? payload.entries : [],
          awardCountsByGroup: payload.awardCountsByGroup ?? {},
        });
        const output = await SpreadsheetFile.exportXlsx(workbook);
        await sendXlsx(response, output, `道路工程成绩包-${dateStamp()}.xlsx`, tmpDir);
        return;
      }

      if (request.method === "GET") {
        return serveStatic(publicDir, url.pathname, response);
      }

      sendJson(response, 405, { error: "Method Not Allowed" });
    } catch (error) {
      sendJson(response, 500, { error: error.message || "服务器处理失败" });
    }
  };
}

export function startServer({ port = Number(process.env.PORT) || 5173, host = "127.0.0.1" } = {}) {
  const server = http.createServer(createRequestHandler());
  server.listen(port, host, () => {
    console.log(`道路工程成绩统计工具已启动: http://${host}:${port}`);
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer();
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function sendXlsx(response, fileBlob, filename, tmpDir) {
  await fs.mkdir(tmpDir, { recursive: true });
  const outputPath = path.join(tmpDir, `${randomUUID()}-${sanitizeFilename(filename)}`);
  await fileBlob.save(outputPath);
  const bytes = await fs.readFile(outputPath);
  await fs.unlink(outputPath).catch(() => {});
  response.writeHead(200, {
    "content-type": xlsxMime,
    "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "content-length": String(bytes.length),
  });
  response.end(bytes);
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
}

async function serveStatic(publicDir, pathname, response) {
  const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const targetPath = path.resolve(publicDir, relative);
  const publicRoot = path.resolve(publicDir);
  if (!targetPath.startsWith(publicRoot)) {
    return sendJson(response, 403, { error: "Forbidden" });
  }
  try {
    const content = await fs.readFile(targetPath);
    response.writeHead(200, { "content-type": contentType(targetPath) });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: "Not Found" });
  }
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
  }[ext] ?? "application/octet-stream";
}

function sanitizeFilename(filename) {
  return String(filename).replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
}

function stripDataUrlPrefix(base64) {
  return String(base64).includes(",") ? String(base64).split(",").pop() : String(base64);
}

function dateStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}`;
}
