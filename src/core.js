export const GROUPS = ["小学组", "初中组", "高中组"];

export const REQUIRED_ROSTER_COLUMNS = ["组别", "队伍名称", "学校", "选手A", "选手B", "指导教师"];

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

export function validateRosterRows(rows) {
  const presentColumns = new Set(rows.flatMap((row) => Object.keys(row ?? {})));
  const missingColumns = REQUIRED_ROSTER_COLUMNS.filter((column) => !presentColumns.has(column));
  const issues = [];
  const seen = new Set();
  const validRows = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const group = normalizeText(row?.组别);
    const teamName = normalizeText(row?.队伍名称);
    const school = normalizeText(row?.学校);
    const studentA = normalizeText(row?.选手A);
    const studentB = normalizeText(row?.选手B);
    const coach = normalizeText(row?.指导教师);
    const rowIssues = [];

    if (!teamName) {
      rowIssues.push({ type: "empty-team", rowNumber, message: "队伍名称为空" });
    }
    if (group && !GROUPS.includes(group)) {
      rowIssues.push({ type: "unknown-group", rowNumber, message: `未知组别：${group}` });
    }
    if (teamName) {
      const duplicateKey = `${group}|${teamName}`;
      if (seen.has(duplicateKey)) {
        rowIssues.push({ type: "duplicate-team", rowNumber, message: `重复队伍：${teamName}` });
      }
      seen.add(duplicateKey);
    }

    issues.push(...rowIssues);
    if (!missingColumns.length && !rowIssues.length && group && teamName) {
      validRows.push({
        id: createTeamId(group, teamName, validRows.length),
        group,
        teamName,
        school,
        studentA,
        studentB,
        coach,
        number: normalizeText(row?.编号),
        note: normalizeText(row?.备注),
      });
    }
  });

  return { missingColumns, issues, validRows };
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
    note: normalizeText(fields?.note),
    source: "manual",
  });
}

export function mergeRosterEntries(existingEntries = [], importedEntries = []) {
  const entries = existingEntries.map((entry) => ({ ...entry }));
  const byTeam = new Map(entries.map((entry) => [teamKey(entry), entry]));
  const profileFields = ["school", "studentA", "studentB", "coach", "number", "note"];
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
  return `${normalizeText(entry?.group)}|${normalizeText(entry?.teamName)}`;
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
      seconds: toNumber(sourceRound.seconds),
      scores,
      total: ROAD_TASKS.reduce((sum, task) => sum + scores[task.key], 0),
    };
  });
  const roundTotals = rounds.map((round) => round.total);
  const totalScore = roundTotals[0] + roundTotals[1];
  const totalSeconds = rounds[0].seconds + rounds[1].seconds;
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
  const output = [];

  for (const team of rankedTeams) {
    const groupTeams = teamsByGroup.get(team.group) ?? [];
    const activeGroupTeams = groupTeams.filter((candidate) => candidate.complete !== false && !candidate.eliminated);
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

function isSingleAwardCount(value) {
  return value && ["first", "second", "third"].some((key) => Object.hasOwn(value, key));
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
