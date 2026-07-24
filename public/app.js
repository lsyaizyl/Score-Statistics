import {
  GROUPS,
  ROAD_TASKS,
  allowedScoresForTask,
  buildGroupResults,
  calculateTeam,
  createManualEntry,
  emptyRound,
  getEntryWorkflowStatus,
  mergeRosterEntries,
  normalizeText,
  reconcileAwardCounts,
  suggestAwardCounts,
  validateManualTeam,
} from "/shared/core.js";

const storageKey = "road-engineering-score-tool:v1";
const app = document.querySelector("#app");
const state = hydrateState(loadState());
state.awardCountsByGroup = reconcileAwardCounts(state.entries, state.awardCountsByGroup, state.awardManualGroups);
let teamDialogContext = { mode: "create", entryId: null };
function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}
const debouncedSaveAndRender = debounce((options) => saveAndRender(options), 200);

render();

function render(options = {}) {
  ensureActiveEntry();
  const model = buildViewModel();
  app.innerHTML = `
    <div class="app-shell">
      ${appHeader(model)}
      ${progressStrip(model)}
      <main class="view-area">
        ${state.view === "overview"
          ? overviewView(model)
          : state.view === "awards"
            ? awardsView(model)
            : paperEntryView(model)}
      </main>
      ${teamDialog()}
    </div>
  `;
  bindEvents();
  restoreViewport(options);
}

function buildViewModel() {
  const statuses = new Map(state.entries.map((entry) => [entry.id, getEntryWorkflowStatus(entry)]));
  const calculated = state.entries.map(calculateTeam);
  const calculatedById = new Map(calculated.map((c) => [c.id, c]));
  const groups = buildGroupResults(state.entries, state.awardCountsByGroup);
  const reviewedCount = state.entries.filter((entry) => statuses.get(entry.id)?.key === "reviewed").length;
  const paperCompleteCount = calculated.filter((c) => c.complete).length;
  const unresolvedEntries = state.entries.filter((entry) => !["ready", "reviewed"].includes(statuses.get(entry.id)?.key));

  return {
    statuses,
    calculated,
    calculatedById,
    groups,
    reviewedCount,
    paperCompleteCount,
    unresolvedEntries,
    activeEntry: state.entries.find((entry) => entry.id === state.activeEntryId) ?? null,
  };
}

function appHeader(model) {
  return `
    <header class="appbar">
      <div class="brand-block">
        <span class="brand-mark" aria-hidden="true">路</span>
        <div>
          <strong>道路工程</strong>
          <span>成绩统计</span>
        </div>
      </div>
      <nav class="view-tabs" aria-label="工作区">
        ${viewTab("entry", "纸单录入")}
        ${viewTab("overview", "成绩总览")}
        ${viewTab("awards", "奖项与导出")}
      </nav>
      <div class="app-actions">
        <button class="button button-primary" data-action="open-create" type="button">手工建队</button>
        <label class="button button-secondary ${state.busy ? "is-disabled" : ""}">
          导入 Excel
          <input id="rosterInput" class="visually-hidden" type="file" accept=".xlsx,.xls" ${state.busy ? "disabled" : ""}>
        </label>
        <a class="button button-quiet" href="/api/template">名单模板</a>
      </div>
    </header>
  `;
}

function viewTab(key, label) {
  return `<button class="view-tab ${state.view === key ? "active" : ""}" data-view="${key}" type="button">${label}</button>`;
}

function progressStrip(model) {
  const pending = Math.max(0, state.entries.length - model.reviewedCount);
  return `
    <section class="progress-strip" aria-label="录入进度">
      ${compactMetric("队伍", state.entries.length, "", "teams")}
      ${compactMetric("纸单完整", model.paperCompleteCount, "", "complete")}
      ${compactMetric("已复核", model.reviewedCount, "", "reviewed")}
      ${compactMetric("待处理", pending, pending ? "warn" : "ok", "pending")}
      <span class="save-state">本机自动保存</span>
    </section>
  `;
}

function compactMetric(label, value, tone = "", key = "") {
  return `<div class="compact-metric ${tone}" ${key ? `data-metric="${escapeAttr(key)}"` : ""}><span>${label}</span><strong>${value}</strong></div>`;
}

function paperEntryView(model) {
  if (!state.entries.length) {
    return `
      <section class="empty-workspace">
        <div class="empty-sheet" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
        <h1>暂无队伍</h1>
        <div class="empty-actions">
          <button class="button button-primary" data-action="open-create" type="button">手工建队</button>
          <label class="button button-secondary">
            导入 Excel
            <input class="visually-hidden" data-roster-input type="file" accept=".xlsx,.xls">
          </label>
        </div>
      </section>
    `;
  }

  return `
    <div class="entry-layout">
      ${entryQueue(model)}
      ${paperEditor(model.activeEntry, model)}
    </div>
  `;
}

function entryQueue(model) {
  const filtered = state.entries.filter((entry) => {
    const status = model.statuses.get(entry.id);
    const haystack = `${entry.number ?? ""}${entry.systemId ?? ""}${entry.serial ?? ""}${entry.city ?? ""}${entry.teamName}${entry.school ?? ""}${entry.studentA ?? ""}${entry.studentB ?? ""}${entry.coach ?? ""}${entry.coachPhone ?? ""}`;
    return (state.queueGroup === "全部" || entry.group === state.queueGroup)
      && (state.queueStatus === "全部" || status?.key === state.queueStatus)
      && haystack.toLocaleLowerCase().includes(state.query.toLocaleLowerCase());
  });

  return `
    <aside class="entry-queue">
      <div class="queue-header">
        <div>
          <h2>纸单队列</h2>
          <span>${filtered.length} / ${state.entries.length}</span>
        </div>
        <div class="queue-header-actions">
          <button class="button button-danger-quiet button-small" data-action="clear-all" type="button">删除全部队伍</button>
          <button class="icon-button" data-action="open-create" type="button" title="手工建队" aria-label="手工建队">+</button>
        </div>
      </div>
      <div class="queue-filters">
        <input id="queueSearch" class="text-input" value="${escapeAttr(state.query)}" placeholder="队伍 / 抽签号 / 学校 / 地市">
        <div class="filter-row">
          <select id="queueGroup" class="select-input" aria-label="筛选组别">
            ${["全部", ...GROUPS].map((group) => `<option value="${group}" ${state.queueGroup === group ? "selected" : ""}>${group}</option>`).join("")}
          </select>
          <select id="queueStatus" class="select-input" aria-label="筛选状态">
            ${statusFilterOptions()}
          </select>
        </div>
      </div>
      <div class="queue-list">
        ${filtered.length ? filtered.map((entry) => queueItem(entry, model)).join("") : `<div class="queue-empty">没有匹配的队伍</div>`}
      </div>
    </aside>
  `;
}

function statusFilterOptions() {
  const options = [
    ["全部", "全部状态"],
    ["unstarted", "未录入"],
    ["in-progress", "录入中"],
    ["needs-weight", "待补重量"],
    ["ready", "待复核"],
    ["reviewed", "已确认"],
    ["invalid", "有问题"],
  ];
  return options.map(([value, label]) => `<option value="${value}" ${state.queueStatus === value ? "selected" : ""}>${label}</option>`).join("");
}

function queueItem(entry, model) {
  const status = model.statuses.get(entry.id);
  const calculated = model.calculatedById.get(entry.id) ?? calculateTeam(entry);
  return `
    <button class="queue-item ${entry.id === state.activeEntryId ? "active" : ""}" data-entry-id="${escapeAttr(entry.id)}" type="button">
      <span class="queue-item-main">
        <span class="queue-number">${escapeHtml(entry.number || entry.group)}</span>
        <strong>${escapeHtml(entry.teamName)}</strong>
        <small>${escapeHtml(profileLine(entry) || "资料待补")}</small>
      </span>
      <span class="queue-item-side">
        ${statusBadge(status)}
        <b>${calculated.complete ? calculated.totalScore : "--"}</b>
      </span>
    </button>
  `;
}

function profileLine(entry) {
  return [entry.city, entry.school, entry.coachPhone ? `教练 ${entry.coachPhone}` : ""]
    .filter(Boolean)
    .join(" · ");
}

function paperEditor(entry, model) {
  if (!entry) {
    return `<section class="paper-stage"><div class="queue-empty">请选择队伍</div></section>`;
  }
  const status = model.statuses.get(entry.id);
  const calculated = model.calculatedById.get(entry.id) ?? calculateTeam(entry);
  const index = state.entries.findIndex((candidate) => candidate.id === entry.id);
  const isFirst = index <= 0;
  const isLast = index >= state.entries.length - 1;
  const reviewDisabled = !["ready", "reviewed"].includes(status.key);

  return `
    <section class="paper-stage">
      <div class="paper-toolbar">
        <span>第 ${index + 1} 张 / 共 ${state.entries.length} 张</span>
        <div class="toolbar-actions">
          <button class="icon-button" data-action="previous-entry" type="button" title="上一张纸单" aria-label="上一张纸单" ${isFirst ? "disabled" : ""}>←</button>
          <button class="icon-button" data-action="next-entry" type="button" title="下一张纸单" aria-label="下一张纸单" ${isLast ? "disabled" : ""}>→</button>
          <button class="button button-quiet button-small" data-action="open-edit" type="button">编辑队伍</button>
          <button class="button button-danger-quiet button-small" data-action="delete-entry" type="button">删除</button>
        </div>
      </div>
      <article class="paper-sheet">
        <header class="paper-heading">
          <div>
            <p>道路工程记分表</p>
            <h1>${escapeHtml(entry.teamName)}</h1>
            <span>${escapeHtml([entry.group, entry.number, entry.city, entry.school].filter(Boolean).join(" · "))}</span>
          </div>
          ${statusBadge(status, true)}
        </header>
        <div class="score-table-wrap">
          <table class="paper-score-table">
            <thead>
              <tr>
                <th>任务事项</th>
                <th>允许分值</th>
                <th>第一轮得分</th>
                <th>第二轮得分</th>
              </tr>
            </thead>
            <tbody>
              ${ROAD_TASKS.map((task) => paperTaskRow(entry, task)).join("")}
              ${timeRow(entry)}
            </tbody>
          </table>
        </div>
        <section class="score-summary">
          ${summaryValue("第一轮", calculated.complete || status.filled ? calculated.roundTotals[0] : "--", "分", "", "round-0")}
          ${summaryValue("第二轮", calculated.complete || status.filled ? calculated.roundTotals[1] : "--", "分", "", "round-1")}
          ${summaryValue("总成绩", calculated.complete ? calculated.totalScore : "--", "分", "strong", "total-score")}
          ${summaryValue("总用时", calculated.complete ? calculated.totalSeconds : "--", "秒", "", "total-seconds")}
          <label class="weight-field">
            <span>机器人重量</span>
            <span><input id="robotWeight" data-score-field data-field="robotWeight" type="number" min="0.01" step="0.01" value="${escapeAttr(entry.robotWeight)}"> kg</span>
          </label>
        </section>
        <footer class="paper-footer">
          <div class="paper-check">${paperCheckMessage(status)}</div>
          <div class="paper-actions">
            <button class="button ${status.key === "reviewed" ? "button-secondary" : "button-primary"}" data-action="toggle-review" type="button" ${reviewDisabled ? "disabled" : ""}>
              ${status.key === "reviewed" ? "取消复核" : "标记已复核"}
            </button>
            <button class="button button-secondary" data-action="next-entry" type="button" ${isLast ? "disabled" : ""}>下一张纸单</button>
          </div>
        </footer>
      </article>
    </section>
  `;
}

function paperTaskRow(entry, task) {
  const allowedScores = allowedScoresForTask(task, entry.group);
  return `
    <tr>
      <td class="task-name"><strong>${escapeHtml(task.name)}</strong></td>
      <td class="allowed-scores">${allowedScores.filter((score) => score > 0).join(" / ")}</td>
      <td>${scoreOptions(entry, 0, task)}</td>
      <td>${scoreOptions(entry, 1, task)}</td>
    </tr>
  `;
}

function scoreOptions(entry, roundIndex, task) {
  const allowedScores = allowedScoresForTask(task, entry.group);
  const raw = entry.rounds?.[roundIndex]?.scores?.[task.key] ?? "";
  const current = raw === 0 || raw === "0" ? "/" : String(raw);
  const choices = [
    { value: "", label: "×", title: "清空该项" },
    { value: "/", label: "/", title: "无得分" },
    ...allowedScores.filter((score) => score > 0).map((score) => ({ value: String(score), label: String(score), title: `${score}分` })),
  ];
  const name = `score-${entry.id}-${roundIndex}-${task.key}`;
  return `
    <div class="score-options">
      ${choices.map((choice, choiceIndex) => {
        const id = `${safeId(name)}-${choiceIndex}`;
        return `
          <span class="score-choice ${choice.value === "" ? "clear-choice" : ""}">
            <input class="visually-hidden" id="${id}" name="${escapeAttr(name)}" data-score-radio data-entry="${escapeAttr(entry.id)}" data-round="${roundIndex}" data-task="${task.key}" type="radio" value="${escapeAttr(choice.value)}" ${current === choice.value ? "checked" : ""}>
            <label for="${id}" title="${choice.title}">${choice.label}</label>
          </span>
        `;
      }).join("")}
    </div>
  `;
}

function timeRow(entry) {
  return `
    <tr class="time-row">
      <td class="task-name"><strong>比赛用时</strong></td>
      <td class="allowed-scores">0 - 180 秒</td>
      ${[0, 1].map((roundIndex) => `
        <td>
          <label class="time-input">
            <input id="round-${roundIndex}-seconds" data-score-field data-round="${roundIndex}" data-field="seconds" type="number" min="0" max="180" step="1" value="${escapeAttr(entry.rounds[roundIndex].seconds)}">
            <span>秒</span>
          </label>
        </td>
      `).join("")}
    </tr>
  `;
}

function summaryValue(label, value, unit, className = "", key = "") {
  return `<div class="summary-value ${className}" ${key ? `data-summary="${escapeAttr(key)}"` : ""}><span>${label}</span><strong>${value}</strong><small>${unit}</small></div>`;
}

function paperCheckMessage(status) {
  if (status.key === "reviewed") {
    return `<strong>复核完成</strong><span>修改任一成绩后将自动撤销复核状态</span>`;
  }
  if (status.key === "ready") {
    return `<strong>纸单完整</strong><span>等待复核确认</span>`;
  }
  if (status.key === "needs-weight") {
    return `<strong>成绩已录完</strong><span>待补机器人重量</span>`;
  }
  if (status.key === "invalid") {
    const issue = status.issues.find((item) => item.type.startsWith("invalid"));
    return `<strong>存在异常值</strong><span>${escapeHtml(issue?.message ?? "请检查录入内容")}</span>`;
  }
  const remaining = Math.max(0, status.total - status.filled);
  return `<strong>${status.label}</strong><span>${remaining ? `还差 ${remaining} 项` : ""}</span>`;
}

function overviewView(model) {
  const rows = GROUPS.flatMap((group) => model.groups[group].teams.map((team) => ({ ...team, group })))
    .filter((team) => state.overviewGroup === "全部" || team.group === state.overviewGroup)
    .filter((team) => `${team.number ?? ""}${team.systemId ?? ""}${team.city ?? ""}${team.teamName}${team.school ?? ""}${team.studentA ?? ""}${team.studentB ?? ""}${team.coachPhone ?? ""}`.toLocaleLowerCase().includes(state.overviewQuery.toLocaleLowerCase()));

  return `
    <section class="page-section">
      <header class="section-header">
        <div>
          <h1>成绩总览</h1>
          <span>${rows.length} 支队伍</span>
        </div>
        <div class="section-tools">
          <div class="segmented-control">
            ${["全部", ...GROUPS].map((group) => `<button class="${state.overviewGroup === group ? "active" : ""}" data-overview-group="${group}" type="button">${group}</button>`).join("")}
          </div>
          <input id="overviewSearch" class="text-input overview-search" value="${escapeAttr(state.overviewQuery)}" placeholder="搜索队伍 / 抽签号 / 学校 / 地市">
        </div>
      </header>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>组别</th><th>抽签号</th><th>地市</th><th>队伍</th><th>录入状态</th><th>第一轮</th><th>第二轮</th><th>总成绩</th><th>总用时</th><th>重量</th><th>排名</th><th>奖项</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map((team) => overviewRow(team, model)).join("") : `<tr><td colspan="12" class="table-empty">暂无数据</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function overviewRow(team, model) {
  const status = model.statuses.get(team.id) ?? getEntryWorkflowStatus(team);
  return `
    <tr class="clickable-row" data-open-entry="${escapeAttr(team.id)}">
      <td>${escapeHtml(team.group)}</td>
      <td>${escapeHtml(team.number || "--")}</td>
      <td>${escapeHtml(team.city || "--")}</td>
      <td><strong>${escapeHtml(team.teamName)}</strong><span>${escapeHtml(team.school || "")}</span></td>
      <td>${statusBadge(status)}</td>
      <td>${team.complete ? team.roundTotals[0] : "--"}</td>
      <td>${team.complete ? team.roundTotals[1] : "--"}</td>
      <td class="number-strong">${team.complete ? team.totalScore : "--"}</td>
      <td>${team.complete ? `${team.totalSeconds} 秒` : "--"}</td>
      <td>${team.robotWeight || "--"}</td>
      <td>${team.rank ?? "--"}</td>
      <td>${awardBadge(team.complete ? team.award : "")}</td>
    </tr>
  `;
}

function awardsView(model) {
  const rankedRows = GROUPS.flatMap((group) => model.groups[group].teams.map((team) => ({ ...team, group })))
    .filter((team) => team.complete);
  const workflowIssues = state.entries
    .map((entry) => ({ entry, status: model.statuses.get(entry.id) }))
    .filter(({ status }) => status?.key !== "reviewed");

  return `
    <section class="page-section awards-page">
      <header class="section-header">
        <div>
          <h1>奖项与导出</h1>
          <span>${rankedRows.length} 支队伍进入排名</span>
        </div>
        <div class="section-tools">
          <button class="button button-secondary" data-action="reset-awards" type="button">重算名额</button>
          <button class="button button-primary" data-action="export" type="button" ${state.entries.length && !state.busy ? "" : "disabled"}>${state.busy ? "正在生成..." : "导出成绩表"}</button>
        </div>
      </header>
      <div class="awards-layout">
        <section class="award-settings">
          <div class="subsection-heading">
            <h2>奖项名额</h2>
            <span>可手动调整</span>
          </div>
          <div class="award-groups">
            ${GROUPS.map((group) => awardGroup(group, model.groups[group])).join("")}
          </div>
        </section>
        <section class="review-panel">
          <div class="subsection-heading">
            <h2>导出前检查</h2>
            <span>${workflowIssues.length + state.issues.length} 项待处理</span>
          </div>
          <div class="export-source-note">
            ${state.sourceWorkbook?.filename
              ? `将回填：${escapeHtml(state.sourceWorkbook.filename)}`
              : "未导入原成绩表时，将生成同列结构的新成绩表。"}
          </div>
          ${workflowIssueList(workflowIssues, state.issues)}
        </section>
      </div>
      <section class="ranking-section">
        <div class="subsection-heading">
          <h2>排名预览</h2>
          <span>总分、总用时、机器人重量</span>
        </div>
        <div class="data-table-wrap compact">
          <table class="data-table">
            <thead><tr><th>组别</th><th>排名</th><th>奖项</th><th>队伍</th><th>第一轮</th><th>第二轮</th><th>总成绩</th><th>总用时</th><th>重量</th></tr></thead>
            <tbody>
              ${rankedRows.length ? rankedRows.map((team) => `
                <tr>
                  <td>${escapeHtml(team.group)}</td><td>${team.rank ?? "--"}</td><td>${awardBadge(team.award)}</td>
                  <td><strong>${escapeHtml(team.teamName)}</strong><span>${escapeHtml(team.school || "")}</span></td>
                  <td>${team.roundTotals[0]}</td><td>${team.roundTotals[1]}</td><td class="number-strong">${team.totalScore}</td>
                  <td>${team.totalSeconds} 秒</td><td>${team.robotWeight || "--"}</td>
                </tr>
              `).join("") : `<tr><td colspan="9" class="table-empty">暂无完整成绩</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
      <footer class="danger-zone">
        <span>本机数据</span>
        <button class="button button-danger-quiet button-small" data-action="clear-all" type="button">删除全部队伍</button>
      </footer>
    </section>
  `;
}

function awardGroup(group, result) {
  const active = result.teams.filter((team) => team.complete && !team.eliminated).length;
  const counts = state.awardCountsByGroup[group] ?? result.awardCounts ?? suggestAwardCounts(active);
  return `
    <div class="award-group">
      <div><strong>${group}</strong><span>${active} 支有效队伍</span></div>
      <label>一等奖<input data-award-group="${group}" data-award-key="first" type="number" min="0" max="${active}" value="${counts.first ?? 0}"></label>
      <label>二等奖<input data-award-group="${group}" data-award-key="second" type="number" min="0" max="${active}" value="${counts.second ?? 0}"></label>
      <label>三等奖<input data-award-group="${group}" data-award-key="third" type="number" min="0" max="${active}" value="${counts.third ?? 0}"></label>
    </div>
  `;
}

function workflowIssueList(workflowIssues, importIssues) {
  const items = [
    ...workflowIssues.map(({ entry, status }) => ({
      entryId: entry.id,
      title: entry.teamName,
      message: status?.key === "ready" ? "待复核" : status?.label ?? "待处理",
      tone: status?.key === "ready" ? "warn" : "danger",
    })),
    ...importIssues.map((issue) => ({ title: "名单导入", message: issue.message, tone: "danger" })),
  ];
  if (!items.length) {
    return `<div class="all-clear"><strong>检查完成</strong><span>所有纸单均已复核</span></div>`;
  }
  return `<div class="review-list">${items.slice(0, 80).map((item) => `
    <button class="review-item ${item.tone}" ${item.entryId ? `data-open-entry="${escapeAttr(item.entryId)}"` : "disabled"} type="button">
      <strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.message)}</span>
    </button>
  `).join("")}</div>`;
}

function teamDialog() {
  return `
    <dialog id="teamDialog" class="team-dialog">
      <form id="teamForm">
        <header>
          <div><span id="teamDialogEyebrow">纸质成绩单</span><h2 id="teamDialogTitle">手工建队</h2></div>
          <button class="icon-button" data-action="close-dialog" type="button" aria-label="关闭" title="关闭">×</button>
        </header>
        <div class="team-form-grid">
          <label><span>组别 *</span><select name="group" required>${GROUPS.map((group) => `<option value="${group}">${group}</option>`).join("")}</select></label>
          <label><span>序号</span><input name="serial" autocomplete="off"></label>
          <label><span>抽签号</span><input name="number" autocomplete="off"></label>
          <label><span>地市</span><input name="city" autocomplete="off"></label>
          <label class="wide"><span>队伍名称</span><input name="teamName" autocomplete="off"></label>
          <label class="wide"><span>学校全称</span><input name="school" autocomplete="off"></label>
          <label><span>参赛选手 A</span><input name="studentA" autocomplete="off"></label>
          <label><span>参赛选手 B</span><input name="studentB" autocomplete="off"></label>
          <label><span>教练员</span><input name="coach" autocomplete="off"></label>
          <label><span>教练员联系方式</span><input name="coachPhone" autocomplete="off" inputmode="tel"></label>
          <label class="wide"><span>备注</span><input name="note" autocomplete="off"></label>
        </div>
        <div id="teamFormError" class="form-error" role="alert"></div>
        <footer>
          <button class="button button-secondary" data-action="close-dialog" type="button">取消</button>
          <button class="button button-primary" type="submit">保存队伍</button>
        </footer>
      </form>
    </dialog>
  `;
}

function bindEvents() {
  // 事件委托：在 app 容器上单次绑定 click 事件
  app.onclick = (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton && app.contains(viewButton)) {
      state.view = viewButton.dataset.view;
      saveAndRender();
      return;
    }

    const actionElement = event.target.closest("[data-action]");
    if (actionElement && app.contains(actionElement)) {
      const action = actionElement.dataset.action;
      if (action === "open-create") { openTeamDialog("create"); return; }
      if (action === "open-edit") { openTeamDialog("edit", state.activeEntryId); return; }
      if (action === "close-dialog") { closeTeamDialog(); return; }
      if (action === "previous-entry") { navigateEntry(-1); return; }
      if (action === "next-entry") { navigateEntry(1); return; }
      if (action === "toggle-review") { toggleReview(); return; }
      if (action === "delete-entry") { deleteEntry(); return; }
      if (action === "reset-awards") { resetAwardCounts(true); return; }
      if (action === "export") { exportWorkbook(); return; }
      if (action === "clear-all") { clearAll(); return; }
      return;
    }

    const entryButton = event.target.closest("[data-entry-id]");
    if (entryButton && app.contains(entryButton)) {
      state.activeEntryId = entryButton.dataset.entryId;
      saveAndRender();
      return;
    }

    const overviewGroupButton = event.target.closest("[data-overview-group]");
    if (overviewGroupButton && app.contains(overviewGroupButton)) {
      state.overviewGroup = overviewGroupButton.dataset.overviewGroup;
      saveAndRender();
      return;
    }

    const openEntryElement = event.target.closest("[data-open-entry]");
    if (openEntryElement && app.contains(openEntryElement)) {
      state.activeEntryId = openEntryElement.dataset.openEntry;
      state.view = "entry";
      saveAndRender();
      return;
    }
  };

  // 保留直接绑定：表单、文件输入、搜索、评分控件等需要精确事件处理的元素
  document.querySelector("#teamForm")?.addEventListener("submit", submitTeamForm);
  document.querySelector("#rosterInput")?.addEventListener("change", importRoster);
  document.querySelectorAll("[data-roster-input]").forEach((input) => input.addEventListener("change", importRoster));
  document.querySelector("#queueSearch")?.addEventListener("input", updateQueueSearch);
  document.querySelector("#queueGroup")?.addEventListener("change", (event) => {
    state.queueGroup = event.target.value;
    saveAndRender();
  });
  document.querySelector("#queueStatus")?.addEventListener("change", (event) => {
    state.queueStatus = event.target.value;
    saveAndRender();
  });

  document.querySelectorAll("[data-score-radio]").forEach((control) => control.addEventListener("change", updateScoreRadio));
  document.querySelectorAll("[data-score-field]").forEach((control) => {
    control.addEventListener("input", stageScoreField);
    control.addEventListener("change", updateScoreField);
  });

  document.querySelector("#overviewSearch")?.addEventListener("input", updateOverviewSearch);
  document.querySelectorAll("[data-award-group]").forEach((control) => control.addEventListener("input", updateAwardCount));
}

function openTeamDialog(mode, entryId = null) {
  const dialog = document.querySelector("#teamDialog");
  const form = document.querySelector("#teamForm");
  if (!dialog || !form) {
    return;
  }
  teamDialogContext = { mode, entryId };
  const entry = mode === "edit" ? state.entries.find((candidate) => candidate.id === entryId) : null;
  form.reset();
  form.elements.group.value = entry?.group ?? (GROUPS.includes(state.queueGroup) ? state.queueGroup : GROUPS[0]);
  for (const field of ["serial", "number", "city", "teamName", "school", "studentA", "studentB", "coach", "coachPhone", "note"]) {
    form.elements[field].value = entry?.[field] ?? "";
  }
  document.querySelector("#teamDialogTitle").textContent = mode === "edit" ? "编辑队伍" : "手工建队";
  document.querySelector("#teamFormError").textContent = "";
  dialog.showModal();
  window.setTimeout(() => form.elements.teamName.focus(), 0);
}

function closeTeamDialog() {
  document.querySelector("#teamDialog")?.close();
}

function submitTeamForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = Object.fromEntries(new FormData(form).entries());
  fields.teamName = normalizeText(fields.teamName) || manualTeamName(fields);
  const others = state.entries.filter((entry) => entry.id !== teamDialogContext.entryId);
  const issues = validateManualTeam(fields, others);
  if (issues.length) {
    document.querySelector("#teamFormError").textContent = issues[0].message;
    form.elements[issues[0].field]?.focus();
    return;
  }

  if (teamDialogContext.mode === "edit") {
    const entry = state.entries.find((candidate) => candidate.id === teamDialogContext.entryId);
    if (entry) {
      const previousSystemId = entry.systemId;
      const previousNumber = entry.number;
      for (const field of ["group", "serial", "number", "city", "teamName", "school", "studentA", "studentB", "coach", "coachPhone", "note"]) {
        entry[field] = normalizeText(fields[field]);
      }
      if (!previousSystemId || previousSystemId === previousNumber) {
        entry.systemId = entry.number;
      }
      entry.reviewed = false;
    }
  } else {
    const entry = createManualEntry(fields, state.entries.length);
    state.entries.push(entry);
    state.activeEntryId = entry.id;
  }

  state.view = "entry";
  closeTeamDialog();
  syncAwardCounts();
  saveAndRender();
}

function manualTeamName(fields) {
  const school = normalizeText(fields.school);
  const students = [fields.studentA, fields.studentB].map(normalizeText).filter(Boolean).join("、");
  if (school && students) {
    return `${school}（${students}）`;
  }
  return school || students || normalizeText(fields.number);
}

async function importRoster(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  state.busy = true;
  render();
  try {
    const base64 = await fileToBase64(file);
    const response = await fetch("/api/roster", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename: file.name, base64 }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "名单导入失败");
    }
    const merged = mergeRosterEntries(state.entries, data.validRows);
    state.entries = merged.entries;
    state.issues = [
      ...data.missingColumns.map((column) => ({ message: `缺少列：${column}` })),
      ...data.issues,
    ];
    state.sourceWorkbook = {
      filename: file.name,
      base64,
      importedAt: new Date().toISOString(),
    };
    state.activeEntryId ??= state.entries[0]?.id ?? null;
    state.view = "entry";
    syncAwardCounts();
    toast(`新增 ${data.validRows.length - merged.duplicates} 支队伍，合并 ${merged.duplicates} 支重复队伍`);
  } catch (error) {
    toast(error.message);
  } finally {
    state.busy = false;
    saveAndRender();
  }
}

function updateQueueSearch(event) {
  state.query = event.target.value;
  debouncedSaveAndRender({ focusId: "queueSearch", cursorToEnd: true });
}

function updateOverviewSearch(event) {
  state.overviewQuery = event.target.value;
  debouncedSaveAndRender({ focusId: "overviewSearch", cursorToEnd: true });
}

function updateScoreRadio(event) {
  const control = event.currentTarget;
  const entry = state.entries.find((candidate) => candidate.id === control.dataset.entry);
  if (!entry) {
    return;
  }
  const value = control.value;
  entry.rounds[Number(control.dataset.round)].scores[control.dataset.task] = value === "" || value === "/" ? value : Number(value);
  entry.reviewed = false;
  syncAwardCounts();
  saveState();
  refreshActiveScoreDisplay(entry);
}

function updateScoreField(event) {
  const control = event.currentTarget;
  applyScoreField(control);
  saveState();
  refreshActiveScoreDisplay();
}

function stageScoreField(event) {
  const control = event.currentTarget;
  applyScoreField(control);
  saveState();
  refreshActiveScoreDisplay();
}

function applyScoreField(control) {
  const entry = state.entries.find((candidate) => candidate.id === state.activeEntryId);
  if (!entry) {
    return;
  }
  if (control.dataset.field === "robotWeight") {
    entry.robotWeight = control.value;
  } else if (control.dataset.field === "seconds") {
    entry.rounds[Number(control.dataset.round)].seconds = control.value;
  }
  entry.reviewed = false;
  syncAwardCounts();
}

function refreshActiveScoreDisplay(entry = state.entries.find((candidate) => candidate.id === state.activeEntryId)) {
  if (!entry) {
    return;
  }
  const status = getEntryWorkflowStatus(entry);
  const calculated = calculateTeam(entry);

  updateSummaryValue("round-0", calculated.complete || status.filled ? calculated.roundTotals[0] : "--");
  updateSummaryValue("round-1", calculated.complete || status.filled ? calculated.roundTotals[1] : "--");
  updateSummaryValue("total-score", calculated.complete ? calculated.totalScore : "--");
  updateSummaryValue("total-seconds", calculated.complete ? calculated.totalSeconds : "--");

  const paperStatus = document.querySelector(".paper-heading .status-badge");
  if (paperStatus) {
    paperStatus.outerHTML = statusBadge(status, true);
  }
  const paperCheck = document.querySelector(".paper-check");
  if (paperCheck) {
    paperCheck.innerHTML = paperCheckMessage(status);
  }
  refreshReviewButton(status);
  refreshActiveQueueItem(status, calculated);
  refreshProgressMetrics();
}

function updateSummaryValue(key, value) {
  const element = document.querySelector(`[data-summary="${key}"] strong`);
  if (element) {
    element.textContent = value;
  }
}

function refreshReviewButton(status) {
  const button = document.querySelector("[data-action='toggle-review']");
  if (!button) {
    return;
  }
  const reviewDisabled = !["ready", "reviewed"].includes(status.key);
  button.disabled = reviewDisabled;
  button.classList.toggle("button-secondary", status.key === "reviewed");
  button.classList.toggle("button-primary", status.key !== "reviewed");
  button.textContent = status.key === "reviewed" ? "取消复核" : "标记已复核";
}

function refreshActiveQueueItem(status, calculated) {
  const activeItem = document.querySelector(".queue-item.active");
  if (!activeItem) {
    return;
  }
  const badge = activeItem.querySelector(".status-badge");
  if (badge) {
    badge.outerHTML = statusBadge(status);
  }
  const score = activeItem.querySelector(".queue-item-side b");
  if (score) {
    score.textContent = calculated.complete ? calculated.totalScore : "--";
  }
}

function refreshProgressMetrics() {
  const statuses = state.entries.map((entry) => getEntryWorkflowStatus(entry));
  const paperCompleteCount = state.entries.map(calculateTeam).filter((team) => team.complete).length;
  const reviewedCount = statuses.filter((status) => status.key === "reviewed").length;
  const pending = Math.max(0, state.entries.length - reviewedCount);
  updateMetricValue("teams", state.entries.length);
  updateMetricValue("complete", paperCompleteCount);
  updateMetricValue("reviewed", reviewedCount);
  updateMetricValue("pending", pending);
  document.querySelector('[data-metric="pending"]')?.classList.toggle("warn", Boolean(pending));
  document.querySelector('[data-metric="pending"]')?.classList.toggle("ok", !pending);
}

function updateMetricValue(key, value) {
  const element = document.querySelector(`[data-metric="${key}"] strong`);
  if (element) {
    element.textContent = value;
  }
}

function navigateEntry(offset) {
  const index = state.entries.findIndex((entry) => entry.id === state.activeEntryId);
  const next = state.entries[index + offset];
  if (next) {
    state.activeEntryId = next.id;
    saveAndRender();
  }
}

function toggleReview() {
  const entry = state.entries.find((candidate) => candidate.id === state.activeEntryId);
  if (!entry) {
    return;
  }
  const status = getEntryWorkflowStatus(entry);
  if (status.key === "reviewed") {
    entry.reviewed = false;
  } else if (status.key === "ready") {
    entry.reviewed = true;
  }
  saveAndRender();
}

function deleteEntry() {
  const entry = state.entries.find((candidate) => candidate.id === state.activeEntryId);
  if (!entry || !window.confirm(`确定删除“${entry.teamName}”及其全部成绩吗？`)) {
    return;
  }
  const index = state.entries.indexOf(entry);
  state.entries.splice(index, 1);
  state.activeEntryId = state.entries[index]?.id ?? state.entries[index - 1]?.id ?? null;
  syncAwardCounts();
  saveAndRender();
}

function updateAwardCount(event) {
  const control = event.currentTarget;
  const group = control.dataset.awardGroup;
  const key = control.dataset.awardKey;
  state.awardCountsByGroup[group] ??= suggestAwardCounts(0);
  state.awardCountsByGroup[group][key] = Math.max(0, Number(control.value) || 0);
  state.awardManualGroups[group] = true;
  saveState();
}

function resetAwardCounts(shouldRender = true) {
  state.awardManualGroups = {};
  state.awardCountsByGroup = reconcileAwardCounts(state.entries, {}, {});
  if (shouldRender) {
    saveAndRender();
  }
}

function syncAwardCounts() {
  state.awardCountsByGroup = reconcileAwardCounts(state.entries, state.awardCountsByGroup, state.awardManualGroups);
}

async function exportWorkbook() {
  if (!state.entries.length) {
    toast("暂无可导出的队伍");
    return;
  }
  const unresolved = state.entries.filter((entry) => getEntryWorkflowStatus(entry).key !== "reviewed");
  if (unresolved.length && !window.confirm(`仍有 ${unresolved.length} 支队伍未完成复核，继续导出草稿吗？`)) {
    return;
  }
  state.busy = true;
  render();
  try {
    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entries: state.entries,
        awardCountsByGroup: state.awardCountsByGroup,
        sourceWorkbookBase64: state.sourceWorkbook?.base64 ?? "",
      }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "导出失败");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "26届省赛道路工程_成绩表.xlsx";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast("成绩表已生成");
  } catch (error) {
    toast(error.message);
  } finally {
    state.busy = false;
    saveAndRender();
  }
}

function clearAll() {
  if (!state.entries.length || !window.confirm("确定删除全部队伍、成绩和奖项设置吗？此操作只清空本机保存的数据。")) {
    return;
  }
  state.entries = [];
  state.activeEntryId = null;
  state.issues = [];
  state.awardCountsByGroup = {};
  state.awardManualGroups = {};
  state.sourceWorkbook = null;
  state.query = "";
  state.overviewQuery = "";
  state.view = "entry";
  saveAndRender();
}

function ensureActiveEntry() {
  if (!state.entries.some((entry) => entry.id === state.activeEntryId)) {
    state.activeEntryId = state.entries[0]?.id ?? null;
  }
}

function hydrateState(saved) {
  const source = saved && typeof saved === "object" ? saved : {};
  const entries = Array.isArray(source.entries) ? source.entries.map(hydrateEntry) : [];
  return {
    entries,
    activeEntryId: source.activeEntryId ?? entries[0]?.id ?? null,
    view: ["entry", "overview", "awards"].includes(source.view) ? source.view : "entry",
    queueGroup: ["全部", ...GROUPS].includes(source.queueGroup) ? source.queueGroup : "全部",
    queueStatus: source.queueStatus ?? "全部",
    query: source.query ?? "",
    overviewGroup: ["全部", ...GROUPS].includes(source.overviewGroup) ? source.overviewGroup : "全部",
    overviewQuery: source.overviewQuery ?? "",
    issues: Array.isArray(source.issues) ? source.issues : [],
    awardCountsByGroup: source.awardCountsByGroup ?? {},
    awardManualGroups: source.awardManualGroups ?? {},
    sourceWorkbook: source.sourceWorkbook?.base64 ? {
      filename: source.sourceWorkbook.filename ?? "原成绩表.xlsx",
      base64: source.sourceWorkbook.base64,
      importedAt: source.sourceWorkbook.importedAt ?? "",
    } : null,
    busy: false,
  };
}

function hydrateEntry(entry, index) {
  const rounds = [0, 1].map((roundIndex) => {
    const base = emptyRound();
    const sourceRound = entry.rounds?.[roundIndex] ?? {};
    return {
      seconds: sourceRound.seconds ?? "",
      scores: Object.fromEntries(ROAD_TASKS.map((task) => [task.key, sourceRound.scores?.[task.key] ?? base.scores[task.key]])),
    };
  });
  return {
    ...entry,
    id: entry.id ?? `team-${index + 1}`,
    group: entry.group ?? GROUPS[0],
    teamName: entry.teamName ?? `未命名队伍${index + 1}`,
    school: entry.school ?? "",
    studentA: entry.studentA ?? "",
    studentB: entry.studentB ?? "",
    coach: entry.coach ?? "",
    number: entry.number ?? "",
    city: entry.city ?? "",
    coachPhone: entry.coachPhone ?? "",
    serial: entry.serial ?? "",
    systemId: entry.systemId ?? "",
    rawStudents: entry.rawStudents ?? "",
    sourceSheet: entry.sourceSheet ?? "",
    note: entry.note ?? "",
    robotWeight: entry.robotWeight ?? "",
    rounds,
    reviewed: Boolean(entry.reviewed),
    source: entry.source ?? "excel",
  };
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey));
  } catch {
    return null;
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function saveAndRender(options = {}) {
  const nextOptions = options.preserveScroll
    ? { ...options, scrollState: captureScrollState() }
    : options;
  saveState();
  render(nextOptions);
}

function captureScrollState() {
  return {
    windowX: window.scrollX,
    windowY: window.scrollY,
    containers: [".view-area", ".paper-stage", ".queue-list"].map((selector) => {
      const element = document.querySelector(selector);
      return element
        ? { selector, scrollLeft: element.scrollLeft, scrollTop: element.scrollTop }
        : null;
    }).filter(Boolean),
  };
}

function restoreViewport(options) {
  window.setTimeout(() => {
    restoreScrollState(options.scrollState);
    restoreFocus(options);
    restoreScrollState(options.scrollState);
  }, 0);
}

function restoreScrollState(scrollState) {
  if (!scrollState) {
    return;
  }
  for (const item of scrollState.containers ?? []) {
    const element = document.querySelector(item.selector);
    if (element) {
      element.scrollLeft = item.scrollLeft;
      element.scrollTop = item.scrollTop;
    }
  }
  window.scrollTo(scrollState.windowX ?? 0, scrollState.windowY ?? 0);
}

function restoreFocus(options) {
  if (!options.focusId) {
    return;
  }
  const element = document.getElementById(options.focusId);
  if (!element) {
    return;
  }
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
  if (options.cursorToEnd && typeof element.setSelectionRange === "function") {
    const end = element.value.length;
    element.setSelectionRange(end, end);
  }
}

function statusBadge(status, large = false) {
  const value = status ?? { key: "unstarted", label: "未录入" };
  return `<span class="status-badge status-${value.key} ${large ? "large" : ""}">${escapeHtml(value.label)}</span>`;
}

function awardBadge(award) {
  if (!award) {
    return `<span class="award-badge neutral">未定</span>`;
  }
  const tone = { 一等奖: "first", 二等奖: "second", 三等奖: "third", 淘汰: "out" }[award] ?? "neutral";
  return `<span class="award-badge ${tone}">${escapeHtml(award)}</span>`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result).split(",").pop()));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function toast(message) {
  document.querySelector(".toast")?.remove();
  const element = document.createElement("div");
  element.className = "toast";
  element.textContent = message;
  document.body.append(element);
  window.setTimeout(() => element.remove(), 2800);
}

function safeId(value) {
  let hash = 0;
  for (const character of String(value)) {
    hash = ((hash << 5) - hash + character.codePointAt(0)) | 0;
  }
  return `field-${Math.abs(hash)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
