import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import { createRequestHandler } from "../src/server.js";

const tmpDir = path.resolve("tmp", "server-tests");

test("serves road engineering config over JSON", async () => {
  const { baseUrl, close } = await startTestServer();
  try {
    const response = await fetch(`${baseUrl}/api/config`);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(data.groups, ["小学组", "初中组", "高中组"]);
    assert.equal(data.tasks.length, 7);
    assert.equal(data.tasks[0].name, "物料回收");
  } finally {
    await close();
  }
});

test("serves shared browser core module", async () => {
  const { baseUrl, close } = await startTestServer();
  try {
    const response = await fetch(`${baseUrl}/shared/core.js`);
    const source = await response.text();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/javascript; charset=utf-8");
    assert(source.includes("ROAD_TASKS"));
  } finally {
    await close();
  }
});

test("serves the local score tool page", async () => {
  const { baseUrl, close } = await startTestServer();
  try {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /道路工程成绩统计工具/);
    assert.match(html, /app\.js/);
  } finally {
    await close();
  }
});

test("serves a paper-first manual entry workflow", async () => {
  const { baseUrl, close } = await startTestServer();
  try {
    const response = await fetch(`${baseUrl}/app.js`);
    const source = await response.text();

    assert.equal(response.status, 200);
    assert.match(source, /手工建队/);
    assert.match(source, /纸单录入/);
    assert.match(source, /标记已复核/);
    assert.match(source, /createManualEntry/);
  } finally {
    await close();
  }
});

test("exports a score workbook from posted entries", async () => {
  const { baseUrl, close } = await startTestServer();
  try {
    const response = await fetch(`${baseUrl}/api/export`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entries: [
          {
            group: "小学组",
            teamName: "A队",
            school: "甲校",
            studentA: "甲",
            studentB: "乙",
            coach: "丙",
            robotWeight: 1.2,
            rounds: [
              { seconds: 100, scores: { tunnel: 50, autoCharging: 50 } },
              { seconds: 110, scores: { tunnel: 50, autoCharging: 50 } },
            ],
          },
        ],
        awardCountsByGroup: {
          小学组: { first: 1, second: 0, third: 0 },
        },
      }),
    });
    const body = new Uint8Array(await response.arrayBuffer());

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    assert.match(decodeURIComponent(response.headers.get("content-disposition")), /道路工程成绩包/);
    assert(body.length > 1000);
  } finally {
    await close();
  }
});

test("imports a roster workbook posted as base64 JSON", async () => {
  const workbook = Workbook.create();
  const sheet = workbook.worksheets.add("名单");
  sheet.getRange("A1:F2").values = [
    ["组别", "队伍名称", "学校", "选手A", "选手B", "指导教师"],
    ["小学组", "A队", "甲校", "甲", "乙", "丙"],
  ];
  const file = await SpreadsheetFile.exportXlsx(workbook);
  await fs.mkdir(tmpDir, { recursive: true });
  const filePath = path.join(tmpDir, "server-roster.xlsx");
  await file.save(filePath);
  const bytes = await fs.readFile(filePath);
  const base64 = Buffer.from(bytes).toString("base64");
  const { baseUrl, close } = await startTestServer();
  try {
    const response = await fetch(`${baseUrl}/api/roster`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename: "名单.xlsx", base64 }),
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.validRows.length, 1);
    assert.equal(data.validRows[0].teamName, "A队");
  } finally {
    await close();
  }
});

test("downloads a fixed roster template workbook", async () => {
  const { baseUrl, close } = await startTestServer();
  try {
    const response = await fetch(`${baseUrl}/api/template`);
    const body = new Uint8Array(await response.arrayBuffer());

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    assert.match(decodeURIComponent(response.headers.get("content-disposition")), /道路工程参赛名单模板/);
    assert(body.length > 1000);
  } finally {
    await close();
  }
});

async function startTestServer() {
  const server = http.createServer(createRequestHandler());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => {
      server.closeAllConnections();
      server.close((error) => (error ? reject(error) : resolve()));
    }),
  };
}
