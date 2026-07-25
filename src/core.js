export const GROUPS = ["小学组", "初中组", "高中组"];

export const REQUIRED_ROSTER_COLUMNS = ["组别", "队伍名称", "学校", "选手A", "选手B", "指导教师"];
export const ROSTER_TEMPLATE_COLUMNS = ["组别", "序号", "地市", "学校全称", "参赛选手", "教练员", "教练员联系方式", "抽签号", "队伍名称", "备注"];
export const OFFICIAL_SCORE_OUTPUT_FILENAME = "26届省赛道路工程_成绩表.xlsx";
export const OFFICIAL_SCORE_SHEET_NAMES = {
  小学组: "小学组成绩表",
  初中组: "初中组成绩表",
  高中组: "高中组成绩表",
};
export const OFFICIAL_SCORE_HEADERS = [
  "出场\n序号",
  "系统编号",
  "地市",
  "学校名称",
  "参赛选手",
  "教练员",
  "第一轮\n分数",
  "第一轮\n完成时间",
  "第二轮\n分数",
  "第二轮\n完成时间",
  "重量",
  "总成绩",
  "总用时",
  "名次",
  "等次",
];

export const AWARDS = {
  first: "一等奖",
  second: "二等奖",
  third: "三等奖",
  eliminated: "淘汰",
  none: "",
};

export const ENTRY_WORKFLOW_STATUS = {
  unstarted: { key: "unstarted", label: "未录入" },
  inProgress: { key: "in-progress", label: "录入中" },
  needsWeight: { key: "needs-weight", label: "待补重量" },
  ready: { key: "ready", label: "待复核" },
  reviewed: { key: "reviewed", label: "已确认" },
  invalid: { key: "invalid", label: "有问题" },
};

export const ROAD_TASKS = [
  {
    key: "materialRecovery",
    name: "物料回收",
    allowedScores: [0, 30, 50],
    description: "指定区域50分，工程点黑框内30分。",
  },
  {
    key: "serviceArea",
    name: "建设服务区",
    allowedScores: [0, 30, 50, 80],
    allowedScoresByGroup: { 小学组: [0, 30, 50] },
    description: "小学组按红色纸杯完成度；初高中组按颜色和层级完成度。",
  },
  {
    key: "bridge",
    name: "搭建桥梁",
    allowedScores: [0, 30, 50, 80],
    allowedScoresByGroup: { 小学组: [0, 50] },
    description: "小学组任意两个原料堆叠50分；初高中组按堆叠与顺序计分。",
  },
  {
    key: "tunnel",
    name: "隧道挖掘",
    allowedScores: [0, 50],
    description: "驱动轮须在黑色隧道区域两侧通过。",
  },
  {
    key: "gasStation",
    name: "建设加油站",
    allowedScores: [0, 50],
    description: "泡沫球放在纸杯底上面。",
  },
  {
    key: "gravityGate",
    name: "重力闸口",
    allowedScores: [0, 50],
    description: "闸口横梁杆抬起，机器人循线通过。",
  },
  {
    key: "autoCharging",
    name: "自动充电",
    allowedScores: [0, 50],
    description: "机器人全部垂直投影在区域内且静态停止至少3秒。",
  },
];

const TASK_BY_KEY = new Map(ROAD_TASKS.map((task) => [task.key, task]));

export function allowedScoresForTask(task, group) {
  return task.allowedScoresByGroup?.[group] ?? task.allowedScores;
}

export function normalizeText(value) {
  return String(value ?? "").trim();
}

export function toNumber(value, fallback = 0) {
  if (value === "/" || value === null || value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const ROSTER_COLUMN_ALIASES = {
  group: ["组别"],
  teamName: ["队伍名称", "队伍名", "队名", "团队名称"],
  school: ["学校", "学校全称", "学校名称"],
  students: ["参赛选手", "选手", "参赛学生", "学生"],
  studentA: ["选手A", "选手 A", "学生A", "学生 A"],
  studentB: ["选手B", "选手 B", "学生B", "学生 B"],
  coach: ["指导教师", "教练员", "教练", "指导老师"],
  coachPhone: ["教练员联系方式", "联系方式", "联系电话", "手机号码", "手机号"],
  serial: ["序号", "出场序号"],
  systemId: ["系统编号"],
  number: ["编号", "队伍编号"],
  drawNumber: ["抽签号"],
  city: ["地市", "城市", "地区"],
  note: ["备注"],
};

const COMPETITION_ROSTER_REQUIRED_FIELDS = [
  ["序号", ROSTER_COLUMN_ALIASES.serial],
  ["地市", ROSTER_COLUMN_ALIASES.city],
  ["学校全称", ROSTER_COLUMN_ALIASES.school],
  ["参赛选手", ROSTER_COLUMN_ALIASES.students],
  ["教练员", ROSTER_COLUMN_ALIASES.coach],
  ["教练员联系方式", ROSTER_COLUMN_ALIASES.coachPhone],
];

export function validateRosterRows(rows) {
  const presentColumns = new Set(rows.flatMap((row) => Object.keys(row ?? {})));
  const missingColumns = detectMissingRosterColumns(presentColumns);
  const issues = [];
  const seen = new Set();
  const validRows = [];

  rows.forEach((row, index) => {
    const normalized = normalizeRosterRow(row, index);
    const rowIssues = [];

    if (!normalized.school && usesCompetitionRosterColumns(presentColumns)) {
      rowIssues.push({ type: "empty-school", rowNumber: normalized.rowNumber, message: "学校全称为空" });
    }
    if (!normalized.rawStudents && usesCompetitionRosterColumns(presentColumns)) {
      rowIssues.push({ type: "empty-students", rowNumber: normalized.rowNumber, message: "参赛选手为空" });
    }
    if (!normalized.teamName) {
      rowIssues.push({ type: "empty-team", rowNumber: normalized.rowNumber, message: "队伍名称为空" });
    }
    if (!GROUPS.includes(normalized.group)) {
      rowIssues.push({ type: "unknown-group", rowNumber: normalized.rowNumber, message: `未知组别：${normalized.group || "未填写"}` });
    }
    if (normalized.teamName) {
      const duplicateKey = rosterDuplicateKey(normalized);
      if (seen.has(duplicateKey)) {
        rowIssues.push({ type: "duplicate-team", rowNumber: normalized.rowNumber, message: `重复队伍：${normalized.teamName}` });
      }
      seen.add(duplicateKey);
    }

    issues.push(...rowIssues);
    if (!missingColumns.length && !rowIssues.length && normalized.group && normalized.teamName) {
      validRows.push({
        id: createTeamId(normalized.group, normalized.systemId || normalized.teamName, validRows.length),
        group: normalized.group,
        teamName: normalized.teamName,
        school: normalized.school,
        studentA: normalized.studentA,
        studentB: normalized.studentB,
        coach: normalized.coach,
        number: normalized.number,
        note: normalized.note,
        city: normalized.city,
        coachPhone: normalized.coachPhone,
        serial: normalized.serial,
        systemId: normalized.systemId,
        rawStudents: normalized.rawStudents,
        sourceSheet: normalized.sourceSheet,
      });
    }
  });

  return { missingColumns, issues, validRows };
}

function normalizeRosterRow(row, index) {
  const rowColumns = new Set(Object.keys(row ?? {}));
  const isCompetitionRoster = usesCompetitionRosterColumns(rowColumns);
  const sourceSheet = normalizeText(row?.__sheetName);
  const rowNumber = Number(row?.__rowNumber) || index + 2;
  const rawStudents = firstValue(row, ROSTER_COLUMN_ALIASES.students);
  const splitStudents = splitRosterNames(rawStudents);
  const studentA = firstValue(row, ROSTER_COLUMN_ALIASES.studentA) || splitStudents[0] || "";
  const studentB = firstValue(row, ROSTER_COLUMN_ALIASES.studentB) || splitStudents.slice(1).join("、");
  const school = firstValue(row, ROSTER_COLUMN_ALIASES.school);
  const serial = firstValue(row, ROSTER_COLUMN_ALIASES.serial);
  const number = isCompetitionRoster
    ? firstValue(row, ROSTER_COLUMN_ALIASES.drawNumber)
    : firstValue(row, ROSTER_COLUMN_ALIASES.number) || firstValue(row, ROSTER_COLUMN_ALIASES.drawNumber);
  const systemId = isCompetitionRoster ? number : firstValue(row, ROSTER_COLUMN_ALIASES.systemId);
  const group = normalizeGroup(firstValue(row, ROSTER_COLUMN_ALIASES.group) || sourceSheet);
  const explicitTeamName = firstValue(row, ROSTER_COLUMN_ALIASES.teamName);
  const teamName = explicitTeamName || (isCompetitionRoster
    ? composeTeamName(school, [studentA, studentB].filter(Boolean).join("、"), number)
    : "");

  return {
    rowNumber,
    sourceSheet,
    group,
    teamName,
    school,
    studentA,
    studentB,
    coach: firstValue(row, ROSTER_COLUMN_ALIASES.coach),
    number,
    note: firstValue(row, ROSTER_COLUMN_ALIASES.note),
    city: firstValue(row, ROSTER_COLUMN_ALIASES.city),
    coachPhone: firstValue(row, ROSTER_COLUMN_ALIASES.coachPhone),
    serial,
    systemId,
    rawStudents,
  };
}

export function splitRosterNames(value) {
  return normalizeText(value)
    .split(/[、,，;；/\\\n\r]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstValue(row, aliases) {
  for (const alias of aliases) {
    const value = normalizeText(row?.[alias]);
    if (value) {
      return value;
    }
  }
  return "";
}

function composeTeamName(school, students, fallback) {
  const normalizedSchool = normalizeText(school);
  const normalizedStudents = normalizeText(students);
  if (normalizedSchool && normalizedStudents) {
    return `${normalizedSchool}（${normalizedStudents}）`;
  }
  return normalizedSchool || normalizedStudents || normalizeText(fallback);
}

function normalizeGroup(value) {
  const text = normalizeText(value);
  if (GROUPS.includes(text)) {
    return text;
  }
  if (text.includes("小学")) {
    return "小学组";
  }
  if (text.includes("初中")) {
    return "初中组";
  }
  if (text.includes("高中")) {
    return "高中组";
  }
  return text;
}

function detectMissingRosterColumns(presentColumns) {
  if (usesCompetitionRosterColumns(presentColumns)) {
    return COMPETITION_ROSTER_REQUIRED_FIELDS
      .filter(([, aliases]) => !aliases.some((alias) => presentColumns.has(alias)))
      .map(([label]) => label);
  }
  return REQUIRED_ROSTER_COLUMNS.filter((column) => !presentColumns.has(column));
}

function usesCompetitionRosterColumns(presentColumns) {
  return [
    ...ROSTER_COLUMN_ALIASES.students,
    ...ROSTER_COLUMN_ALIASES.coachPhone,
    ...ROSTER_COLUMN_ALIASES.city,
    ...ROSTER_COLUMN_ALIASES.serial,
  ].some((column) => presentColumns.has(column));
}

function rosterDuplicateKey(row) {
  return `${row.group}|${row.systemId || row.teamName}`;
}

export function createTeamId(group, teamName, index = 0) {
  const base = `${group}-${teamName}`.replace(/\s+/g, "");
  return `${base || "team"}-${index + 1}`;
}

export function emptyRound() {
  return {
    seconds: "",
    scores: Object.fromEntries(ROAD_TASKS.map((task) => [task.key, ""])),
  };
}

export function createEntryFromRoster(row) {
  return {
    ...row,
    robotWeight: "",
    rounds: [emptyRound(), emptyRound()],
    reviewed: false,
    source: row.source ?? "excel",
  };
}

export function validateManualTeam(fields, existingEntries = []) {
  const group = normalizeText(fields?.group);
  const teamName = normalizeText(fields?.teamName);
  const number = normalizeText(fields?.number);
  const issues = [];

  if (!teamName) {
    issues.push({ type: "empty-team", field: "teamName", message: "队伍名称不能为空" });
  }
  if (!GROUPS.includes(group)) {
    issues.push({ type: "unknown-group", field: "group", message: "请选择小学组、初中组或高中组" });
  }
  if (teamName && existingEntries.some((entry) => (
    normalizeText(entry.group) === group && normalizeText(entry.teamName) === teamName
  ))) {
    issues.push({ type: "duplicate-team", field: "teamName", message: `本组已存在队伍：${teamName}` });
  }
  if (number && existingEntries.some((entry) => (
    normalizeText(entry.group) === group && normalizeText(entry.number) === number
  ))) {
    issues.push({ type: "duplicate-number", field: "number", message: `本组已存在编号：${number}` });
  }

  return issues;
}

export function createManualEntry(fields, index = 0) {
  const group = normalizeText(fields?.group);
  const teamName = normalizeText(fields?.teamName);
  return createEntryFromRoster({
    id: createTeamId(group, teamName, index),
    group,
    teamName,
    school: normalizeText(fields?.school),
    studentA: normalizeText(fields?.studentA),
    studentB: normalizeText(fields?.studentB),
    coach: normalizeText(fields?.coach),
    number: normalizeText(fields?.number),
    city: normalizeText(fields?.city),
    coachPhone: normalizeText(fields?.coachPhone),
    serial: normalizeText(fields?.serial),
    systemId: normalizeText(fields?.systemId) || normalizeText(fields?.number),
    note: normalizeText(fields?.note),
    source: "manual",
  });
}

export function mergeRosterEntries(existingEntries = [], importedEntries = []) {
  const entries = existingEntries.map((entry) => ({ ...entry }));
  const byTeam = new Map(entries.map((entry) => [teamKey(entry), entry]));
  const profileFields = ["school", "studentA", "studentB", "coach", "number", "city", "coachPhone", "serial", "systemId", "rawStudents", "sourceSheet", "note"];
  let duplicates = 0;

  for (const imported of importedEntries) {
    const key = teamKey(imported);
    const existing = byTeam.get(key);
    if (!existing) {
      entries.push(imported);
      byTeam.set(key, imported);
      continue;
    }

    duplicates += 1;
    for (const field of profileFields) {
      if (!normalizeText(existing[field]) && normalizeText(imported[field])) {
        existing[field] = normalizeText(imported[field]);
      }
    }
  }

  return { entries, duplicates };
}

function teamKey(entry) {
  return `${normalizeText(entry?.group)}|${normalizeText(entry?.systemId) || normalizeText(entry?.teamName)}`;
}

export function calculateTeam(entry) {
  const complete = isEntryScoreComplete(entry);
  const rounds = [0, 1].map((roundIndex) => {
    const sourceRound = entry.rounds?.[roundIndex] ?? {};
    const scores = {};
    for (const task of ROAD_TASKS) {
      const rawScore = sourceRound.scores?.[task.key];
      const allowedScores = allowedScoresForTask(task, entry.group ?? entry.组别);
      scores[task.key] = allowedScores.includes(toNumber(rawScore)) ? toNumber(rawScore) : 0;
    }
    return {
      seconds: secondsFromCentiseconds(sourceRound.seconds),
      scores,
      total: ROAD_TASKS.reduce((sum, task) => sum + scores[task.key], 0),
    };
  });
  const roundTotals = rounds.map((round) => round.total);
  const totalScore = roundTotals[0] + roundTotals[1];
  const totalSeconds = secondsFromCentiseconds(rounds[0].seconds + rounds[1].seconds);
  const parsedWeight = toNumber(entry.robotWeight, Number.NaN);
  const robotWeight = Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : "";

  return {
    ...entry,
    teamName: entry.teamName ?? entry.队伍名称,
    group: entry.group ?? entry.组别,
    school: entry.school ?? entry.学校 ?? "",
    robotWeight,
    rounds,
    roundTotals,
    totalScore,
    totalSeconds,
    complete,
    eliminated: complete && totalScore === 0,
  };
}

export function isEntryScoreComplete(entry) {
  return [0, 1].every((roundIndex) => {
    const round = entry.rounds?.[roundIndex];
    const seconds = Number(round?.seconds);
    if (round?.seconds === "" || round?.seconds === undefined || round?.seconds === null
      || !Number.isFinite(seconds) || seconds < 0 || seconds > 180) {
      return false;
    }
    return ROAD_TASKS.every((task) => {
      const value = round?.scores?.[task.key];
      if (value === "/") {
        return true;
      }
      const allowedScores = allowedScoresForTask(task, entry.group ?? entry.组别);
      return value !== "" && value !== undefined && value !== null
        && allowedScores.includes(Number(value));
    });
  });
}

export function validateScoreEntry(entry) {
  const issues = [];

  if (!GROUPS.includes(entry.group)) {
    issues.push({ type: "unknown-group", field: "group", message: "组别必须是小学组、初中组或高中组" });
  }
  if (!normalizeText(entry.teamName)) {
    issues.push({ type: "empty-team", field: "teamName", message: "队伍名称不能为空" });
  }
  if (entry.robotWeight === "" || entry.robotWeight === undefined || entry.robotWeight === null) {
    issues.push({ type: "missing-weight", field: "robotWeight", message: "机器人重量不能为空" });
  } else if (!Number.isFinite(Number(entry.robotWeight)) || Number(entry.robotWeight) <= 0) {
    issues.push({ type: "invalid-weight", field: "robotWeight", message: "机器人重量必须大于0" });
  }

  [0, 1].forEach((roundIndex) => {
    const round = entry.rounds?.[roundIndex] ?? {};
    if (round.seconds === "" || round.seconds === undefined || round.seconds === null) {
      issues.push({ type: "missing-time", field: `rounds.${roundIndex}.seconds`, message: `第${roundIndex + 1}轮用时不能为空` });
    } else {
      const seconds = Number(round.seconds);
      if (!Number.isFinite(seconds) || seconds < 0 || seconds > 180) {
        issues.push({ type: "invalid-time", field: `rounds.${roundIndex}.seconds`, message: `第${roundIndex + 1}轮用时必须在0-180秒之间` });
      }
    }

    for (const task of ROAD_TASKS) {
      const value = round.scores?.[task.key];
      if (value === "" || value === undefined || value === null) {
        issues.push({ type: "missing-score", field: `rounds.${roundIndex}.scores.${task.key}`, message: `第${roundIndex + 1}轮${task.name}得分不能为空` });
        continue;
      }
      if (value === "/") {
        continue;
      }
      const score = Number(value);
      const allowedScores = allowedScoresForTask(task, entry.group);
      if (!allowedScores.includes(score)) {
        issues.push({
          type: "invalid-score",
          field: `rounds.${roundIndex}.scores.${task.key}`,
          message: `第${roundIndex + 1}轮${task.name}只能填写：${allowedScores.join("、")}`,
        });
      }
    }
  });

  return issues;
}

export function getEntryWorkflowStatus(entry) {
  const paperFields = [];
  for (const round of entry.rounds ?? []) {
    paperFields.push(round?.seconds);
    for (const task of ROAD_TASKS) {
      paperFields.push(round?.scores?.[task.key]);
    }
  }

  const filled = paperFields.filter((value) => value !== "" && value !== undefined && value !== null).length;
  const total = ROAD_TASKS.length * 2 + 2;
  const issues = validateScoreEntry(entry);
  const invalidIssues = issues.filter((issue) => !["missing-score", "missing-time", "missing-weight"].includes(issue.type));

  if (invalidIssues.length) {
    return { ...ENTRY_WORKFLOW_STATUS.invalid, filled, total, issues };
  }
  if (filled === 0) {
    return { ...ENTRY_WORKFLOW_STATUS.unstarted, filled, total, issues };
  }
  if (filled < total) {
    return { ...ENTRY_WORKFLOW_STATUS.inProgress, filled, total, issues };
  }
  if (issues.some((issue) => issue.type === "missing-weight")) {
    return { ...ENTRY_WORKFLOW_STATUS.needsWeight, filled, total, issues };
  }
  if (entry.reviewed) {
    return { ...ENTRY_WORKFLOW_STATUS.reviewed, filled, total, issues };
  }
  return { ...ENTRY_WORKFLOW_STATUS.ready, filled, total, issues };
}

export function rankTeams(entries) {
  const calculated = entries.map((entry) => (entry.totalScore === undefined ? calculateTeam(entry) : entry));
  const active = calculated
    .filter((team) => team.complete !== false && !team.eliminated)
    .sort((a, b) => (
      b.totalScore - a.totalScore
      || a.totalSeconds - b.totalSeconds
      || weightForSort(a) - weightForSort(b)
      || normalizeText(a.teamName).localeCompare(normalizeText(b.teamName), "zh-Hans-CN")
    ))
    .map((team, index) => ({ ...team, rank: index + 1 }));
  const eliminated = calculated
    .filter((team) => team.complete !== false && team.eliminated)
    .sort((a, b) => normalizeText(a.teamName).localeCompare(normalizeText(b.teamName), "zh-Hans-CN"))
    .map((team) => ({ ...team, rank: null, award: AWARDS.eliminated }));
  const pending = calculated
    .filter((team) => team.complete === false)
    .sort((a, b) => normalizeText(a.teamName).localeCompare(normalizeText(b.teamName), "zh-Hans-CN"))
    .map((team) => ({ ...team, rank: null, award: AWARDS.none }));
  return [...active, ...eliminated, ...pending];
}

function weightForSort(team) {
  const weight = Number(team.robotWeight);
  return Number.isFinite(weight) && weight > 0 ? weight : Number.POSITIVE_INFINITY;
}

export function suggestAwardCounts(activeCount) {
  const count = Math.max(0, Number(activeCount) || 0);
  if (count === 0) {
    return { first: 0, second: 0, third: 0 };
  }
  const first = Math.round(count * 0.15);
  const second = Math.round(count * 0.35);
  return {
    first,
    second,
    third: Math.max(0, count - first - second),
  };
}

export function reconcileAwardCounts(entries, currentCounts = {}, manualGroups = {}) {
  const groups = buildGroupResults(entries, {});
  return Object.fromEntries(GROUPS.map((group) => {
    const activeCount = groups[group].teams.filter((team) => team.complete && !team.eliminated).length;
    const counts = manualGroups[group]
      ? clampAwardCounts(currentCounts[group] ?? suggestAwardCounts(activeCount), activeCount)
      : suggestAwardCounts(activeCount);
    return [group, counts];
  }));
}

export function clampAwardCounts(counts, activeCount) {
  const first = Math.max(0, Math.trunc(Number(counts.first) || 0));
  const second = Math.max(0, Math.trunc(Number(counts.second) || 0));
  const third = Math.max(0, Math.min(Math.trunc(Number(counts.third) || 0), Math.max(0, activeCount - first - second)));
  return { first, second, third };
}

export function assignAwards(rankedTeams, countsByGroupOrCounts) {
  const teamsByGroup = groupBy(rankedTeams, (team) => team.group);
  const activeTeamsByGroup = new Map();
  for (const [group, groupTeams] of teamsByGroup) {
    activeTeamsByGroup.set(group, groupTeams.filter((candidate) => candidate.complete !== false && !candidate.eliminated));
  }
  const output = [];

  for (const team of rankedTeams) {
    const activeGroupTeams = activeTeamsByGroup.get(team.group) ?? [];
    const counts = isSingleAwardCount(countsByGroupOrCounts)
      ? clampAwardCounts(countsByGroupOrCounts, activeGroupTeams.length)
      : clampAwardCounts(countsByGroupOrCounts?.[team.group] ?? suggestAwardCounts(activeGroupTeams.length), activeGroupTeams.length);

    if (team.complete === false) {
      output.push({ ...team, award: AWARDS.none });
    } else if (team.eliminated) {
      output.push({ ...team, award: AWARDS.eliminated });
    } else if (team.rank <= counts.first) {
      output.push({ ...team, award: AWARDS.first });
    } else if (team.rank <= counts.first + counts.second) {
      output.push({ ...team, award: AWARDS.second });
    } else if (team.rank <= counts.first + counts.second + counts.third) {
      output.push({ ...team, award: AWARDS.third });
    } else {
      output.push({ ...team, award: AWARDS.none });
    }
  }

  return output;
}

export function buildGroupResults(entries, awardCountsByGroup = {}) {
  const calculated = entries.map(calculateTeam);
  const byGroup = groupBy(calculated, (team) => team.group);
  const groups = {};

  for (const group of GROUPS) {
    const ranked = rankTeams(byGroup.get(group) ?? []);
    const activeCount = ranked.filter((team) => team.complete !== false && !team.eliminated).length;
    const counts = awardCountsByGroup[group] ?? suggestAwardCounts(activeCount);
    groups[group] = {
      awardCounts: clampAwardCounts(counts, activeCount),
      teams: assignAwards(ranked, counts),
    };
  }

  return groups;
}

export function buildOfficialScoreSheets(entries, awardCountsByGroup = {}, existingSheets = {}) {
  const groups = buildGroupResults(entries, awardCountsByGroup);
  return GROUPS.map((group) => {
    const name = OFFICIAL_SCORE_SHEET_NAMES[group];
    return {
      group,
      name,
      rows: buildOfficialScoreRows(group, groups[group], existingScoreRows(existingSheets, name)),
    };
  });
}

export function buildOfficialScoreRows(group, result, existingRows = []) {
  const existingDataRows = existingRows
    .slice(2)
    .map(normalizeOfficialExistingRow)
    .filter((row) => Array.isArray(row) && row.some((cell) => normalizeText(cell)));
  const teamRecords = (result?.teams ?? []).map((team, index) => ({
    team,
    token: officialTeamToken(team, index),
  }));
  const lookup = buildOfficialTeamLookup(teamRecords);
  const used = new Set();
  const rows = [
    [officialScoreTitle(group), ...Array.from({ length: OFFICIAL_SCORE_HEADERS.length - 1 }, () => "")],
    OFFICIAL_SCORE_HEADERS,
  ];

  existingDataRows.forEach((existingRow, index) => {
    const record = matchOfficialTeam(existingRow, index, lookup, used);
    if (record) {
      used.add(record.token);
    }
    rows.push(officialScoreDataRow(record?.team ?? null, existingRow));
  });

  for (const record of teamRecords) {
    if (!used.has(record.token)) {
      used.add(record.token);
      rows.push(officialScoreDataRow(record.team, []));
    }
  }

  return rows;
}

export function secondsToOfficialTime(value) {
  const centiseconds = centisecondsFromSeconds(value);
  if (!Number.isFinite(centiseconds) || centiseconds < 0) {
    return "";
  }
  const minutes = Math.floor(centiseconds / 6000);
  const remainder = centiseconds % 6000;
  const secondPart = Math.floor(remainder / 100);
  const hundredths = remainder % 100;
  return minutes * 10000 + secondPart * 100 + hundredths;
}

function secondsFromCentiseconds(value) {
  const centiseconds = centisecondsFromSeconds(toNumber(value));
  return Number.isFinite(centiseconds) ? centiseconds / 100 : 0;
}

function centisecondsFromSeconds(value) {
  const seconds = Number(value);
  return Number.isFinite(seconds) ? Math.round((seconds + Number.EPSILON) * 100) : Number.NaN;
}

export function officialScoreTitle(group) {
  return `第二十六届广东省青少年机器人竞赛-道路工程比赛成绩表（${group}）`;
}

function isSingleAwardCount(value) {
  return value && ["first", "second", "third"].some((key) => Object.hasOwn(value, key));
}

function existingScoreRows(existingSheets, sheetName) {
  if (existingSheets instanceof Map) {
    return existingSheets.get(sheetName) ?? [];
  }
  return existingSheets?.[sheetName] ?? [];
}

function buildOfficialTeamLookup(teamRecords) {
  const bySerial = new Map();
  const byNumber = new Map();
  const bySystemId = new Map();
  const byProfile = new Map();

  for (const record of teamRecords) {
    addLookupRecord(bySerial, record.team.serial, record);
    addLookupRecord(byNumber, record.team.number, record);
    addLookupRecord(bySystemId, record.team.systemId, record);
    for (const key of officialProfileKeysForTeam(record.team)) {
      addLookupRecord(byProfile, key, record, false);
    }
  }

  return { bySerial, byNumber, bySystemId, byProfile };
}

function addLookupRecord(map, value, record, shouldNormalize = true) {
  const key = shouldNormalize ? officialKeyText(value) : value;
  if (!key) {
    return;
  }
  if (!map.has(key)) {
    map.set(key, []);
  }
  map.get(key).push(record);
}

function matchOfficialTeam(existingRow, index, lookup, used) {
  const candidates = [
    lookup.bySerial.get(officialKeyText(index + 1)),
    lookup.byNumber.get(officialKeyText(existingRow[0])),
    lookup.bySystemId.get(officialKeyText(existingRow[1])),
    ...officialProfileKeysForExistingRow(existingRow).map((key) => lookup.byProfile.get(key)),
  ];

  for (const records of candidates) {
    const record = firstUnusedOfficialRecord(records, used);
    if (record) {
      return record;
    }
  }
  return null;
}

function firstUnusedOfficialRecord(records, used) {
  return records?.find((record) => !used.has(record.token)) ?? null;
}

function officialScoreDataRow(team, existingRow = []) {
  const complete = team && team.complete !== false;
  const students = teamStudentsText(team);
  const firstRoundTime = complete ? secondsToOfficialTime(team.rounds?.[0]?.seconds) : "";
  const secondRoundTime = complete ? secondsToOfficialTime(team.rounds?.[1]?.seconds) : "";
  const totalScore = complete ? team.totalScore ?? 0 : 0;
  const totalTime = complete ? secondsToOfficialTime(team.totalSeconds) : 0;

  return [
    team ? normalizeText(team.number) : normalizeText(existingRow[0]),
    officialSystemId(team, existingRow[1]),
    officialProfileValue(team, existingRow[2], team?.city),
    officialProfileValue(team, existingRow[3], team?.school),
    officialProfileValue(team, existingRow[4], students),
    officialProfileValue(team, existingRow[5], team?.coach),
    complete ? team.roundTotals?.[0] ?? "" : "",
    firstRoundTime,
    complete ? team.roundTotals?.[1] ?? "" : "",
    secondRoundTime,
    team ? team.robotWeight ?? "" : "",
    totalScore,
    totalTime,
    complete ? team.rank ?? "" : "",
    complete ? team.award ?? "" : "",
  ];
}

function normalizeOfficialExistingRow(row) {
  if (!Array.isArray(row)) {
    return [];
  }
  const first = normalizeText(row[0]);
  const second = normalizeText(row[1]);
  if (first && !second && normalizeText(row[2])) {
    return ["", "", ...row.slice(2)].slice(0, OFFICIAL_SCORE_HEADERS.length);
  }
  if (/^D\d{4,}$/i.test(first) && second && !/^D\d{4,}$/i.test(second)) {
    return ["", ...row].slice(0, OFFICIAL_SCORE_HEADERS.length);
  }
  return row;
}

function officialSystemId(team, existingValue) {
  const existing = normalizeText(existingValue);
  if (existing) {
    return existing;
  }
  const systemId = normalizeText(team?.systemId);
  return systemId && systemId !== normalizeText(team?.number) ? systemId : "";
}

function officialProfileValue(team, existingValue, fallback) {
  return normalizeText(existingValue) || normalizeText(fallback) || (team ? "" : normalizeText(existingValue));
}

function officialProfileKeysForTeam(team) {
  const city = officialKeyText(team?.city);
  const school = officialKeyText(team?.school);
  const students = officialKeyText(teamStudentsText(team));
  const teamName = officialKeyText(team?.teamName);
  return [
    [city, school, students].filter(Boolean).join("|"),
    [school, students].filter(Boolean).join("|"),
    teamName,
  ].filter(Boolean);
}

function officialProfileKeysForExistingRow(row) {
  const city = officialKeyText(row[2]);
  const school = officialKeyText(row[3]);
  const students = officialKeyText(row[4]);
  const teamName = officialKeyText(composeTeamName(row[3], row[4], ""));
  return [
    [city, school, students].filter(Boolean).join("|"),
    [school, students].filter(Boolean).join("|"),
    teamName,
  ].filter(Boolean);
}

function teamStudentsText(team) {
  if (!team) {
    return "";
  }
  return normalizeText(team.rawStudents) || [team.studentA, team.studentB].map(normalizeText).filter(Boolean).join("、");
}

function officialTeamToken(team, index) {
  return normalizeText(team?.id)
    || `${normalizeText(team?.group)}|${normalizeText(team?.systemId)}|${normalizeText(team?.teamName)}|${index}`;
}

function officialKeyText(value) {
  return normalizeText(value).replace(/\s+/g, "").toLocaleLowerCase();
}

function groupBy(items, getKey) {
  const map = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(item);
  }
  return map;
}
