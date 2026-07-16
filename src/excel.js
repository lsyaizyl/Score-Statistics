import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import {
  GROUPS,
  REQUIRED_ROSTER_COLUMNS,
  ROAD_TASKS,
  buildGroupResults,
  createEntryFromRoster,
  validateRosterRows,
} from "./core.js";

const SUMMARY_HEADERS = [
  "组别",
  "排名",
  "奖项",
  "队伍名称",
  "学校",
  "选手A",
  "选手B",
  "指导教师",
  "第一轮总分",
  "第二轮总分",
  "总成绩",
  "第一轮用时(秒)",
  "第二轮用时(秒)",
  "总用时(秒)",
  "机器人重量(kg)",
];

export async function readRosterWorkbook(inputPath) {
  const input = await FileBlob.load(inputPath);
  const workbook = await SpreadsheetFile.importXlsx(input);
  const sheetOverview = await workbook.inspect({ kind: "sheet", include: "name", maxChars: 2000 });
  const firstSheet = parseNdjson(sheetOverview.ndjson).find((record) => record.kind === "sheet");
  if (!firstSheet?.name) {
    return { missingColumns: [], issues: [{ type: "empty-workbook", message: "工作簿没有可读取的工作表" }], validRows: [] };
  }

  const table = await workbook.inspect({
    kind: "table",
    sheetId: firstSheet.name,
    tableMaxRows: 1000,
    tableMaxCols: 30,
    tableMaxCellChars: 200,
    maxChars: 200000,
  });
  const tableRecord = parseNdjson(table.ndjson).find((record) => record.kind === "table");
  const rows = rowsFromMatrix(tableRecord?.values ?? []);
  const validation = validateRosterRows(rows);
  return {
    ...validation,
    validRows: validation.validRows.map(createEntryFromRoster),
  };
}

export async function createScoreWorkbook({ entries, awardCountsByGroup = {} }) {
  const workbook = Workbook.create();
  const groups = buildGroupResults(entries, awardCountsByGroup);
  addSummarySheet(workbook, groups);

  for (const group of GROUPS) {
    addFinalScoreSheet(workbook, group, groups[group]);
    addPublicSheet(workbook, group, groups[group]);
    addSignatureSheet(workbook, group, groups[group]);
  }

  return workbook;
}

export async function saveScoreWorkbook({ entries, awardCountsByGroup = {}, outputPath }) {
  const workbook = await createScoreWorkbook({ entries, awardCountsByGroup });
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);
  return outputPath;
}

export function createRosterTemplateWorkbook() {
  const workbook = Workbook.create();
  const sheet = workbook.worksheets.add("名单模板");
  sheet.showGridLines = false;
  const headers = [...REQUIRED_ROSTER_COLUMNS, "编号", "备注"];
  const rows = [
    headers,
    ["小学组", "示例小学队", "示例小学", "学生A", "学生B", "指导教师", "1", ""],
    ["初中组", "示例初中队", "示例初中", "学生A", "学生B", "指导教师", "2", ""],
    ["高中组", "示例高中队", "示例高中", "学生A", "学生B", "指导教师", "3", ""],
  ];
  writeMatrix(sheet, rows);
  styleTable(sheet, rows.length, headers.length, "#184E5A");
  sheet.freezePanes.freezeRows(1);

  const guide = workbook.worksheets.add("填写说明");
  guide.showGridLines = false;
  guide.getRange("A1:D8").values = [
    ["道路工程参赛名单模板说明", "", "", ""],
    ["必填列", REQUIRED_ROSTER_COLUMNS.join("、"), "", ""],
    ["组别取值", GROUPS.join("、"), "", ""],
    ["队伍名称", "同一组别内不能重复。", "", ""],
    ["编号", "可选，用于保留赛场编号或出场顺序。", "", ""],
    ["备注", "可选，用于临时说明。", "", ""],
    ["导入方式", "请保留第一行表头，从第二行开始填写队伍。", "", ""],
    ["注意", "请勿合并名单数据区域内的单元格。", "", ""],
  ];
  guide.getRange("A1:D1").merge();
  guide.getRange("A1:D1").format = {
    fill: "#E8F3F5",
    font: { bold: true, color: "#14343A", size: 16 },
    horizontalAlignment: "center",
  };
  guide.getRange("A2:B8").format = {
    borders: { preset: "all", style: "thin", color: "#D7E1E3" },
    wrapText: true,
  };
  guide.getRange("A2:A8").format = { fill: "#184E5A", font: { bold: true, color: "#FFFFFF" } };
  guide.getRange("A:D").format.autofitColumns();
  guide.getRange("A:D").format.autofitRows();
  return workbook;
}

function rowsFromMatrix(matrix) {
  if (!matrix.length) {
    return [];
  }
  const headers = matrix[0].map((value) => String(value ?? "").trim());
  return matrix
    .slice(1)
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function addSummarySheet(workbook, groups) {
  const sheet = workbook.worksheets.add("总汇总");
  sheet.showGridLines = false;
  const rows = [SUMMARY_HEADERS];
  for (const group of GROUPS) {
    rows.push(...groups[group].teams.map(summaryRow));
  }
  writeMatrix(sheet, rows);
  styleTable(sheet, rows.length, SUMMARY_HEADERS.length, "#184E5A");
  sheet.freezePanes.freezeRows(1);
}

function addFinalScoreSheet(workbook, group, result) {
  const sheet = workbook.worksheets.add(`${group}最终成绩`);
  sheet.showGridLines = false;
  const rows = [
    [`道路工程${group}最终成绩表`, "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["奖项名额", `一等奖 ${result.awardCounts.first}`, `二等奖 ${result.awardCounts.second}`, `三等奖 ${result.awardCounts.third}`, "", "", "", "", "", "", "", "", "", ""],
    SUMMARY_HEADERS,
    ...result.teams.map(summaryRow),
  ];
  writeMatrix(sheet, rows);
  sheet.getRange("A1:N1").merge();
  sheet.getRange("A1:N1").format = {
    fill: "#E8F3F5",
    font: { bold: true, color: "#14343A", size: 16 },
    horizontalAlignment: "center",
  };
  sheet.getRange("A2:D2").format = { fill: "#F5F0E6", font: { bold: true, color: "#4D3A17" } };
  styleTable(sheet, rows.length, SUMMARY_HEADERS.length, "#184E5A", 3);
  sheet.freezePanes.freezeRows(3);
}

function addPublicSheet(workbook, group, result) {
  const sheet = workbook.worksheets.add(`${group}公示表`);
  sheet.showGridLines = false;
  const headers = ["排名", "奖项", "队伍名称", "学校", "第一轮总分", "第二轮总分", "总成绩", "总用时(秒)", "备注"];
  const rows = [
    [`道路工程${group}成绩公示表`, "", "", "", "", "", "", "", ""],
    headers,
    ...result.teams.map((team) => [
      team.rank ?? "",
      team.award,
      team.teamName,
      team.school,
      team.roundTotals[0],
      team.roundTotals[1],
      team.totalScore,
      team.totalSeconds,
      team.eliminated ? "两轮成绩之和为0分，不参与评奖" : "",
    ]),
  ];
  writeMatrix(sheet, rows);
  sheet.getRange("A1:I1").merge();
  sheet.getRange("A1:I1").format = {
    fill: "#E8F3F5",
    font: { bold: true, color: "#14343A", size: 16 },
    horizontalAlignment: "center",
  };
  styleTable(sheet, rows.length, headers.length, "#184E5A", 2);
}

function addSignatureSheet(workbook, group, result) {
  const sheet = workbook.worksheets.add(`${group}签名表`);
  sheet.showGridLines = false;
  const headers = ["排名", "奖项", "队伍名称", "学校", "总成绩", "总用时(秒)", "裁判签名", "裁判长签名"];
  const rows = [
    [`道路工程${group}成绩签名表`, "", "", "", "", "", "", ""],
    headers,
    ...result.teams.map((team) => [
      team.rank ?? "",
      team.award,
      team.teamName,
      team.school,
      team.totalScore,
      team.totalSeconds,
      "",
      "",
    ]),
    ["", "", "", "", "", "", "裁判长确认：", ""],
    ["", "", "", "", "", "", "日期：", ""],
  ];
  writeMatrix(sheet, rows);
  sheet.getRange("A1:H1").merge();
  sheet.getRange("A1:H1").format = {
    fill: "#E8F3F5",
    font: { bold: true, color: "#14343A", size: 16 },
    horizontalAlignment: "center",
  };
  styleTable(sheet, rows.length, headers.length, "#184E5A", 2);
  const lastRowsStart = Math.max(3, rows.length - 1);
  sheet.getRange(`G${lastRowsStart}:H${rows.length}`).format = {
    fill: "#FFFDF7",
    borders: { preset: "outside", style: "thin", color: "#BCA66A" },
  };
}

function summaryRow(team) {
  return [
    team.group,
    team.rank ?? "",
    team.award ?? "",
    team.teamName,
    team.school,
    team.studentA ?? "",
    team.studentB ?? "",
    team.coach ?? "",
    team.roundTotals[0],
    team.roundTotals[1],
    team.totalScore,
    team.rounds[0].seconds,
    team.rounds[1].seconds,
    team.totalSeconds,
    team.robotWeight,
  ];
}

function writeMatrix(sheet, rows) {
  if (!rows.length) {
    return;
  }
  const colCount = Math.max(...rows.map((row) => row.length));
  const normalizedRows = rows.map((row) => row.concat(Array.from({ length: colCount - row.length }, () => "")));
  sheet.getRangeByIndexes(0, 0, normalizedRows.length, colCount).values = normalizedRows;
  const used = sheet.getRangeByIndexes(0, 0, normalizedRows.length, colCount);
  used.format.wrapText = true;
  used.format.verticalAlignment = "center";
  used.format.autofitColumns();
  used.format.autofitRows();
}

function styleTable(sheet, rowCount, colCount, headerFill, headerRow = 1) {
  if (rowCount < headerRow) {
    return;
  }
  const header = sheet.getRangeByIndexes(headerRow - 1, 0, 1, colCount);
  header.format = {
    fill: headerFill,
    font: { bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    borders: { preset: "all", style: "thin", color: "#C8D8DC" },
  };
  if (rowCount > headerRow) {
    const body = sheet.getRangeByIndexes(headerRow, 0, rowCount - headerRow, colCount);
    body.format = {
      borders: {
        insideHorizontal: { style: "thin", color: "#D7E1E3" },
        insideVertical: { style: "thin", color: "#E3EAEC" },
        bottom: { style: "thin", color: "#B8C9CE" },
        left: { style: "thin", color: "#B8C9CE" },
        right: { style: "thin", color: "#B8C9CE" },
      },
    };
  }
  const numericColumns = ["I", "J", "K", "L", "M", "N", "O"];
  for (const column of numericColumns) {
    try {
      sheet.getRange(`${column}:${column}`).format.numberFormat = "0";
    } catch {
      // Some compact sheets do not have all numeric columns. Formatting is optional here.
    }
  }
}

function parseNdjson(ndjson) {
  return String(ndjson ?? "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
