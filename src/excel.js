import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import {
  GROUPS,
  OFFICIAL_SCORE_HEADERS,
  ROSTER_TEMPLATE_COLUMNS,
  ROAD_TASKS,
  buildGroupResults,
  buildOfficialScoreSheets,
  createEntryFromRoster,
  officialScoreTitle,
  validateRosterRows,
} from "./core.js";

const SUMMARY_HEADERS = [
  "组别",
  "排名",
  "奖项",
  "抽签号",
  "地市",
  "队伍名称",
  "学校",
  "选手A",
  "选手B",
  "指导教师",
  "教练员联系方式",
  "第一轮总分",
  "第二轮总分",
  "总成绩",
  "第一轮用时(秒)",
  "第二轮用时(秒)",
  "总用时(秒)",
  "机器人重量(kg)",
];

const ROSTER_SHEET_PATTERN = /队伍抽签名单|参赛名单|名单/i;
const NON_ROSTER_SHEET_PATTERN = /成绩表|物料|贴桌面|赛板/i;

export async function readRosterWorkbook(inputPath) {
  const input = await FileBlob.load(inputPath);
  const workbook = await SpreadsheetFile.importXlsx(input);
  const sheetOverview = await workbook.inspect({ kind: "sheet", include: "name", maxChars: 10000 });
  const sheetNames = parseNdjson(sheetOverview.ndjson)
    .filter((record) => record.kind === "sheet" && record.name)
    .map((record) => record.name);
  if (!sheetNames.length) {
    return { missingColumns: [], issues: [{ type: "empty-workbook", message: "工作簿没有可读取的工作表" }], validRows: [] };
  }

  const rows = [];
  const scannedSheets = [];
  for (const sheetName of selectRosterSheets(sheetNames)) {
    const table = await workbook.inspect({
      kind: "table",
      sheetId: sheetName,
      tableMaxRows: 1200,
      tableMaxCols: 40,
      tableMaxCellChars: 300,
      maxChars: 300000,
    });
    const tableRecord = parseNdjson(table.ndjson).find((record) => record.kind === "table");
    const sheetRows = rowsFromMatrix(tableRecord?.values ?? [], sheetName);
    scannedSheets.push({ name: sheetName, rows: sheetRows.length });
    rows.push(...sheetRows);
  }

  const validation = validateRosterRows(rows);
  return {
    ...validation,
    scannedSheets,
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

export async function createOfficialScoreWorkbook({ entries, awardCountsByGroup = {}, templatePath = "" }) {
  const workbook = templatePath
    ? await SpreadsheetFile.importXlsx(await FileBlob.load(templatePath))
    : Workbook.create();
  const existingRowsBySheet = templatePath ? await readOfficialScoreSheetRows(workbook) : {};
  const scoreSheets = buildOfficialScoreSheets(entries, awardCountsByGroup, existingRowsBySheet);
  const existingSheetNames = new Set(await workbookSheetNames(workbook));

  for (const scoreSheet of scoreSheets) {
    const sheet = existingSheetNames.has(scoreSheet.name)
      ? workbook.worksheets.getItem(scoreSheet.name)
      : workbook.worksheets.add(scoreSheet.name);
    writeOfficialScoreSheet(sheet, scoreSheet, existingSheetNames.has(scoreSheet.name));
  }

  return workbook;
}

export async function saveScoreWorkbook({ entries, awardCountsByGroup = {}, outputPath }) {
  const workbook = await createScoreWorkbook({ entries, awardCountsByGroup });
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);
  return outputPath;
}

export async function saveOfficialScoreWorkbook({ entries, awardCountsByGroup = {}, templatePath = "", outputPath }) {
  const workbook = await createOfficialScoreWorkbook({ entries, awardCountsByGroup, templatePath });
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);
  return outputPath;
}

export function createRosterTemplateWorkbook() {
  const workbook = Workbook.create();
  const sheet = workbook.worksheets.add("名单模板");
  sheet.showGridLines = false;
  const headers = ROSTER_TEMPLATE_COLUMNS;
  const rows = [
    headers,
    ["小学组", "1", "珠海市", "示例小学", "学生A、学生B", "指导教师", "13800000000", "A01", "示例小学（学生A、学生B）", ""],
    ["初中组", "2", "广州市", "示例初中", "学生A、学生B", "指导教师", "13900000000", "B01", "示例初中（学生A、学生B）", ""],
    ["高中组", "3", "深圳市", "示例高中", "学生A、学生B", "指导教师", "13700000000", "C01", "示例高中（学生A、学生B）", ""],
  ];
  writeMatrix(sheet, rows);
  styleTable(sheet, rows.length, headers.length, "#184E5A");
  sheet.freezePanes.freezeRows(1);

  const guide = workbook.worksheets.add("填写说明");
  guide.showGridLines = false;
  guide.getRange("A1:D8").values = [
    ["道路工程参赛名单模板说明", "", "", ""],
    ["必填列", "序号、地市、学校全称、参赛选手、教练员、教练员联系方式", "", ""],
    ["组别取值", GROUPS.join("、"), "", ""],
    ["队伍名称", "可选；留空时会自动用“学校全称（参赛选手）”生成。", "", ""],
    ["抽签号", "可选；导入后作为页面和导出表中的抽签号，空白时保持空白。", "", ""],
    ["参赛选手", "两名选手可用“、”或逗号分隔，会自动拆分为选手A和选手B。", "", ""],
    ["导入方式", "支持直接导入含“队伍抽签名单-小学/初中/高中”工作表的成绩表。", "", ""],
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

function rowsFromMatrix(matrix, sheetName = "") {
  if (!matrix.length) {
    return [];
  }
  const headerIndex = findRosterHeaderRowIndex(matrix);
  if (headerIndex < 0) {
    return [];
  }
  const headers = matrix[headerIndex].map((value) => String(value ?? "").trim());
  return matrix.slice(headerIndex + 1).flatMap((row, rowOffset) => {
    if (!row.some((cell) => String(cell ?? "").trim() !== "")) {
      return [];
    }
    const record = {};
    headers.forEach((header, index) => {
      if (header) {
        record[header] = row[index] ?? "";
      }
    });
    record.__sheetName = sheetName;
    record.__rowNumber = headerIndex + rowOffset + 2;
    return record;
  });
}

function selectRosterSheets(sheetNames) {
  const namedRosterSheets = sheetNames.filter((name) => ROSTER_SHEET_PATTERN.test(name) && !NON_ROSTER_SHEET_PATTERN.test(name));
  if (namedRosterSheets.length) {
    return namedRosterSheets;
  }
  const plausibleSheets = sheetNames.filter((name) => !NON_ROSTER_SHEET_PATTERN.test(name));
  return plausibleSheets.length ? plausibleSheets : sheetNames.slice(0, 1);
}

function findRosterHeaderRowIndex(matrix) {
  let best = { index: -1, score: 0 };
  for (let index = 0; index < Math.min(matrix.length, 10); index += 1) {
    const cells = new Set(matrix[index].map((value) => String(value ?? "").trim()).filter(Boolean));
    const hasSchool = cells.has("学校") || cells.has("学校全称") || cells.has("学校名称");
    const hasStudents = cells.has("参赛选手") || cells.has("选手") || cells.has("参赛学生");
    const hasTeam = cells.has("队伍名称") || cells.has("队伍名") || cells.has("队名");
    const hasGroup = cells.has("组别");
    const hasCoach = cells.has("指导教师") || cells.has("教练员");
    const score = (hasSchool ? 2 : 0)
      + (hasStudents ? 2 : 0)
      + (hasTeam ? 2 : 0)
      + (hasGroup ? 1 : 0)
      + (hasCoach ? 1 : 0)
      + (cells.has("序号") ? 1 : 0)
      + (cells.has("教练员联系方式") ? 1 : 0);
    if ((hasSchool && hasStudents) || (hasGroup && hasTeam)) {
      if (score > best.score) {
        best = { index, score };
      }
    }
  }
  return best.index;
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
    [`道路工程${group}最终成绩表`],
    ["奖项名额", `一等奖 ${result.awardCounts.first}`, `二等奖 ${result.awardCounts.second}`, `三等奖 ${result.awardCounts.third}`],
    SUMMARY_HEADERS,
    ...result.teams.map(summaryRow),
  ];
  writeMatrix(sheet, rows);
  const titleRange = `A1:${columnName(SUMMARY_HEADERS.length)}1`;
  sheet.getRange(titleRange).merge();
  sheet.getRange(titleRange).format = {
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
  const headers = ["排名", "奖项", "抽签号", "地市", "队伍名称", "学校", "第一轮总分", "第二轮总分", "总成绩", "总用时(秒)", "备注"];
  const rows = [
    [`道路工程${group}成绩公示表`],
    headers,
    ...result.teams.map((team) => [
      team.rank ?? "",
      team.award,
      team.number ?? "",
      team.city ?? "",
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
  const titleRange = `A1:${columnName(headers.length)}1`;
  sheet.getRange(titleRange).merge();
  sheet.getRange(titleRange).format = {
    fill: "#E8F3F5",
    font: { bold: true, color: "#14343A", size: 16 },
    horizontalAlignment: "center",
  };
  styleTable(sheet, rows.length, headers.length, "#184E5A", 2);
}

function addSignatureSheet(workbook, group, result) {
  const sheet = workbook.worksheets.add(`${group}签名表`);
  sheet.showGridLines = false;
  const headers = ["排名", "奖项", "抽签号", "地市", "队伍名称", "学校", "总成绩", "总用时(秒)", "裁判签名", "裁判长签名"];
  const rows = [
    [`道路工程${group}成绩签名表`],
    headers,
    ...result.teams.map((team) => [
      team.rank ?? "",
      team.award,
      team.number ?? "",
      team.city ?? "",
      team.teamName,
      team.school,
      team.totalScore,
      team.totalSeconds,
      "",
      "",
    ]),
    ["", "", "", "", "", "", "", "", "裁判长确认：", ""],
    ["", "", "", "", "", "", "", "", "日期：", ""],
  ];
  writeMatrix(sheet, rows);
  const titleRange = `A1:${columnName(headers.length)}1`;
  sheet.getRange(titleRange).merge();
  sheet.getRange(titleRange).format = {
    fill: "#E8F3F5",
    font: { bold: true, color: "#14343A", size: 16 },
    horizontalAlignment: "center",
  };
  styleTable(sheet, rows.length, headers.length, "#184E5A", 2);
  const lastRowsStart = Math.max(3, rows.length - 1);
  sheet.getRange(`I${lastRowsStart}:J${rows.length}`).format = {
    fill: "#FFFDF7",
    borders: { preset: "outside", style: "thin", color: "#BCA66A" },
  };
}

async function readOfficialScoreSheetRows(workbook) {
  const rowsBySheet = {};
  const sheetNames = await workbookSheetNames(workbook);
  for (const sheetName of sheetNames.filter((name) => name.endsWith("组成绩表"))) {
    const table = await workbook.inspect({
      kind: "table",
      sheetId: sheetName,
      tableMaxRows: 1200,
      tableMaxCols: OFFICIAL_SCORE_HEADERS.length,
      tableMaxCellChars: 300,
      maxChars: 300000,
    });
    const tableRecord = parseNdjson(table.ndjson).find((record) => record.kind === "table");
    rowsBySheet[sheetName] = tableRecord?.values ?? [];
  }
  return rowsBySheet;
}

async function workbookSheetNames(workbook) {
  const overview = await workbook.inspect({ kind: "sheet", include: "name", maxChars: 10000 });
  return parseNdjson(overview.ndjson)
    .filter((record) => record.kind === "sheet" && record.name)
    .map((record) => record.name);
}

function writeOfficialScoreSheet(sheet, scoreSheet, preserveTemplate) {
  sheet.showGridLines = false;
  const rows = scoreSheet.rows;
  const colCount = OFFICIAL_SCORE_HEADERS.length;
  const normalizedRows = rows.map((row) => row.concat(Array.from({ length: colCount - row.length }, () => "")));
  sheet.getRangeByIndexes(0, 0, normalizedRows.length, colCount).values = normalizedRows;
  writeOfficialScoreFormulas(sheet, normalizedRows.length);

  if (!preserveTemplate) {
    styleOfficialScoreSheet(sheet, scoreSheet.group, normalizedRows.length);
  } else {
    sheet.getRange("A1").values = [[officialScoreTitle(scoreSheet.group)]];
  }
}

function writeOfficialScoreFormulas(sheet, rowCount) {
  if (rowCount <= 2) {
    return;
  }
  const formulas = Array.from({ length: rowCount - 2 }, (_, index) => {
    const row = index + 3;
    return [officialTotalScoreFormula(row), officialTotalTimeFormula(row)];
  });
  sheet.getRangeByIndexes(2, 11, rowCount - 2, 2).formulas = formulas;
}

function officialTotalScoreFormula(row) {
  return `=IF(COUNTA(G${row},I${row})=0,"",G${row}+I${row})`;
}

function officialTotalTimeFormula(row) {
  const first = `(H${row}-INT(H${row}/10000)*4000)`;
  const second = `(J${row}-INT(J${row}/10000)*4000)`;
  const total = `(${first}+${second})`;
  return `=IF(COUNTA(H${row},J${row})=0,"",INT(${total}/6000)*10000+MOD(${total},6000))`;
}

function styleOfficialScoreSheet(sheet, group, rowCount) {
  const colCount = OFFICIAL_SCORE_HEADERS.length;
  writeMatrix(sheet, [
    [officialScoreTitle(group), ...Array.from({ length: colCount - 1 }, () => "")],
    OFFICIAL_SCORE_HEADERS,
  ]);
  sheet.getRange(`A1:${columnName(colCount)}1`).merge();
  sheet.getRange(`A1:${columnName(colCount)}1`).format = {
    font: { bold: true, size: 16 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
  sheet.getRange(`A2:${columnName(colCount)}2`).format = {
    font: { bold: true },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#000000" },
  };
  if (rowCount > 2) {
    sheet.getRangeByIndexes(2, 0, rowCount - 2, colCount).format = {
      borders: { preset: "all", style: "thin", color: "#000000" },
      verticalAlignment: "center",
      wrapText: true,
    };
    sheet.getRangeByIndexes(2, 7, rowCount - 2, 1).format.numberFormat = "0\\'00\\\"00";
    sheet.getRangeByIndexes(2, 9, rowCount - 2, 1).format.numberFormat = "0\\'00\\\"00";
    sheet.getRangeByIndexes(2, 12, rowCount - 2, 1).format.numberFormat = "0\\'00\\\"00";
  }
  sheet.freezePanes.freezeRows(2);
}

function summaryRow(team) {
  return [
    team.group,
    team.rank ?? "",
    team.award ?? "",
    team.number ?? "",
    team.city ?? "",
    team.teamName,
    team.school,
    team.studentA ?? "",
    team.studentB ?? "",
    team.coach ?? "",
    team.coachPhone ?? "",
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
  const numericColumns = Array.from({ length: Math.min(7, colCount) }, (_, index) => columnName(Math.max(1, colCount - 6 + index)));
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

function columnName(index) {
  let value = index;
  let name = "";
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}
