import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import { createOfficialScoreWorkbook, createScoreWorkbook, readRosterWorkbook } from "../src/excel.js";
import { ROAD_TASKS } from "../src/core.js";

const tmpDir = path.resolve("tmp", "tests");

function completeRound(seconds, scores = {}) {
  return {
    seconds,
    scores: Object.fromEntries(ROAD_TASKS.map((task) => [task.key, scores[task.key] ?? "/"])),
  };
}

test("reads fixed-format roster workbooks and returns validation results", async () => {
  await fs.mkdir(tmpDir, { recursive: true });
  const workbook = Workbook.create();
  const sheet = workbook.worksheets.add("名单");
  sheet.getRange("A1:H4").values = [
    ["组别", "队伍名称", "学校", "选手A", "选手B", "指导教师", "编号", "备注"],
    ["小学组", "云伊机兵二队", "云浮市伊顿实验学校", "毛铭扬", "王衍道", "陈立乾", "1", ""],
    ["小学组", "云伊机兵二队", "云浮市伊顿实验学校", "毛铭扬", "王衍道", "陈立乾", "2", "重复"],
    ["大学组", "", "测试学校", "甲", "乙", "丙", "3", ""],
  ];
  const file = await SpreadsheetFile.exportXlsx(workbook);
  const inputPath = path.join(tmpDir, "roster.xlsx");
  await file.save(inputPath);

  const result = await readRosterWorkbook(inputPath);

  assert.equal(result.validRows.length, 1);
  assert.equal(result.validRows[0].teamName, "云伊机兵二队");
  assert(result.issues.some((issue) => issue.type === "duplicate-team"));
  assert(result.issues.some((issue) => issue.type === "empty-team"));
  assert(result.issues.some((issue) => issue.type === "unknown-group"));
});

test("reads province roster sheets even when the first sheet is not a roster", async () => {
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
  const inputPath = path.join(tmpDir, "province-roster.xlsx");
  await file.save(inputPath);

  const result = await readRosterWorkbook(inputPath);

  assert.equal(result.validRows.length, 3);
  assert.deepEqual(result.validRows.map((row) => row.group), ["小学组", "初中组", "高中组"]);
  assert.equal(result.validRows[0].city, "珠海市");
  assert.equal(result.validRows[0].number, "");
  assert.equal(result.validRows[0].systemId, "");
  assert.equal(result.validRows[0].studentA, "陈彦钧");
  assert.equal(result.validRows[0].studentB, "李亚霖");
  assert.equal(result.validRows[0].coachPhone, "13300000000");
  assert.equal(result.validRows[1].number, "B02");
  assert(result.scannedSheets.some((sheet) => sheet.name === "队伍抽签名单-小学" && sheet.rows === 1));
});

test("creates a score package workbook with summary and group deliverable sheets", async () => {
  const workbook = await createScoreWorkbook({
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
          completeRound(100, { tunnel: 50, autoCharging: 50 }),
          completeRound(110, { tunnel: 50, autoCharging: 50 }),
        ],
      },
      {
        group: "小学组",
        teamName: "B队",
        school: "乙校",
        studentA: "丁",
        studentB: "戊",
        coach: "己",
        robotWeight: 1.1,
        rounds: [
          completeRound(120, { tunnel: 50 }),
          completeRound(130, { tunnel: 50 }),
        ],
      },
      {
        group: "初中组",
        teamName: "淘汰队",
        school: "丙校",
        studentA: "庚",
        studentB: "辛",
        coach: "壬",
        robotWeight: 1.4,
        rounds: [
          completeRound(180),
          completeRound(180),
        ],
      },
    ],
    awardCountsByGroup: {
      小学组: { first: 1, second: 1, third: 0 },
      初中组: { first: 0, second: 0, third: 0 },
      高中组: { first: 0, second: 0, third: 0 },
    },
  });

  const sheets = await workbook.inspect({ kind: "sheet", include: "name", maxChars: 4000 });
  const ndjson = sheets.ndjson;
  assert(ndjson.includes("总汇总"));
  assert(ndjson.includes("小学组最终成绩"));
  assert(ndjson.includes("小学组公示表"));
  assert(ndjson.includes("小学组签名表"));

  const summary = await workbook.inspect({
    kind: "table",
    sheetId: "总汇总",
    range: "A1:R8",
    tableMaxRows: 8,
    tableMaxCols: 18,
  });
  assert(summary.ndjson.includes("A队"));
  assert(summary.ndjson.includes("一等奖"));
  assert(summary.ndjson.includes("淘汰队"));
  assert(summary.ndjson.includes("淘汰"));
});

test("fills official province score sheets using a template workbook", async () => {
  await fs.mkdir(tmpDir, { recursive: true });
  const template = Workbook.create();
  const sheet = template.worksheets.add("小学组成绩表");
  sheet.getRange("A1:O3").values = [
    ["旧标题", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["出场\n序号", "系统编号", "地市", "学校名称", "参赛选手", "教练员", "第一轮\n分数", "第一轮\n完成时间", "第二轮\n分数", "第二轮\n完成时间", "重量", "总成绩", "总用时", "名次", "等次"],
    ["", "D2026001", "珠海市", "甲校", "甲、乙", "丙", "", "", "", "", "", "", "", "", ""],
  ];
  template.worksheets.add("初中组成绩表").getRange("A1:O2").values = [
    ["旧标题", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["出场\n序号", "系统编号", "地市", "学校名称", "参赛选手", "教练员", "第一轮\n分数", "第一轮\n完成时间", "第二轮\n分数", "第二轮\n完成时间", "重量", "总成绩", "总用时", "名次", "等次"],
  ];
  template.worksheets.add("高中组成绩表").getRange("A1:O2").values = [
    ["旧标题", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["出场\n序号", "系统编号", "地市", "学校名称", "参赛选手", "教练员", "第一轮\n分数", "第一轮\n完成时间", "第二轮\n分数", "第二轮\n完成时间", "重量", "总成绩", "总用时", "名次", "等次"],
  ];
  const templateFile = await SpreadsheetFile.exportXlsx(template);
  const templatePath = path.join(tmpDir, "official-template.xlsx");
  await templateFile.save(templatePath);

  const workbook = await createOfficialScoreWorkbook({
    templatePath,
    entries: [
      {
        id: "小学组-D2026001",
        group: "小学组",
        serial: "1",
        number: "G01",
        teamName: "甲校（甲、乙）",
        city: "珠海市",
        school: "甲校",
        rawStudents: "甲、乙",
        coach: "丙",
        robotWeight: 1.25,
        rounds: [
          completeRound(82, { tunnel: 50, autoCharging: 50 }),
          completeRound(11, { tunnel: 50 }),
        ],
      },
    ],
    awardCountsByGroup: { 小学组: { first: 1, second: 0, third: 0 } },
  });

  const table = await workbook.inspect({
    kind: "table",
    sheetId: "小学组成绩表",
    range: "A1:O3",
    tableMaxRows: 3,
    tableMaxCols: 15,
  });

  assert(table.ndjson.includes("第二十六届广东省青少年机器人竞赛-道路工程比赛成绩表（小学组）"));
  assert(table.ndjson.includes("G01"));
  assert(table.ndjson.includes("D2026001"));
  assert(table.ndjson.includes("一等奖"));
  assert(table.ndjson.includes("12200"));
});
