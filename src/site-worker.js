import {
  GROUPS,
  REQUIRED_ROSTER_COLUMNS,
  ROAD_TASKS,
  buildGroupResults,
  createEntryFromRoster,
  validateRosterRows,
} from "./core.js";

const STATIC_ASSETS = __STATIC_ASSETS__;
const xlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

const summaryHeaders = [
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

export default {
  async fetch(request) {
    return handleRequest(request);
  },
};

export async function handleRequest(request) {
  try {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/config") {
      return jsonResponse({ groups: GROUPS, tasks: ROAD_TASKS });
    }

    if (request.method === "GET" && url.pathname === "/api/template") {
      const bytes = createWorkbook(templateSheets());
      return xlsxResponse(bytes, "道路工程参赛名单模板.xlsx");
    }

    if (request.method === "POST" && url.pathname === "/api/roster") {
      return importRosterResponse(request);
    }

    if (request.method === "POST" && url.pathname === "/api/export") {
      const payload = await readJson(request);
      const bytes = createWorkbook(scorePackageSheets({
        entries: Array.isArray(payload.entries) ? payload.entries : [],
        awardCountsByGroup: payload.awardCountsByGroup ?? {},
      }));
      return xlsxResponse(bytes, `道路工程成绩包-${dateStamp()}.xlsx`);
    }

    if (request.method === "GET") {
      return staticResponse(url.pathname);
    }

    return jsonResponse({ error: "Method Not Allowed" }, 405);
  } catch (error) {
    return jsonResponse({ error: error.message || "服务处理失败" }, 500);
  }
}

async function importRosterResponse(request) {
  const payload = await readJson(request);
  if (!payload.base64) {
    return jsonResponse({ error: "缺少 base64 文件内容" }, 400);
  }

  try {
    const bytes = base64ToBytes(stripDataUrlPrefix(payload.base64));
    const matrix = await firstWorksheetMatrix(bytes);
    const validation = validateRosterRows(rowsFromMatrix(matrix));
    return jsonResponse({
      ...validation,
      validRows: validation.validRows.map(createEntryFromRoster),
    });
  } catch (error) {
    return jsonResponse({ error: `名单文件读取失败：${error.message}` }, 400);
  }
}

function staticResponse(pathname) {
  const decoded = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  const assetName = decoded.replace(/^\/+/, "");
  if (!assetName || assetName.includes("..") || !STATIC_ASSETS[assetName]) {
    return jsonResponse({ error: "Not Found" }, 404);
  }

  return new Response(STATIC_ASSETS[assetName], {
    headers: {
      "content-type": contentType(assetName),
      "cache-control": assetName === "index.html" ? "no-cache" : "public, max-age=300",
    },
  });
}

function templateSheets() {
  return [
    {
      name: "名单模板",
      rows: [
        [...REQUIRED_ROSTER_COLUMNS, "编号", "备注"],
        ["小学组", "示例小学队", "示例小学", "学生A", "学生B", "指导教师", "1", ""],
        ["初中组", "示例初中队", "示例初中", "学生A", "学生B", "指导教师", "2", ""],
        ["高中组", "示例高中队", "示例高中", "学生A", "学生B", "指导教师", "3", ""],
      ],
    },
    {
      name: "填写说明",
      rows: [
        ["道路工程参赛名单模板说明", ""],
        ["必填列", REQUIRED_ROSTER_COLUMNS.join("、")],
        ["组别取值", GROUPS.join("、")],
        ["队伍名称", "同一组别内不应重复。"],
        ["编号", "可选，用于保留赛场编号或出场顺序。"],
        ["备注", "可选，用于临时说明。"],
        ["导入方式", "保留第一行表头，从第二行开始填写队伍。"],
      ],
    },
  ];
}

function scorePackageSheets({ entries, awardCountsByGroup }) {
  const groups = buildGroupResults(entries, awardCountsByGroup);
  const sheets = [
    {
      name: "总汇总",
      rows: [
        summaryHeaders,
        ...GROUPS.flatMap((group) => groups[group].teams.map(summaryRow)),
      ],
    },
  ];

  for (const group of GROUPS) {
    const result = groups[group];
    sheets.push({
      name: `${group}最终成绩`,
      rows: [
        [`道路工程${group}最终成绩表`],
        ["奖项名额", `一等奖 ${result.awardCounts.first}`, `二等奖 ${result.awardCounts.second}`, `三等奖 ${result.awardCounts.third}`],
        summaryHeaders,
        ...result.teams.map(summaryRow),
      ],
    });
    sheets.push({
      name: `${group}公示表`,
      rows: [
        [`道路工程${group}成绩公示表`],
        ["排名", "奖项", "队伍名称", "学校", "第一轮总分", "第二轮总分", "总成绩", "总用时(秒)", "备注"],
        ...result.teams.map((team) => [
          team.rank ?? "",
          team.award ?? "",
          team.teamName,
          team.school,
          completedValue(team, team.roundTotals?.[0]),
          completedValue(team, team.roundTotals?.[1]),
          completedValue(team, team.totalScore),
          completedValue(team, team.totalSeconds),
          team.eliminated ? "两轮成绩之和为 0 分，不参与评奖" : "",
        ]),
      ],
    });
    sheets.push({
      name: `${group}签名表`,
      rows: [
        [`道路工程${group}成绩签名表`],
        ["排名", "奖项", "队伍名称", "学校", "总成绩", "总用时(秒)", "裁判签名", "裁判长签名"],
        ...result.teams.map((team) => [
          team.rank ?? "",
          team.award ?? "",
          team.teamName,
          team.school,
          completedValue(team, team.totalScore),
          completedValue(team, team.totalSeconds),
          "",
          "",
        ]),
        ["", "", "", "", "", "", "裁判长确认：", ""],
        ["", "", "", "", "", "", "日期：", ""],
      ],
    });
  }

  return sheets;
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
    completedValue(team, team.roundTotals?.[0]),
    completedValue(team, team.roundTotals?.[1]),
    completedValue(team, team.totalScore),
    completedValue(team, team.rounds?.[0]?.seconds),
    completedValue(team, team.rounds?.[1]?.seconds),
    completedValue(team, team.totalSeconds),
    team.robotWeight ?? "",
  ];
}

function completedValue(team, value) {
  return team.complete === false ? "" : value ?? "";
}

function createWorkbook(sheets) {
  const safeSheets = sheets.map((sheet, index) => ({
    ...sheet,
    name: safeSheetName(sheet.name || `Sheet${index + 1}`),
  }));
  const files = [
    { name: "[Content_Types].xml", data: contentTypesXml(safeSheets) },
    { name: "_rels/.rels", data: rootRelsXml() },
    { name: "docProps/app.xml", data: appPropsXml(safeSheets) },
    { name: "docProps/core.xml", data: corePropsXml() },
    { name: "xl/workbook.xml", data: workbookXml(safeSheets) },
    { name: "xl/_rels/workbook.xml.rels", data: workbookRelsXml(safeSheets) },
    ...safeSheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: worksheetXml(sheet.rows),
    })),
  ];
  return createZip(files);
}

function contentTypesXml(sheets) {
  return xmlDocument(`\
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("\n  ")}
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`);
}

function rootRelsXml() {
  return xmlDocument(`\
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);
}

function appPropsXml(sheets) {
  return xmlDocument(`\
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Road Engineering Score Tool</Application>
  <TitlesOfParts>
    <vt:vector size="${sheets.length}" baseType="lpstr">
      ${sheets.map((sheet) => `<vt:lpstr>${escapeXml(sheet.name)}</vt:lpstr>`).join("\n      ")}
    </vt:vector>
  </TitlesOfParts>
</Properties>`);
}

function corePropsXml() {
  return xmlDocument(`\
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>道路工程成绩统计</dc:title>
  <dc:creator>Road Engineering Score Tool</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
</cp:coreProperties>`);
}

function workbookXml(sheets) {
  return xmlDocument(`\
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("\n    ")}
  </sheets>
</workbook>`);
}

function workbookRelsXml(sheets) {
  return xmlDocument(`\
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("\n  ")}
</Relationships>`);
}

function worksheetXml(rows) {
  const normalizedRows = rows.map((row) => (Array.isArray(row) ? row : [row]));
  const maxColumns = Math.max(1, ...normalizedRows.map((row) => row.length));
  const dimension = `A1:${columnName(maxColumns)}${Math.max(1, normalizedRows.length)}`;
  const rowXml = normalizedRows.map((row, rowIndex) => {
    const rowNumber = rowIndex + 1;
    const cells = Array.from({ length: maxColumns }, (_, columnIndex) => cellXml(row[columnIndex], rowNumber, columnIndex + 1)).join("");
    return `<row r="${rowNumber}">${cells}</row>`;
  }).join("");

  return xmlDocument(`\
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${dimension}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <sheetData>${rowXml}</sheetData>
</worksheet>`);
}

function cellXml(value, rowNumber, columnNumber) {
  const ref = `${columnName(columnNumber)}${rowNumber}`;
  if (value === null || value === undefined || value === "") {
    return `<c r="${ref}"/>`;
  }
  const number = Number(value);
  if (typeof value === "number" || (String(value).trim() !== "" && Number.isFinite(number) && !/^0\d+/.test(String(value)))) {
    return `<c r="${ref}"><v>${number}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(String(value))}</t></is></c>`;
}

function xmlDocument(body) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${body}`;
}

async function firstWorksheetMatrix(xlsxBytes) {
  const files = await readZip(xlsxBytes);
  const workbook = parseXmlFile(files, "xl/workbook.xml");
  const rels = parseRelationships(parseXmlFile(files, "xl/_rels/workbook.xml.rels"));
  const sheets = tags(workbook, "sheet").map((tag) => parseAttributes(tag));
  const firstSheet = sheets[0];
  if (!firstSheet?.["r:id"]) {
    throw new Error("工作簿没有可读取的工作表");
  }
  const target = rels.get(firstSheet["r:id"]);
  if (!target) {
    throw new Error("工作表关系缺失");
  }
  const sheetPath = normalizeWorkbookTarget(target);
  const sharedStrings = files.has("xl/sharedStrings.xml")
    ? parseSharedStrings(parseXmlFile(files, "xl/sharedStrings.xml"))
    : [];
  return parseWorksheet(parseXmlFile(files, sheetPath), sharedStrings);
}

async function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findEndOfCentralDirectory(view);
  const entryCount = view.getUint16(eocdOffset + 10, true);
  const centralOffset = view.getUint32(eocdOffset + 16, true);
  const files = new Map();
  let offset = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error("ZIP 中央目录损坏");
    }
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = textDecoder.decode(bytes.slice(offset + 46, offset + 46 + fileNameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null;
    if (!data) {
      throw new Error(`不支持的 ZIP 压缩方式：${method}`);
    }
    files.set(name, data);
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return files;
}

function findEndOfCentralDirectory(view) {
  const minOffset = Math.max(0, view.byteLength - 66000);
  for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      return offset;
    }
  }
  throw new Error("不是有效的 XLSX 文件");
}

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function parseXmlFile(files, path) {
  const bytes = files.get(path);
  if (!bytes) {
    throw new Error(`XLSX 内缺少 ${path}`);
  }
  return textDecoder.decode(bytes);
}

function parseRelationships(xml) {
  const result = new Map();
  for (const tag of tags(xml, "Relationship")) {
    const attrs = parseAttributes(tag);
    if (attrs.Id && attrs.Target) {
      result.set(attrs.Id, attrs.Target);
    }
  }
  return result;
}

function parseSharedStrings(xml) {
  return blocks(xml, "si").map((block) => textRuns(block).join(""));
}

function parseWorksheet(xml, sharedStrings) {
  const rows = [];
  for (const rowBlock of blocks(xml, "row")) {
    const row = [];
    for (const cellTag of cellTags(rowBlock)) {
      const tagEnd = cellTag.indexOf(">");
      const attrs = parseAttributes(cellTag.slice(0, tagEnd + 1));
      const body = cellTag.slice(tagEnd + 1, cellTag.lastIndexOf("</c>"));
      const column = attrs.r ? columnIndex(attrs.r.replace(/\d+/g, "")) : row.length;
      row[column] = cellValue(attrs, body, sharedStrings);
    }
    rows.push(row.map((value) => value ?? ""));
  }
  return rows;
}

function cellTags(xml) {
  return [...xml.matchAll(new RegExp(`<${qualifiedName("c")}\\b[\\s\\S]*?<\\/${qualifiedName("c")}>`, "g"))].map((match) => match[0]);
}

function cellValue(attrs, body, sharedStrings) {
  if (attrs.t === "s") {
    return sharedStrings[Number(firstTagText(body, "v"))] ?? "";
  }
  if (attrs.t === "inlineStr") {
    return textRuns(body).join("");
  }
  return decodeXml(firstTagText(body, "v"));
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

function tags(xml, tagName) {
  return [...xml.matchAll(new RegExp(`<${qualifiedName(tagName)}\\b[^>]*\\/?>`, "g"))].map((match) => match[0]);
}

function blocks(xml, tagName) {
  return [...xml.matchAll(new RegExp(`<${qualifiedName(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${qualifiedName(tagName)}>`, "g"))].map((match) => match[1]);
}

function parseAttributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:]+)="([^"]*)"/g)].map((match) => [match[1], decodeXml(match[2])]));
}

function textRuns(xml) {
  const runs = [...xml.matchAll(new RegExp(`<${qualifiedName("t")}\\b[^>]*>([\\s\\S]*?)<\\/${qualifiedName("t")}>`, "g"))].map((match) => decodeXml(match[1]));
  return runs.length ? runs : [decodeXml(xml.replace(/<[^>]+>/g, ""))];
}

function firstTagText(xml, tagName) {
  const match = xml.match(new RegExp(`<${qualifiedName(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${qualifiedName(tagName)}>`));
  return match ? decodeXml(match[1]) : "";
}

function qualifiedName(tagName) {
  return `(?:[\\w.-]+:)?${tagName}`;
}

function normalizeWorkbookTarget(target) {
  const cleaned = target.replace(/^\/+/, "");
  return cleaned.startsWith("xl/") ? cleaned : `xl/${cleaned}`;
}

function createZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const now = dosDateTime(new Date());

  for (const file of files) {
    const nameBytes = textEncoder.encode(file.name);
    const data = typeof file.data === "string" ? textEncoder.encode(file.data) : file.data;
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, now.time, true);
    localView.setUint16(12, now.date, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    chunks.push(local, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, now.time, true);
    centralView.setUint16(14, now.date, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    central.push(centralHeader);
    offset += local.length + data.length;
  }

  const centralOffset = offset;
  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);
  return concatBytes([...chunks, ...central, end]);
}

function concatBytes(chunks) {
  const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function dosDateTime(date) {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
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

function columnIndex(name) {
  let index = 0;
  for (const char of name.toUpperCase()) {
    index = index * 26 + char.charCodeAt(0) - 64;
  }
  return Math.max(0, index - 1);
}

function safeSheetName(value) {
  return String(value).replace(/[\[\]:*?/\\]/g, " ").slice(0, 31) || "Sheet";
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decodeXml(value) {
  return String(value ?? "")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function stripDataUrlPrefix(base64) {
  return String(base64).includes(",") ? String(base64).split(",").pop() : String(base64);
}

async function readJson(request) {
  const text = await request.text();
  return text ? JSON.parse(text) : {};
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function xlsxResponse(bytes, filename) {
  return new Response(bytes, {
    headers: {
      "content-type": xlsxMime,
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "content-length": String(bytes.length),
    },
  });
}

function contentType(pathname) {
  if (pathname.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (pathname.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (pathname.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }
  return "application/octet-stream";
}

function dateStamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ].join("");
}
