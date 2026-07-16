import test from "node:test";
import assert from "node:assert/strict";
import {
  ROAD_TASKS,
  allowedScoresForTask,
  createManualEntry,
  getEntryWorkflowStatus,
  mergeRosterEntries,
  reconcileAwardCounts,
  validateManualTeam,
  validateRosterRows,
  validateScoreEntry,
  calculateTeam,
  rankTeams,
  suggestAwardCounts,
  assignAwards,
} from "../src/core.js";

function completeRound(seconds, scores = {}) {
  return {
    seconds,
    scores: Object.fromEntries(ROAD_TASKS.map((task) => [task.key, scores[task.key] ?? "/"])),
  };
}

test("defines the seven road engineering scoring tasks with allowed scores", () => {
  assert.deepEqual(
    ROAD_TASKS.map((task) => task.key),
    [
      "materialRecovery",
      "serviceArea",
      "bridge",
      "tunnel",
      "gasStation",
      "gravityGate",
      "autoCharging",
    ],
  );
  assert.deepEqual(ROAD_TASKS.find((task) => task.key === "materialRecovery").allowedScores, [0, 30, 50]);
  assert.deepEqual(ROAD_TASKS.find((task) => task.key === "serviceArea").allowedScores, [0, 30, 50, 80]);
});

test("uses group-specific allowed scores for service area and bridge tasks", () => {
  const serviceArea = ROAD_TASKS.find((task) => task.key === "serviceArea");
  const bridge = ROAD_TASKS.find((task) => task.key === "bridge");

  assert.deepEqual(allowedScoresForTask(serviceArea, "小学组"), [0, 30, 50]);
  assert.deepEqual(allowedScoresForTask(bridge, "小学组"), [0, 50]);
  assert.deepEqual(allowedScoresForTask(serviceArea, "初中组"), [0, 30, 50, 80]);
  assert.deepEqual(allowedScoresForTask(bridge, "高中组"), [0, 30, 50, 80]);

  const elementary = createManualEntry({ group: "小学组", teamName: "分值校验队" });
  elementary.robotWeight = 1.2;
  elementary.rounds = [completeRound(100, { bridge: 30 }), completeRound(110)];
  assert(validateScoreEntry(elementary).some((issue) => issue.type === "invalid-score" && issue.field.includes("bridge")));
});

test("validates fixed roster columns and reports missing, duplicate, empty, and unknown group rows", () => {
  const result = validateRosterRows([
    { 组别: "小学组", 队伍名称: "云伊机兵二队", 学校: "云浮市伊顿实验学校", 选手A: "毛铭扬", 选手B: "王衍道", 指导教师: "陈立乾" },
    { 组别: "小学组", 队伍名称: "云伊机兵二队", 学校: "云浮市伊顿实验学校", 选手A: "毛铭扬", 选手B: "王衍道", 指导教师: "陈立乾" },
    { 组别: "大学组", 队伍名称: "", 学校: "测试学校", 选手A: "甲", 选手B: "乙", 指导教师: "丙" },
  ]);

  assert.equal(result.validRows.length, 1);
  assert.deepEqual(result.missingColumns, []);
  assert(result.issues.some((issue) => issue.type === "duplicate-team"));
  assert(result.issues.some((issue) => issue.type === "empty-team"));
  assert(result.issues.some((issue) => issue.type === "unknown-group"));

  const missing = validateRosterRows([{ 组别: "小学组", 队伍名称: "A" }]);
  assert.deepEqual(missing.missingColumns, ["学校", "选手A", "选手B", "指导教师"]);
});

test("calculates round totals, total time, and elimination status from per-task scores", () => {
  const team = calculateTeam({
    teamName: "测试队",
    group: "初中组",
    robotWeight: 1.25,
    rounds: [
      {
        seconds: 118,
        scores: {
          materialRecovery: 50,
          serviceArea: 80,
          bridge: 50,
          tunnel: 50,
          gasStation: 50,
          gravityGate: 50,
          autoCharging: 50,
        },
      },
      {
        seconds: 143,
        scores: {
          materialRecovery: 30,
          serviceArea: 50,
          bridge: 80,
          tunnel: 50,
          gasStation: 0,
          gravityGate: 50,
          autoCharging: 50,
        },
      },
    ],
  });

  assert.equal(team.roundTotals[0], 380);
  assert.equal(team.roundTotals[1], 310);
  assert.equal(team.totalScore, 690);
  assert.equal(team.totalSeconds, 261);
  assert.equal(team.eliminated, false);

  const eliminated = calculateTeam({
    teamName: "零分队",
    group: "初中组",
    robotWeight: 1.4,
    rounds: [completeRound(180), completeRound(180)],
  });
  assert.equal(eliminated.totalScore, 0);
  assert.equal(eliminated.eliminated, true);
});

test("ranks by total score, then total time, then robot weight; eliminated teams are last", () => {
  const ranked = rankTeams([
    calculateTeam({ teamName: "A", group: "小学组", robotWeight: 1.4, rounds: [completeRound(140, { tunnel: 50 }), completeRound(150, { tunnel: 50 })] }),
    calculateTeam({ teamName: "B", group: "小学组", robotWeight: 1.3, rounds: [completeRound(130, { tunnel: 50 }), completeRound(155, { tunnel: 50 })] }),
    calculateTeam({ teamName: "C", group: "小学组", robotWeight: 1.2, rounds: [completeRound(180), completeRound(180)] }),
    calculateTeam({ teamName: "D", group: "小学组", robotWeight: 1.1, rounds: [completeRound(120, { tunnel: 50 }), completeRound(180, { materialRecovery: 30 })] }),
  ]);

  assert.deepEqual(ranked.map((team) => team.teamName), ["B", "A", "D", "C"]);
  assert.deepEqual(ranked.map((team) => team.rank), [1, 2, 3, null]);
});

test("suggests adjustable award counts and assigns awards only to non-eliminated ranked teams", () => {
  assert.deepEqual(suggestAwardCounts(8), { first: 1, second: 3, third: 4 });
  assert.deepEqual(suggestAwardCounts(10), { first: 2, second: 4, third: 4 });
  assert.deepEqual(suggestAwardCounts(11), { first: 2, second: 4, third: 5 });

  const ranked = Array.from({ length: 5 }, (_, index) =>
    calculateTeam({
      teamName: `队伍${index + 1}`,
      group: "高中组",
      robotWeight: 1 + index / 10,
      rounds: [
        completeRound(100 + index, { tunnel: 50 }),
        completeRound(100 + index, { autoCharging: index === 4 ? 0 : 50 }),
      ],
    }),
  );
  ranked[4] = calculateTeam({ teamName: "淘汰队", group: "高中组", robotWeight: 1, rounds: [completeRound(180), completeRound(180)] });
  const assigned = assignAwards(rankTeams(ranked), { first: 1, second: 2, third: 1 });

  assert.deepEqual(assigned.map((team) => [team.teamName, team.award]), [
    ["队伍1", "一等奖"],
    ["队伍2", "二等奖"],
    ["队伍3", "二等奖"],
    ["队伍4", "三等奖"],
    ["淘汰队", "淘汰"],
  ]);
});

test("creates a manual team from the minimum fields and rejects duplicates within a group", () => {
  const entry = createManualEntry({
    group: "小学组",
    teamName: "纸单一队",
    number: "A-01",
  });

  assert.equal(entry.group, "小学组");
  assert.equal(entry.teamName, "纸单一队");
  assert.equal(entry.number, "A-01");
  assert.equal(entry.school, "");
  assert.equal(entry.rounds.length, 2);

  assert.deepEqual(validateManualTeam({ group: "小学组", teamName: "" }, []), [
    { type: "empty-team", field: "teamName", message: "队伍名称不能为空" },
  ]);
  assert(validateManualTeam(
    { group: "小学组", teamName: "纸单一队" },
    [entry],
  ).some((issue) => issue.type === "duplicate-team"));
});

test("accepts slash as an explicit no-score mark and counts it as zero", () => {
  const entry = createManualEntry({ group: "初中组", teamName: "斜杠测试队" });
  for (const round of entry.rounds) {
    round.seconds = 180;
    for (const task of ROAD_TASKS) {
      round.scores[task.key] = "/";
    }
  }
  entry.robotWeight = 1.25;

  assert.deepEqual(validateScoreEntry(entry), []);
  assert.equal(calculateTeam(entry).totalScore, 0);
});

test("derives paper-entry workflow status from completeness and review state", () => {
  const entry = createManualEntry({ group: "高中组", teamName: "流程测试队" });
  assert.equal(getEntryWorkflowStatus(entry).key, "unstarted");

  entry.rounds[0].scores.materialRecovery = "/";
  assert.equal(getEntryWorkflowStatus(entry).key, "in-progress");

  for (const round of entry.rounds) {
    round.seconds = 180;
    for (const task of ROAD_TASKS) {
      round.scores[task.key] = "/";
    }
  }
  assert.equal(getEntryWorkflowStatus(entry).key, "needs-weight");

  entry.robotWeight = 1.31;
  assert.equal(getEntryWorkflowStatus(entry).key, "ready");

  entry.reviewed = true;
  assert.equal(getEntryWorkflowStatus(entry).key, "reviewed");
});

test("places a tied team with missing robot weight after teams with recorded weight", () => {
  const commonRounds = [
    completeRound(100, { tunnel: 50 }),
    completeRound(100, { autoCharging: 50 }),
  ];
  const ranked = rankTeams([
    calculateTeam({ teamName: "未称重队", group: "小学组", robotWeight: "", rounds: commonRounds }),
    calculateTeam({ teamName: "已称重队", group: "小学组", robotWeight: 1.4, rounds: commonRounds }),
  ]);

  assert.deepEqual(ranked.map((team) => team.teamName), ["已称重队", "未称重队"]);
});

test("merges an imported roster without overwriting paper scores already entered", () => {
  const manual = createManualEntry({ group: "小学组", teamName: "保留成绩队" });
  manual.rounds[0].scores.tunnel = 50;
  const importedDuplicate = createManualEntry({
    group: "小学组",
    teamName: "保留成绩队",
    school: "补全学校",
    studentA: "选手甲",
  });
  const importedNew = createManualEntry({ group: "初中组", teamName: "新增队伍" }, 1);

  const result = mergeRosterEntries([manual], [importedDuplicate, importedNew]);

  assert.equal(result.entries.length, 2);
  assert.equal(result.duplicates, 1);
  assert.equal(result.entries[0].rounds[0].scores.tunnel, 50);
  assert.equal(result.entries[0].school, "补全学校");
  assert.equal(result.entries[0].studentA, "选手甲");
  assert.equal(result.entries[1].teamName, "新增队伍");
});

test("keeps an unentered paper sheet out of ranking instead of treating it as eliminated", () => {
  const pending = createManualEntry({ group: "小学组", teamName: "尚未录入队" });
  const completed = createManualEntry({ group: "小学组", teamName: "已录入队" }, 1);
  for (const round of completed.rounds) {
    round.seconds = 180;
    for (const task of ROAD_TASKS) {
      round.scores[task.key] = "/";
    }
  }
  completed.rounds[0].scores.tunnel = 50;

  const calculatedPending = calculateTeam(pending);
  assert.equal(calculatedPending.complete, false);
  assert.equal(calculatedPending.eliminated, false);

  const ranked = rankTeams([pending, completed]);
  assert.deepEqual(ranked.map((team) => [team.teamName, team.rank, team.eliminated]), [
    ["已录入队", 1, false],
    ["尚未录入队", null, false],
  ]);
});

test("refreshes suggested awards when valid scores appear but preserves manual group counts", () => {
  const entry = createManualEntry({ group: "初中组", teamName: "奖项联动队" });
  entry.robotWeight = 1.2;
  entry.rounds = [completeRound(100, { tunnel: 50 }), completeRound(110, { tunnel: 50 })];

  const suggested = reconcileAwardCounts([entry], { 初中组: { first: 0, second: 0, third: 0 } }, {});
  assert.deepEqual(suggested.初中组, { first: 0, second: 0, third: 1 });

  const manual = reconcileAwardCounts(
    [entry],
    { 初中组: { first: 1, second: 0, third: 0 } },
    { 初中组: true },
  );
  assert.deepEqual(manual.初中组, { first: 1, second: 0, third: 0 });
});
