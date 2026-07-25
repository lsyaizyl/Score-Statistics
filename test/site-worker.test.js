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
          id: "小学组-D2026001",
          group: "小学组",
          serial: "1",
          number: "G01",
          teamName: "A队",
          city: "珠海市",
          school: "甲校",
          rawStudents: "甲、乙",
          coach: "丙",
          robotWeight: 1.2,
          rounds: [
            {
              seconds: 82.33,
              scores: {
                materialRecovery: "/",
                serviceArea: "/",
                bridge: "/",
                tunnel: 50,
                gasStation: "/",
                gravityGate: "/",
                autoCharging: 50,
              },
            },
            {
              seconds: 11.02,
              scores: {
                materialRecovery: "/",
                serviceArea: "/",
                bridge: "/",
                tunnel: 50,
                gasStation: "/",
                gravityGate: "/",
                autoCharging: 50,
              },
            },
          ],
        },
      ],
      awardCountsByGroup: { 小学组: { first: 1, second: 0, third: 0 } },
      sourceWorkbookBase64: await officialTemplateWorkbookBase64(),
    }),
  }));
  const exportedBytes = await exportResponse.arrayBuffer();
  assert.equal(exportResponse.status, 200);
  assert.equal(exportResponse.headers.get("content-type"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.match(decodeURIComponent(exportResponse.headers.get("content-disposition")), /26届省赛道路工程_成绩表/);
  assert(exportedBytes.byteLength > 1000);
  const exportedWorkbook = await SpreadsheetFile.importXlsx(exportedBytes);
  const exportedTable = await exportedWorkbook.inspect({
    kind: "table",
    sheetId: "小学组成绩表",
    range: "A1:O3",
    tableMaxRows: 3,
    tableMaxCols: 15,
  });
  assert(exportedTable.ndjson.includes("G01"));
  assert(exportedTable.ndjson.includes("D2026001"));
  assert(exportedTable.ndjson.includes("一等奖"));
  assert(exportedTable.ndjson.includes("12233"));
  assert(exportedTable.ndjson.includes("13335"));
  const outputPath = path.join(tmpDir, "site-worker-official-output.xlsx");
  await fs.writeFile(outputPath, Buffer.from(exportedBytes));
  const xmlByPath = await readXlsxXml(outputPath);
  assert(Object.values(xmlByPath).some((xml) => xml.includes("G3+I3")));
  assert(Object.values(xmlByPath).some((xml) => xml.includes("LET(T,(H3-INT(H3/10000)*4000)+(J3-INT(J3/10000)*4000),INT(T/6000)*10000+MOD(T,6000))")));

  const rosterBase64 = await compressedRosterWorkbookBase64();
  const rosterResponse = await worker.default.fetch(new Request("https://example.test/api/roster", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filename: "名单.xlsx", base64: rosterBase64 }),
  }));
  const roster = await rosterResponse.json();
  assert.equal(rosterResponse.status, 200);
  assert.equal(roster.validRows.length, 3);
  assert.equal(roster.validRows[0].group, "小学组");
  assert.equal(roster.validRows[0].city, "珠海市");
  assert.equal(roster.validRows[0].number, "");
  assert.equal(roster.validRows[0].studentA, "陈彦钧");
  assert.equal(roster.validRows[0].studentB, "李亚霖");
  assert.equal(roster.validRows[1].number, "B02");
});

async function compressedRosterWorkbookBase64() {
  await fs.mkdir(tmpDir, { recursive: true });
  const workbook = Workbook.create();
  const material = workbook.worksheets.add("抽签物料");
  material.getRange("A1:B2").values = [
    ["物料", "数量"],
    ["赛板", 1],
  ];
  for (const [sheetName, city, systemId, drawNumber, school, students] of [
    ["队伍抽签名单-小学", "珠海市", "D2026068", "", "珠海市香洲区实验学校", "陈彦钧、李亚霖"],
    ["队伍抽签名单-初中", "广州市", "D2026069", "B02", "广州市示例中学", "学生甲、学生乙"],
    ["队伍抽签名单-高中", "深圳市", "D2026070", "C03", "深圳市示例高中", "学生丙、学生丁"],
  ]) {
    const sheet = workbook.worksheets.add(sheetName);
    sheet.getRange("A1:I3").values = [
      [`道路工程${sheetName}参赛名单`, "", "", "", "", "", "", "", ""],
      ["序号", "系统编号", "地市", "学校全称", "参赛选手", "教练员", "教练员联系方式", "抽签号", "报到签名"],
      [1, systemId, city, school, students, "王老师", "13300000000", drawNumber, ""],
    ];
  }
  const file = await SpreadsheetFile.exportXlsx(workbook);
  const filePath = path.join(tmpDir, "roster.xlsx");
  await file.save(filePath);
  const bytes = await fs.readFile(filePath);
  return Buffer.from(bytes).toString("base64");
}

async function officialTemplateWorkbookBase64() {
  await fs.mkdir(tmpDir, { recursive: true });
  const workbook = Workbook.create();
  for (const [sheetName, title, systemId, city, school, students, coach] of [
    ["小学组成绩表", "第二十六届广东省青少年机器人竞赛-道路工程比赛成绩表（小学组）", "D2026001", "珠海市", "甲校", "甲、乙", "丙"],
    ["初中组成绩表", "第二十六届广东省青少年机器人竞赛-道路工程比赛成绩表（初中组）", "", "", "", "", ""],
    ["高中组成绩表", "第二十六届广东省青少年机器人竞赛-道路工程比赛成绩表（高中组）", "", "", "", "", ""],
  ]) {
    const sheet = workbook.worksheets.add(sheetName);
    sheet.getRange("A1:O3").values = [
      [title, "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["出场\n序号", "系统编号", "地市", "学校名称", "参赛选手", "教练员", "第一轮\n分数", "第一轮\n完成时间", "第二轮\n分数", "第二轮\n完成时间", "重量", "总成绩", "总用时", "名次", "等次"],
      ["", systemId, city, school, students, coach, "", "", "", "", "", "", "", "", ""],
    ];
    sheet.getRange("L3").formulas = [["=G3+I3"]];
    sheet.getRange("M3").formulas = [["=LET(T,(H3-INT(H3/10000)*4000)+(J3-INT(J3/10000)*4000),INT(T/6000)*10000+MOD(T,6000))"]];
  }
  const file = await SpreadsheetFile.exportXlsx(workbook);
  const filePath = path.join(tmpDir, "official-template.xlsx");
  await file.save(filePath);
  const bytes = await fs.readFile(filePath);
  return Buffer.from(bytes).toString("base64");
}

async function readXlsxXml(inputPath) {
  const output = {};
  const { stdout } = await execFileAsync("tar", ["-tf", inputPath], { maxBuffer: 2_000_000 });
  for (const name of stdout.split(/\r?\n/).filter((item) => /^xl\/worksheets\/sheet\d+\.xml$/.test(item))) {
    const extracted = await execFileAsync("tar", ["-xOf", inputPath, name], { maxBuffer: 4_000_000 });
    output[name] = extracted.stdout;
  }
  return output;
}
