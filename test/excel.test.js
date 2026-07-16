import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import { createScoreWorkbook, readRosterWorkbook } from "../src/excel.js";
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
    range: "A1:N8",
    tableMaxRows: 8,
    tableMaxCols: 14,
  });
  assert(summary.ndjson.includes("A队"));
  assert(summary.ndjson.includes("一等奖"));
  assert(summary.ndjson.includes("淘汰队"));
  assert(summary.ndjson.includes("淘汰"));
});
