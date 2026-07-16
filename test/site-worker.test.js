import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import fs from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);
const tmpDir = path.resolve("tmp", "site-worker-tests");

test("builds a Sites worker that serves the app and cloud Excel APIs", async () => {
  await execFileAsync("node", ["scripts/build-site.js"]);
  const worker = await import(`../dist/server/index.js?cache=${Date.now()}`);

  const home = await worker.default.fetch(new Request("https://example.test/"));
  assert.equal(home.status, 200);
  assert.match(await home.text(), /道路工程成绩统计工具/);

  const core = await worker.default.fetch(new Request("https://example.test/shared/core.js"));
  assert.equal(core.status, 200);
  assert.match(await core.text(), /ROAD_TASKS/);

  const exportResponse = await worker.default.fetch(new Request("https://example.test/api/export", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      entries: [
        {
          group: "小学组",
          teamName: "A队",
          school: "甲校",
          robotWeight: 1.2,
          rounds: [
            { seconds: 100, scores: { tunnel: 50, autoCharging: 50 } },
            { seconds: 110, scores: { tunnel: 50, autoCharging: 50 } },
          ],
        },
      ],
      awardCountsByGroup: { 小学组: { first: 1, second: 0, third: 0 } },
    }),
  }));
  assert.equal(exportResponse.status, 200);
  assert.equal(exportResponse.headers.get("content-type"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert((await exportResponse.arrayBuffer()).byteLength > 1000);

  const rosterBase64 = await compressedRosterWorkbookBase64();
  const rosterResponse = await worker.default.fetch(new Request("https://example.test/api/roster", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filename: "名单.xlsx", base64: rosterBase64 }),
  }));
  const roster = await rosterResponse.json();
  assert.equal(rosterResponse.status, 200);
  assert.equal(roster.validRows.length, 1);
  assert.equal(roster.validRows[0].teamName, "A队");
});

async function compressedRosterWorkbookBase64() {
  await fs.mkdir(tmpDir, { recursive: true });
  const workbook = Workbook.create();
  const sheet = workbook.worksheets.add("名单");
  sheet.getRange("A1:F2").values = [
    ["组别", "队伍名称", "学校", "选手A", "选手B", "指导教师"],
    ["小学组", "A队", "甲校", "甲", "乙", "丙"],
  ];
  const file = await SpreadsheetFile.exportXlsx(workbook);
  const filePath = path.join(tmpDir, "roster.xlsx");
  await file.save(filePath);
  const bytes = await fs.readFile(filePath);
  return Buffer.from(bytes).toString("base64");
}
