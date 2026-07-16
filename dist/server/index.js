import {
  GROUPS,
  REQUIRED_ROSTER_COLUMNS,
  ROAD_TASKS,
  buildGroupResults,
  createEntryFromRoster,
  validateRosterRows,
} from "./core.js";

const STATIC_ASSETS = {"index.html":"<!doctype html>\n<html lang=\"zh-CN\">\n  <head>\n    <meta charset=\"utf-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n    <title>道路工程成绩统计工具</title>\n    <link rel=\"stylesheet\" href=\"/styles.css\">\n  </head>\n  <body>\n    <div id=\"app\" class=\"app-shell\">\n      <main class=\"boot-panel\">\n        <div class=\"loader\"></div>\n        <p>正在加载工具...</p>\n      </main>\n    </div>\n    <script type=\"module\" src=\"/app.js\"></script>\n  </body>\n</html>\n","styles.css":":root {\n  color-scheme: light;\n  --canvas: #f1f4f1;\n  --surface: #ffffff;\n  --surface-subtle: #f7f9f7;\n  --surface-muted: #edf1ee;\n  --ink: #172625;\n  --ink-soft: #334846;\n  --muted: #667774;\n  --line: #d9e1dd;\n  --line-strong: #bcc9c4;\n  --brand: #176b63;\n  --brand-strong: #0e514b;\n  --brand-soft: #e5f2ef;\n  --amber: #a96716;\n  --amber-soft: #fff1d8;\n  --blue: #35627f;\n  --blue-soft: #e8f1f7;\n  --danger: #a33a32;\n  --danger-soft: #fbe9e6;\n  --ok: #28654a;\n  --ok-soft: #e5f3ea;\n  --shadow: 0 14px 32px rgba(32, 51, 47, 0.09);\n  --radius: 6px;\n  font-family: \"Microsoft YaHei UI\", \"PingFang SC\", \"Noto Sans CJK SC\", sans-serif;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nhtml,\nbody {\n  min-height: 100%;\n  margin: 0;\n}\n\nbody {\n  min-width: 320px;\n  background: var(--canvas);\n  color: var(--ink);\n  font-size: 14px;\n  letter-spacing: 0;\n}\n\nbutton,\ninput,\nselect {\n  font: inherit;\n  letter-spacing: 0;\n}\n\nbutton,\nlabel,\na {\n  -webkit-tap-highlight-color: transparent;\n}\n\nbutton:focus-visible,\ninput:focus-visible,\nselect:focus-visible,\na:focus-visible {\n  outline: 3px solid rgba(23, 107, 99, 0.23);\n  outline-offset: 2px;\n}\n\nbutton:disabled,\n.is-disabled {\n  cursor: not-allowed;\n  opacity: 0.48;\n}\n\nh1,\nh2,\np {\n  margin: 0;\n}\n\n.visually-hidden {\n  position: absolute !important;\n  width: 1px !important;\n  height: 1px !important;\n  padding: 0 !important;\n  margin: -1px !important;\n  overflow: hidden !important;\n  clip: rect(0, 0, 0, 0) !important;\n  white-space: nowrap !important;\n  border: 0 !important;\n}\n\n.app-shell {\n  height: 100vh;\n  min-height: 100vh;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n}\n\n.appbar {\n  position: sticky;\n  top: 0;\n  z-index: 30;\n  min-height: 64px;\n  display: grid;\n  grid-template-columns: 220px minmax(360px, 1fr) auto;\n  align-items: center;\n  gap: 20px;\n  padding: 0 22px;\n  border-bottom: 1px solid var(--line);\n  background: rgba(255, 255, 255, 0.97);\n}\n\n.brand-block {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  min-width: 0;\n}\n\n.brand-mark {\n  width: 34px;\n  height: 34px;\n  flex: 0 0 34px;\n  display: grid;\n  place-items: center;\n  border-radius: 5px;\n  background: var(--brand-strong);\n  color: #ffffff;\n  font-family: \"STKaiti\", \"KaiTi\", serif;\n  font-size: 20px;\n  font-weight: 700;\n}\n\n.brand-block div {\n  min-width: 0;\n}\n\n.brand-block strong,\n.brand-block span {\n  display: block;\n  white-space: nowrap;\n}\n\n.brand-block strong {\n  font-size: 15px;\n}\n\n.brand-block div span {\n  margin-top: 2px;\n  color: var(--muted);\n  font-size: 11px;\n}\n\n.view-tabs {\n  height: 64px;\n  display: flex;\n  align-items: stretch;\n  justify-content: center;\n  gap: 6px;\n}\n\n.view-tab {\n  position: relative;\n  min-width: 104px;\n  padding: 0 16px;\n  border: 0;\n  background: transparent;\n  color: var(--muted);\n  font-weight: 700;\n  cursor: pointer;\n}\n\n.view-tab::after {\n  content: \"\";\n  position: absolute;\n  right: 14px;\n  bottom: 0;\n  left: 14px;\n  height: 3px;\n  border-radius: 3px 3px 0 0;\n  background: transparent;\n}\n\n.view-tab:hover {\n  color: var(--ink);\n  background: var(--surface-subtle);\n}\n\n.view-tab.active {\n  color: var(--brand-strong);\n}\n\n.view-tab.active::after {\n  background: var(--brand);\n}\n\n.app-actions,\n.section-tools,\n.toolbar-actions,\n.paper-actions,\n.empty-actions {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.button,\n.icon-button {\n  border: 1px solid transparent;\n  border-radius: var(--radius);\n  cursor: pointer;\n  text-decoration: none;\n  transition: background 140ms ease, border-color 140ms ease, color 140ms ease, transform 100ms ease;\n}\n\n.button {\n  min-height: 36px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0 13px;\n  white-space: nowrap;\n  font-size: 13px;\n  font-weight: 700;\n}\n\n.button:active,\n.icon-button:active {\n  transform: translateY(1px);\n}\n\n.button-primary {\n  border-color: var(--brand);\n  background: var(--brand);\n  color: #ffffff;\n}\n\n.button-primary:hover:not(:disabled) {\n  border-color: var(--brand-strong);\n  background: var(--brand-strong);\n}\n\n.button-secondary {\n  border-color: var(--line-strong);\n  background: var(--surface);\n  color: var(--ink-soft);\n}\n\n.button-secondary:hover:not(:disabled) {\n  border-color: #8da39c;\n  background: var(--surface-subtle);\n}\n\n.button-quiet {\n  border-color: transparent;\n  background: transparent;\n  color: var(--muted);\n}\n\n.button-quiet:hover {\n  background: var(--surface-muted);\n  color: var(--ink);\n}\n\n.button-danger-quiet {\n  border-color: transparent;\n  background: transparent;\n  color: var(--danger);\n}\n\n.button-danger-quiet:hover {\n  border-color: #e7b8b2;\n  background: var(--danger-soft);\n}\n\n.button-small {\n  min-height: 30px;\n  padding: 0 10px;\n  font-size: 12px;\n}\n\n.icon-button {\n  width: 34px;\n  height: 34px;\n  display: inline-grid;\n  place-items: center;\n  padding: 0;\n  border-color: var(--line-strong);\n  background: var(--surface);\n  color: var(--ink-soft);\n  font-size: 18px;\n  line-height: 1;\n}\n\n.icon-button:hover:not(:disabled) {\n  border-color: #8da39c;\n  background: var(--surface-subtle);\n}\n\n.progress-strip {\n  min-height: 42px;\n  display: flex;\n  align-items: center;\n  gap: 0;\n  padding: 0 22px;\n  border-bottom: 1px solid var(--line);\n  background: #f8faf8;\n}\n\n.compact-metric {\n  display: flex;\n  align-items: baseline;\n  gap: 8px;\n  min-width: 120px;\n  padding: 0 22px;\n  border-right: 1px solid var(--line);\n}\n\n.compact-metric:first-child {\n  padding-left: 0;\n}\n\n.compact-metric span {\n  color: var(--muted);\n  font-size: 12px;\n}\n\n.compact-metric strong {\n  font-variant-numeric: tabular-nums;\n  font-size: 17px;\n}\n\n.compact-metric.warn strong {\n  color: var(--amber);\n}\n\n.compact-metric.ok strong {\n  color: var(--ok);\n}\n\n.save-state {\n  margin-left: auto;\n  color: var(--muted);\n  font-size: 12px;\n}\n\n.save-state::before {\n  content: \"\";\n  width: 7px;\n  height: 7px;\n  display: inline-block;\n  margin-right: 7px;\n  border-radius: 50%;\n  background: var(--ok);\n}\n\n.view-area {\n  min-height: 0;\n  flex: 1;\n  overflow: auto;\n}\n\n.entry-layout {\n  height: 100%;\n  min-height: 0;\n  display: grid;\n  grid-template-columns: 292px minmax(0, 1fr);\n}\n\n.entry-queue {\n  height: 100%;\n  min-height: 0;\n  display: flex;\n  flex-direction: column;\n  border-right: 1px solid var(--line);\n  background: var(--surface);\n}\n\n.queue-header {\n  min-height: 60px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  padding: 12px 14px;\n  border-bottom: 1px solid var(--line);\n}\n\n.queue-header > div {\n  display: flex;\n  align-items: baseline;\n  gap: 8px;\n}\n\n.queue-header h2 {\n  font-size: 15px;\n}\n\n.queue-header span {\n  color: var(--muted);\n  font-size: 11px;\n}\n\n.queue-filters {\n  display: grid;\n  gap: 8px;\n  padding: 12px;\n  border-bottom: 1px solid var(--line);\n  background: var(--surface-subtle);\n}\n\n.filter-row {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 8px;\n}\n\n.text-input,\n.select-input,\n.team-form-grid input,\n.team-form-grid select,\n.award-group input {\n  width: 100%;\n  height: 36px;\n  padding: 0 10px;\n  border: 1px solid var(--line-strong);\n  border-radius: var(--radius);\n  background: var(--surface);\n  color: var(--ink);\n}\n\n.text-input::placeholder {\n  color: #92a19d;\n}\n\n.text-input:hover,\n.select-input:hover,\n.team-form-grid input:hover,\n.team-form-grid select:hover {\n  border-color: #8da39c;\n}\n\n.queue-list {\n  min-height: 0;\n  flex: 1;\n  overflow: auto;\n}\n\n.queue-item {\n  width: 100%;\n  min-height: 76px;\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;\n  gap: 10px;\n  padding: 11px 13px;\n  border: 0;\n  border-bottom: 1px solid var(--line);\n  background: var(--surface);\n  color: var(--ink);\n  text-align: left;\n  cursor: pointer;\n}\n\n.queue-item:hover {\n  background: #f7faf8;\n}\n\n.queue-item.active {\n  background: var(--brand-soft);\n  box-shadow: inset 3px 0 0 var(--brand);\n}\n\n.queue-item-main,\n.queue-item-side {\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n}\n\n.queue-item-main {\n  gap: 3px;\n}\n\n.queue-item-main strong,\n.queue-item-main small {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.queue-item-main strong {\n  font-size: 14px;\n}\n\n.queue-number {\n  color: var(--brand-strong);\n  font-size: 11px;\n  font-weight: 700;\n}\n\n.queue-item-main small {\n  color: var(--muted);\n  font-size: 11px;\n}\n\n.queue-item-side {\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 7px;\n}\n\n.queue-item-side b {\n  font-variant-numeric: tabular-nums;\n  font-size: 16px;\n}\n\n.queue-empty {\n  padding: 30px 16px;\n  color: var(--muted);\n  text-align: center;\n}\n\n.paper-stage {\n  height: 100%;\n  min-width: 0;\n  overflow: auto;\n  padding: 18px 22px 30px;\n}\n\n.paper-toolbar,\n.paper-sheet {\n  width: min(1100px, 100%);\n  margin-right: auto;\n  margin-left: auto;\n}\n\n.paper-toolbar {\n  min-height: 42px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n  margin-bottom: 10px;\n  color: var(--muted);\n  font-size: 12px;\n}\n\n.paper-sheet {\n  border: 1px solid var(--line-strong);\n  border-radius: 4px;\n  background: var(--surface);\n  box-shadow: var(--shadow);\n}\n\n.paper-heading {\n  min-height: 112px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 20px;\n  padding: 22px 26px;\n  border-bottom: 1px solid var(--line-strong);\n}\n\n.paper-heading p {\n  margin-bottom: 5px;\n  color: var(--brand-strong);\n  font-family: \"STKaiti\", \"KaiTi\", serif;\n  font-size: 15px;\n  font-weight: 700;\n}\n\n.paper-heading h1 {\n  max-width: 680px;\n  overflow-wrap: anywhere;\n  font-size: 23px;\n  line-height: 1.25;\n}\n\n.paper-heading div > span {\n  display: block;\n  margin-top: 7px;\n  color: var(--muted);\n  font-size: 12px;\n}\n\n.score-table-wrap {\n  overflow-x: auto;\n}\n\n.paper-score-table,\n.data-table {\n  width: 100%;\n  border-collapse: collapse;\n}\n\n.paper-score-table {\n  min-width: 790px;\n  table-layout: fixed;\n}\n\n.paper-score-table th,\n.paper-score-table td {\n  height: 58px;\n  padding: 8px 12px;\n  border-right: 1px solid var(--line);\n  border-bottom: 1px solid var(--line);\n  text-align: center;\n  vertical-align: middle;\n}\n\n.paper-score-table th:last-child,\n.paper-score-table td:last-child {\n  border-right: 0;\n}\n\n.paper-score-table thead th {\n  height: 42px;\n  background: #edf3f1;\n  color: var(--ink-soft);\n  font-size: 12px;\n}\n\n.paper-score-table th:nth-child(1) {\n  width: 18%;\n}\n\n.paper-score-table th:nth-child(2) {\n  width: 14%;\n}\n\n.paper-score-table th:nth-child(3),\n.paper-score-table th:nth-child(4) {\n  width: 34%;\n}\n\n.task-name {\n  text-align: left !important;\n}\n\n.task-name strong {\n  font-size: 14px;\n}\n\n.allowed-scores {\n  color: var(--muted);\n  font-variant-numeric: tabular-nums;\n  font-size: 12px;\n}\n\n.score-options {\n  min-height: 34px;\n  display: flex;\n  align-items: stretch;\n  justify-content: center;\n}\n\n.score-choice label {\n  min-width: 42px;\n  height: 34px;\n  display: grid;\n  place-items: center;\n  margin-left: -1px;\n  border: 1px solid var(--line-strong);\n  background: var(--surface);\n  color: var(--ink-soft);\n  font-variant-numeric: tabular-nums;\n  font-size: 13px;\n  font-weight: 700;\n  cursor: pointer;\n}\n\n.score-choice:first-child label {\n  margin-left: 0;\n  border-radius: 5px 0 0 5px;\n}\n\n.score-choice:last-child label {\n  border-radius: 0 5px 5px 0;\n}\n\n.score-choice input:checked + label {\n  position: relative;\n  z-index: 1;\n  border-color: var(--brand);\n  background: var(--brand);\n  color: #ffffff;\n}\n\n.score-choice input:focus-visible + label {\n  position: relative;\n  z-index: 2;\n  outline: 3px solid rgba(23, 107, 99, 0.23);\n  outline-offset: 2px;\n}\n\n.clear-choice label {\n  color: #9aa7a3;\n  font-size: 16px;\n  font-weight: 400;\n}\n\n.clear-choice input:checked + label {\n  border-color: var(--line-strong);\n  background: var(--surface-muted);\n  color: var(--muted);\n}\n\n.time-row td {\n  background: #fbfcfb;\n}\n\n.time-input {\n  display: inline-flex;\n  align-items: center;\n  gap: 7px;\n  color: var(--muted);\n  font-size: 12px;\n}\n\n.time-input input,\n.weight-field input {\n  height: 36px;\n  padding: 0 8px;\n  border: 1px solid var(--line-strong);\n  border-radius: var(--radius);\n  background: var(--surface);\n  color: var(--ink);\n  font-variant-numeric: tabular-nums;\n  text-align: right;\n}\n\n.time-input input {\n  width: 96px;\n}\n\n.score-summary {\n  display: grid;\n  grid-template-columns: repeat(4, minmax(110px, 1fr)) minmax(190px, 1.25fr);\n  border-bottom: 1px solid var(--line);\n  background: #f7f9f7;\n}\n\n.summary-value,\n.weight-field {\n  min-height: 82px;\n  display: flex;\n  align-items: baseline;\n  justify-content: center;\n  gap: 5px;\n  padding: 18px 14px;\n  border-right: 1px solid var(--line);\n}\n\n.summary-value > span,\n.weight-field > span:first-child {\n  align-self: flex-start;\n  color: var(--muted);\n  font-size: 11px;\n}\n\n.summary-value strong {\n  align-self: center;\n  font-variant-numeric: tabular-nums;\n  font-size: 24px;\n}\n\n.summary-value small {\n  align-self: center;\n  color: var(--muted);\n}\n\n.summary-value.strong {\n  background: var(--brand-soft);\n  color: var(--brand-strong);\n}\n\n.weight-field {\n  border-right: 0;\n  flex-direction: column;\n  align-items: flex-start;\n  justify-content: center;\n}\n\n.weight-field > span:last-child {\n  display: flex;\n  align-items: center;\n  gap: 7px;\n  color: var(--muted);\n}\n\n.weight-field input {\n  width: 116px;\n}\n\n.paper-footer {\n  min-height: 82px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 20px;\n  padding: 16px 20px;\n}\n\n.paper-check {\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.paper-check strong {\n  font-size: 13px;\n}\n\n.paper-check span {\n  color: var(--muted);\n  font-size: 11px;\n  text-wrap: pretty;\n}\n\n.status-badge,\n.award-badge {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 24px;\n  padding: 0 8px;\n  border-radius: 999px;\n  white-space: nowrap;\n  font-size: 11px;\n  font-weight: 700;\n}\n\n.status-badge.large {\n  min-height: 30px;\n  padding: 0 11px;\n  font-size: 12px;\n}\n\n.status-unstarted {\n  background: var(--surface-muted);\n  color: var(--muted);\n}\n\n.status-in-progress {\n  background: var(--blue-soft);\n  color: var(--blue);\n}\n\n.status-needs-weight,\n.status-ready {\n  background: var(--amber-soft);\n  color: var(--amber);\n}\n\n.status-reviewed {\n  background: var(--ok-soft);\n  color: var(--ok);\n}\n\n.status-invalid {\n  background: var(--danger-soft);\n  color: var(--danger);\n}\n\n.page-section {\n  width: min(1500px, calc(100% - 40px));\n  margin: 0 auto;\n  padding: 24px 0 36px;\n}\n\n.section-header {\n  min-height: 58px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 16px;\n}\n\n.section-header > div:first-child,\n.subsection-heading {\n  min-width: 0;\n}\n\n.section-header h1 {\n  font-size: 22px;\n}\n\n.section-header > div:first-child span,\n.subsection-heading span {\n  display: block;\n  margin-top: 4px;\n  color: var(--muted);\n  font-size: 12px;\n}\n\n.segmented-control {\n  display: inline-flex;\n  overflow: hidden;\n  border: 1px solid var(--line-strong);\n  border-radius: var(--radius);\n  background: var(--surface);\n}\n\n.segmented-control button {\n  min-width: 72px;\n  height: 34px;\n  padding: 0 10px;\n  border: 0;\n  border-right: 1px solid var(--line);\n  background: transparent;\n  color: var(--muted);\n  cursor: pointer;\n}\n\n.segmented-control button:last-child {\n  border-right: 0;\n}\n\n.segmented-control button.active {\n  background: var(--brand);\n  color: #ffffff;\n}\n\n.overview-search {\n  width: 230px;\n}\n\n.data-table-wrap {\n  overflow: auto;\n  border: 1px solid var(--line);\n  border-radius: var(--radius);\n  background: var(--surface);\n}\n\n.data-table-wrap.compact {\n  max-height: 500px;\n}\n\n.data-table {\n  min-width: 1080px;\n}\n\n.data-table th,\n.data-table td {\n  min-height: 44px;\n  padding: 10px 12px;\n  border-bottom: 1px solid var(--line);\n  text-align: left;\n  vertical-align: middle;\n  font-size: 12px;\n}\n\n.data-table th {\n  position: sticky;\n  top: 0;\n  z-index: 2;\n  background: #edf3f1;\n  color: var(--ink-soft);\n  white-space: nowrap;\n}\n\n.data-table tbody tr:last-child td {\n  border-bottom: 0;\n}\n\n.data-table td strong,\n.data-table td span {\n  display: block;\n}\n\n.data-table td span:not(.status-badge):not(.award-badge) {\n  margin-top: 2px;\n  color: var(--muted);\n  font-size: 11px;\n}\n\n.clickable-row {\n  cursor: pointer;\n}\n\n.clickable-row:hover td {\n  background: #f8faf8;\n}\n\n.number-strong {\n  color: var(--brand-strong);\n  font-variant-numeric: tabular-nums;\n  font-size: 14px !important;\n  font-weight: 800;\n}\n\n.table-empty {\n  height: 120px;\n  color: var(--muted);\n  text-align: center !important;\n}\n\n.award-badge.neutral {\n  background: var(--surface-muted);\n  color: var(--muted);\n}\n\n.award-badge.first {\n  background: #fff0c7;\n  color: #7a5200;\n}\n\n.award-badge.second {\n  background: #e9eef1;\n  color: #425762;\n}\n\n.award-badge.third {\n  background: #f1e4d4;\n  color: #744518;\n}\n\n.award-badge.out {\n  background: var(--danger-soft);\n  color: var(--danger);\n}\n\n.awards-layout {\n  display: grid;\n  grid-template-columns: minmax(620px, 1.7fr) minmax(300px, 0.8fr);\n  gap: 18px;\n  margin-bottom: 18px;\n}\n\n.award-settings,\n.review-panel,\n.ranking-section {\n  border: 1px solid var(--line);\n  border-radius: var(--radius);\n  background: var(--surface);\n}\n\n.subsection-heading {\n  min-height: 58px;\n  padding: 13px 16px;\n  border-bottom: 1px solid var(--line);\n}\n\n.subsection-heading h2 {\n  font-size: 15px;\n}\n\n.award-groups {\n  padding: 0 16px;\n}\n\n.award-group {\n  min-height: 82px;\n  display: grid;\n  grid-template-columns: minmax(130px, 1.2fr) repeat(3, minmax(96px, 1fr));\n  gap: 12px;\n  align-items: end;\n  padding: 14px 0;\n  border-bottom: 1px solid var(--line);\n}\n\n.award-group:last-child {\n  border-bottom: 0;\n}\n\n.award-group > div {\n  align-self: center;\n}\n\n.award-group > div strong,\n.award-group > div span {\n  display: block;\n}\n\n.award-group > div span {\n  margin-top: 4px;\n  color: var(--muted);\n  font-size: 11px;\n}\n\n.award-group label {\n  display: grid;\n  gap: 5px;\n  color: var(--muted);\n  font-size: 11px;\n}\n\n.review-list {\n  max-height: 284px;\n  overflow: auto;\n}\n\n.review-item {\n  width: 100%;\n  min-height: 52px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  padding: 10px 14px;\n  border: 0;\n  border-bottom: 1px solid var(--line);\n  background: var(--surface);\n  color: var(--ink);\n  text-align: left;\n  cursor: pointer;\n}\n\n.review-item:hover:not(:disabled) {\n  background: var(--surface-subtle);\n}\n\n.review-item span {\n  color: var(--amber);\n  font-size: 11px;\n}\n\n.review-item.danger span {\n  color: var(--danger);\n}\n\n.all-clear {\n  min-height: 160px;\n  display: grid;\n  place-content: center;\n  gap: 5px;\n  color: var(--ok);\n  text-align: center;\n}\n\n.all-clear span {\n  color: var(--muted);\n  font-size: 12px;\n}\n\n.ranking-section {\n  overflow: hidden;\n}\n\n.danger-zone {\n  display: flex;\n  align-items: center;\n  justify-content: flex-end;\n  gap: 10px;\n  padding: 18px 0 0;\n  color: var(--muted);\n  font-size: 11px;\n}\n\n.empty-workspace {\n  min-height: calc(100vh - 107px);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 18px;\n  padding: 28px;\n}\n\n.empty-workspace h1 {\n  font-size: 21px;\n}\n\n.empty-sheet {\n  width: 180px;\n  height: 124px;\n  display: grid;\n  grid-template-columns: 1.1fr 0.9fr;\n  grid-template-rows: repeat(2, 1fr);\n  overflow: hidden;\n  border: 1px solid var(--line-strong);\n  border-radius: 3px;\n  background: var(--surface);\n  box-shadow: var(--shadow);\n  transform: rotate(-2deg);\n}\n\n.empty-sheet span {\n  border-right: 1px solid var(--line);\n  border-bottom: 1px solid var(--line);\n}\n\n.empty-sheet span:nth-child(2n) {\n  border-right: 0;\n}\n\n.empty-sheet span:nth-child(n + 3) {\n  border-bottom: 0;\n}\n\n.team-dialog {\n  width: min(640px, calc(100vw - 28px));\n  padding: 0;\n  overflow: hidden;\n  border: 1px solid var(--line-strong);\n  border-radius: 7px;\n  background: var(--surface);\n  color: var(--ink);\n  box-shadow: 0 26px 80px rgba(20, 37, 34, 0.28);\n}\n\n.team-dialog::backdrop {\n  background: rgba(20, 35, 33, 0.46);\n}\n\n.team-dialog form > header,\n.team-dialog form > footer {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 18px;\n  padding: 16px 18px;\n}\n\n.team-dialog form > header {\n  border-bottom: 1px solid var(--line);\n}\n\n.team-dialog form > header span {\n  color: var(--brand-strong);\n  font-size: 11px;\n  font-weight: 700;\n}\n\n.team-dialog form > header h2 {\n  margin-top: 3px;\n  font-size: 19px;\n}\n\n.team-dialog form > footer {\n  justify-content: flex-end;\n  border-top: 1px solid var(--line);\n  background: var(--surface-subtle);\n}\n\n.team-form-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 14px;\n  padding: 18px;\n}\n\n.team-form-grid label {\n  min-width: 0;\n  display: grid;\n  gap: 6px;\n}\n\n.team-form-grid label.wide {\n  grid-column: 1 / -1;\n}\n\n.team-form-grid label > span {\n  color: var(--muted);\n  font-size: 12px;\n  font-weight: 700;\n}\n\n.form-error {\n  min-height: 20px;\n  padding: 0 18px 12px;\n  color: var(--danger);\n  font-size: 12px;\n}\n\n.toast {\n  position: fixed;\n  right: 20px;\n  bottom: 20px;\n  z-index: 100;\n  max-width: min(420px, calc(100vw - 40px));\n  padding: 12px 15px;\n  border-radius: var(--radius);\n  background: #203532;\n  color: #ffffff;\n  box-shadow: var(--shadow);\n  font-size: 13px;\n}\n\n.boot-panel {\n  min-height: 100vh;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 10px;\n  color: var(--muted);\n}\n\n.loader {\n  width: 18px;\n  height: 18px;\n  border: 2px solid var(--line-strong);\n  border-top-color: var(--brand);\n  border-radius: 50%;\n  animation: spin 700ms linear infinite;\n}\n\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n\n@media (max-width: 1180px) {\n  .appbar {\n    grid-template-columns: 190px minmax(320px, 1fr) auto;\n    gap: 10px;\n    padding: 0 14px;\n  }\n\n  .app-actions .button-quiet {\n    display: none;\n  }\n\n  .entry-layout {\n    grid-template-columns: 260px minmax(0, 1fr);\n  }\n\n  .paper-stage {\n    padding-right: 14px;\n    padding-left: 14px;\n  }\n\n  .score-summary {\n    grid-template-columns: repeat(4, minmax(96px, 1fr));\n  }\n\n  .weight-field {\n    grid-column: 1 / -1;\n    min-height: 64px;\n    flex-direction: row;\n    align-items: center;\n    justify-content: flex-end;\n    border-top: 1px solid var(--line);\n  }\n\n  .awards-layout {\n    grid-template-columns: 1fr;\n  }\n}\n\n@media (max-width: 860px) {\n  body {\n    overflow: auto;\n  }\n\n  .app-shell {\n    height: auto;\n    overflow: visible;\n  }\n\n  .view-area {\n    overflow: visible;\n  }\n\n  .appbar {\n    position: static;\n    grid-template-columns: 1fr auto;\n    padding: 10px 12px;\n  }\n\n  .brand-block {\n    grid-column: 1;\n  }\n\n  .view-tabs {\n    grid-column: 1 / -1;\n    grid-row: 2;\n    height: 44px;\n    order: 3;\n  }\n\n  .view-tab {\n    min-width: 0;\n    flex: 1;\n    padding: 0 8px;\n  }\n\n  .app-actions {\n    grid-column: 2;\n  }\n\n  .app-actions .button-secondary,\n  .app-actions .button-quiet {\n    display: none;\n  }\n\n  .progress-strip {\n    overflow-x: auto;\n    padding: 0 12px;\n  }\n\n  .compact-metric {\n    min-width: 104px;\n    padding: 0 13px;\n  }\n\n  .save-state {\n    display: none;\n  }\n\n  .entry-layout {\n    height: auto;\n    min-height: auto;\n    grid-template-columns: 1fr;\n  }\n\n  .entry-queue {\n    height: auto;\n    max-height: 300px;\n    border-right: 0;\n    border-bottom: 1px solid var(--line);\n  }\n\n  .paper-toolbar {\n    align-items: flex-start;\n  }\n\n  .paper-stage {\n    height: auto;\n  }\n\n  .toolbar-actions {\n    flex-wrap: wrap;\n    justify-content: flex-end;\n  }\n\n  .paper-heading {\n    min-height: 96px;\n    padding: 18px;\n  }\n\n  .paper-heading h1 {\n    font-size: 19px;\n  }\n\n  .paper-footer {\n    align-items: flex-start;\n    flex-direction: column;\n  }\n\n  .paper-actions {\n    width: 100%;\n  }\n\n  .paper-actions .button {\n    flex: 1;\n  }\n\n  .page-section {\n    width: calc(100% - 24px);\n    padding-top: 14px;\n  }\n\n  .section-header {\n    align-items: stretch;\n    flex-direction: column;\n  }\n\n  .section-tools {\n    align-items: stretch;\n    flex-wrap: wrap;\n  }\n\n  .segmented-control {\n    width: 100%;\n  }\n\n  .segmented-control button {\n    min-width: 0;\n    flex: 1;\n  }\n\n  .overview-search {\n    width: 100%;\n  }\n\n  .award-group {\n    grid-template-columns: repeat(3, 1fr);\n  }\n\n  .award-group > div {\n    grid-column: 1 / -1;\n  }\n}\n\n@media (max-width: 560px) {\n  .brand-mark {\n    width: 30px;\n    height: 30px;\n    flex-basis: 30px;\n    font-size: 18px;\n  }\n\n  .brand-block div span {\n    display: none;\n  }\n\n  .button {\n    min-height: 40px;\n  }\n\n  .paper-stage {\n    padding: 10px 8px 24px;\n  }\n\n  .paper-toolbar {\n    align-items: stretch;\n    flex-direction: column;\n  }\n\n  .toolbar-actions {\n    justify-content: flex-start;\n  }\n\n  .paper-heading {\n    align-items: flex-start;\n    flex-direction: column;\n  }\n\n  .score-summary {\n    grid-template-columns: 1fr 1fr;\n  }\n\n  .summary-value:nth-child(2),\n  .summary-value:nth-child(4) {\n    border-right: 0;\n  }\n\n  .summary-value:nth-child(n + 3) {\n    border-top: 1px solid var(--line);\n  }\n\n  .weight-field {\n    grid-column: 1 / -1;\n  }\n\n  .team-form-grid {\n    grid-template-columns: 1fr;\n  }\n\n  .team-form-grid label.wide {\n    grid-column: auto;\n  }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  *,\n  *::before,\n  *::after {\n    scroll-behavior: auto !important;\n    transition-duration: 0.01ms !important;\n    animation-duration: 0.01ms !important;\n    animation-iteration-count: 1 !important;\n  }\n}\n","app.js":"import {\n  GROUPS,\n  ROAD_TASKS,\n  allowedScoresForTask,\n  buildGroupResults,\n  calculateTeam,\n  createManualEntry,\n  emptyRound,\n  getEntryWorkflowStatus,\n  mergeRosterEntries,\n  normalizeText,\n  reconcileAwardCounts,\n  suggestAwardCounts,\n  validateManualTeam,\n} from \"/shared/core.js\";\n\nconst storageKey = \"road-engineering-score-tool:v1\";\nconst app = document.querySelector(\"#app\");\nconst state = hydrateState(loadState());\nstate.awardCountsByGroup = reconcileAwardCounts(state.entries, state.awardCountsByGroup, state.awardManualGroups);\nlet teamDialogContext = { mode: \"create\", entryId: null };\nlet scoreRenderTimer = null;\n\nrender();\n\nfunction render(options = {}) {\n  ensureActiveEntry();\n  const model = buildViewModel();\n  app.innerHTML = `\n    <div class=\"app-shell\">\n      ${appHeader(model)}\n      ${progressStrip(model)}\n      <main class=\"view-area\">\n        ${state.view === \"overview\"\n          ? overviewView(model)\n          : state.view === \"awards\"\n            ? awardsView(model)\n            : paperEntryView(model)}\n      </main>\n      ${teamDialog()}\n    </div>\n  `;\n  bindEvents();\n  restoreFocus(options);\n}\n\nfunction buildViewModel() {\n  const statuses = new Map(state.entries.map((entry) => [entry.id, getEntryWorkflowStatus(entry)]));\n  const calculated = state.entries.map(calculateTeam);\n  const groups = buildGroupResults(state.entries, state.awardCountsByGroup);\n  const reviewedCount = state.entries.filter((entry) => statuses.get(entry.id)?.key === \"reviewed\").length;\n  const paperCompleteCount = state.entries.filter((entry) => calculateTeam(entry).complete).length;\n  const unresolvedEntries = state.entries.filter((entry) => ![\"ready\", \"reviewed\"].includes(statuses.get(entry.id)?.key));\n\n  return {\n    statuses,\n    calculated,\n    groups,\n    reviewedCount,\n    paperCompleteCount,\n    unresolvedEntries,\n    activeEntry: state.entries.find((entry) => entry.id === state.activeEntryId) ?? null,\n  };\n}\n\nfunction appHeader(model) {\n  return `\n    <header class=\"appbar\">\n      <div class=\"brand-block\">\n        <span class=\"brand-mark\" aria-hidden=\"true\">路</span>\n        <div>\n          <strong>道路工程</strong>\n          <span>成绩统计</span>\n        </div>\n      </div>\n      <nav class=\"view-tabs\" aria-label=\"工作区\">\n        ${viewTab(\"entry\", \"纸单录入\")}\n        ${viewTab(\"overview\", \"成绩总览\")}\n        ${viewTab(\"awards\", \"奖项与导出\")}\n      </nav>\n      <div class=\"app-actions\">\n        <button class=\"button button-primary\" data-action=\"open-create\" type=\"button\">手工建队</button>\n        <label class=\"button button-secondary ${state.busy ? \"is-disabled\" : \"\"}\">\n          导入 Excel\n          <input id=\"rosterInput\" class=\"visually-hidden\" type=\"file\" accept=\".xlsx,.xls\" ${state.busy ? \"disabled\" : \"\"}>\n        </label>\n        <a class=\"button button-quiet\" href=\"/api/template\">名单模板</a>\n      </div>\n    </header>\n  `;\n}\n\nfunction viewTab(key, label) {\n  return `<button class=\"view-tab ${state.view === key ? \"active\" : \"\"}\" data-view=\"${key}\" type=\"button\">${label}</button>`;\n}\n\nfunction progressStrip(model) {\n  const pending = Math.max(0, state.entries.length - model.reviewedCount);\n  return `\n    <section class=\"progress-strip\" aria-label=\"录入进度\">\n      ${compactMetric(\"队伍\", state.entries.length)}\n      ${compactMetric(\"纸单完整\", model.paperCompleteCount)}\n      ${compactMetric(\"已复核\", model.reviewedCount)}\n      ${compactMetric(\"待处理\", pending, pending ? \"warn\" : \"ok\")}\n      <span class=\"save-state\">本机自动保存</span>\n    </section>\n  `;\n}\n\nfunction compactMetric(label, value, tone = \"\") {\n  return `<div class=\"compact-metric ${tone}\"><span>${label}</span><strong>${value}</strong></div>`;\n}\n\nfunction paperEntryView(model) {\n  if (!state.entries.length) {\n    return `\n      <section class=\"empty-workspace\">\n        <div class=\"empty-sheet\" aria-hidden=\"true\">\n          <span></span><span></span><span></span><span></span>\n        </div>\n        <h1>暂无队伍</h1>\n        <div class=\"empty-actions\">\n          <button class=\"button button-primary\" data-action=\"open-create\" type=\"button\">手工建队</button>\n          <label class=\"button button-secondary\">\n            导入 Excel\n            <input class=\"visually-hidden\" data-roster-input type=\"file\" accept=\".xlsx,.xls\">\n          </label>\n        </div>\n      </section>\n    `;\n  }\n\n  return `\n    <div class=\"entry-layout\">\n      ${entryQueue(model)}\n      ${paperEditor(model.activeEntry, model)}\n    </div>\n  `;\n}\n\nfunction entryQueue(model) {\n  const filtered = state.entries.filter((entry) => {\n    const status = model.statuses.get(entry.id);\n    const haystack = `${entry.number ?? \"\"}${entry.teamName}${entry.school ?? \"\"}${entry.studentA ?? \"\"}${entry.studentB ?? \"\"}`;\n    return (state.queueGroup === \"全部\" || entry.group === state.queueGroup)\n      && (state.queueStatus === \"全部\" || status?.key === state.queueStatus)\n      && haystack.toLocaleLowerCase().includes(state.query.toLocaleLowerCase());\n  });\n\n  return `\n    <aside class=\"entry-queue\">\n      <div class=\"queue-header\">\n        <div>\n          <h2>纸单队列</h2>\n          <span>${filtered.length} / ${state.entries.length}</span>\n        </div>\n        <button class=\"icon-button\" data-action=\"open-create\" type=\"button\" title=\"手工建队\" aria-label=\"手工建队\">+</button>\n      </div>\n      <div class=\"queue-filters\">\n        <input id=\"queueSearch\" class=\"text-input\" value=\"${escapeAttr(state.query)}\" placeholder=\"队伍 / 编号 / 学校\">\n        <div class=\"filter-row\">\n          <select id=\"queueGroup\" class=\"select-input\" aria-label=\"筛选组别\">\n            ${[\"全部\", ...GROUPS].map((group) => `<option value=\"${group}\" ${state.queueGroup === group ? \"selected\" : \"\"}>${group}</option>`).join(\"\")}\n          </select>\n          <select id=\"queueStatus\" class=\"select-input\" aria-label=\"筛选状态\">\n            ${statusFilterOptions()}\n          </select>\n        </div>\n      </div>\n      <div class=\"queue-list\">\n        ${filtered.length ? filtered.map((entry) => queueItem(entry, model)).join(\"\") : `<div class=\"queue-empty\">没有匹配的队伍</div>`}\n      </div>\n    </aside>\n  `;\n}\n\nfunction statusFilterOptions() {\n  const options = [\n    [\"全部\", \"全部状态\"],\n    [\"unstarted\", \"未录入\"],\n    [\"in-progress\", \"录入中\"],\n    [\"needs-weight\", \"待补重量\"],\n    [\"ready\", \"待复核\"],\n    [\"reviewed\", \"已确认\"],\n    [\"invalid\", \"有问题\"],\n  ];\n  return options.map(([value, label]) => `<option value=\"${value}\" ${state.queueStatus === value ? \"selected\" : \"\"}>${label}</option>`).join(\"\");\n}\n\nfunction queueItem(entry, model) {\n  const status = model.statuses.get(entry.id);\n  const calculated = calculateTeam(entry);\n  return `\n    <button class=\"queue-item ${entry.id === state.activeEntryId ? \"active\" : \"\"}\" data-entry-id=\"${escapeAttr(entry.id)}\" type=\"button\">\n      <span class=\"queue-item-main\">\n        <span class=\"queue-number\">${escapeHtml(entry.number || entry.group)}</span>\n        <strong>${escapeHtml(entry.teamName)}</strong>\n        <small>${escapeHtml(entry.school || \"资料待补\")}</small>\n      </span>\n      <span class=\"queue-item-side\">\n        ${statusBadge(status)}\n        <b>${calculated.complete ? calculated.totalScore : \"--\"}</b>\n      </span>\n    </button>\n  `;\n}\n\nfunction paperEditor(entry, model) {\n  if (!entry) {\n    return `<section class=\"paper-stage\"><div class=\"queue-empty\">请选择队伍</div></section>`;\n  }\n  const status = model.statuses.get(entry.id);\n  const calculated = calculateTeam(entry);\n  const index = state.entries.findIndex((candidate) => candidate.id === entry.id);\n  const isFirst = index <= 0;\n  const isLast = index >= state.entries.length - 1;\n  const reviewDisabled = ![\"ready\", \"reviewed\"].includes(status.key);\n\n  return `\n    <section class=\"paper-stage\">\n      <div class=\"paper-toolbar\">\n        <span>第 ${index + 1} 张 / 共 ${state.entries.length} 张</span>\n        <div class=\"toolbar-actions\">\n          <button class=\"icon-button\" data-action=\"previous-entry\" type=\"button\" title=\"上一张纸单\" aria-label=\"上一张纸单\" ${isFirst ? \"disabled\" : \"\"}>←</button>\n          <button class=\"icon-button\" data-action=\"next-entry\" type=\"button\" title=\"下一张纸单\" aria-label=\"下一张纸单\" ${isLast ? \"disabled\" : \"\"}>→</button>\n          <button class=\"button button-quiet button-small\" data-action=\"open-edit\" type=\"button\">编辑队伍</button>\n          <button class=\"button button-danger-quiet button-small\" data-action=\"delete-entry\" type=\"button\">删除</button>\n        </div>\n      </div>\n      <article class=\"paper-sheet\">\n        <header class=\"paper-heading\">\n          <div>\n            <p>道路工程记分表</p>\n            <h1>${escapeHtml(entry.teamName)}</h1>\n            <span>${escapeHtml([entry.group, entry.number, entry.school].filter(Boolean).join(\" · \"))}</span>\n          </div>\n          ${statusBadge(status, true)}\n        </header>\n        <div class=\"score-table-wrap\">\n          <table class=\"paper-score-table\">\n            <thead>\n              <tr>\n                <th>任务事项</th>\n                <th>允许分值</th>\n                <th>第一轮得分</th>\n                <th>第二轮得分</th>\n              </tr>\n            </thead>\n            <tbody>\n              ${ROAD_TASKS.map((task) => paperTaskRow(entry, task)).join(\"\")}\n              ${timeRow(entry)}\n            </tbody>\n          </table>\n        </div>\n        <section class=\"score-summary\">\n          ${summaryValue(\"第一轮\", calculated.complete || status.filled ? calculated.roundTotals[0] : \"--\", \"分\")}\n          ${summaryValue(\"第二轮\", calculated.complete || status.filled ? calculated.roundTotals[1] : \"--\", \"分\")}\n          ${summaryValue(\"总成绩\", calculated.complete ? calculated.totalScore : \"--\", \"分\", \"strong\")}\n          ${summaryValue(\"总用时\", calculated.complete ? calculated.totalSeconds : \"--\", \"秒\")}\n          <label class=\"weight-field\">\n            <span>机器人重量</span>\n            <span><input id=\"robotWeight\" data-score-field data-field=\"robotWeight\" type=\"number\" min=\"0.01\" step=\"0.01\" value=\"${escapeAttr(entry.robotWeight)}\"> kg</span>\n          </label>\n        </section>\n        <footer class=\"paper-footer\">\n          <div class=\"paper-check\">${paperCheckMessage(status)}</div>\n          <div class=\"paper-actions\">\n            <button class=\"button ${status.key === \"reviewed\" ? \"button-secondary\" : \"button-primary\"}\" data-action=\"toggle-review\" type=\"button\" ${reviewDisabled ? \"disabled\" : \"\"}>\n              ${status.key === \"reviewed\" ? \"取消复核\" : \"标记已复核\"}\n            </button>\n            <button class=\"button button-secondary\" data-action=\"next-entry\" type=\"button\" ${isLast ? \"disabled\" : \"\"}>下一张纸单</button>\n          </div>\n        </footer>\n      </article>\n    </section>\n  `;\n}\n\nfunction paperTaskRow(entry, task) {\n  const allowedScores = allowedScoresForTask(task, entry.group);\n  return `\n    <tr>\n      <td class=\"task-name\"><strong>${escapeHtml(task.name)}</strong></td>\n      <td class=\"allowed-scores\">${allowedScores.filter((score) => score > 0).join(\" / \")}</td>\n      <td>${scoreOptions(entry, 0, task)}</td>\n      <td>${scoreOptions(entry, 1, task)}</td>\n    </tr>\n  `;\n}\n\nfunction scoreOptions(entry, roundIndex, task) {\n  const allowedScores = allowedScoresForTask(task, entry.group);\n  const raw = entry.rounds?.[roundIndex]?.scores?.[task.key] ?? \"\";\n  const current = raw === 0 || raw === \"0\" ? \"/\" : String(raw);\n  const choices = [\n    { value: \"\", label: \"×\", title: \"清空该项\" },\n    { value: \"/\", label: \"/\", title: \"无得分\" },\n    ...allowedScores.filter((score) => score > 0).map((score) => ({ value: String(score), label: String(score), title: `${score}分` })),\n  ];\n  const name = `score-${entry.id}-${roundIndex}-${task.key}`;\n  return `\n    <div class=\"score-options\">\n      ${choices.map((choice, choiceIndex) => {\n        const id = `${safeId(name)}-${choiceIndex}`;\n        return `\n          <span class=\"score-choice ${choice.value === \"\" ? \"clear-choice\" : \"\"}\">\n            <input class=\"visually-hidden\" id=\"${id}\" name=\"${escapeAttr(name)}\" data-score-radio data-entry=\"${escapeAttr(entry.id)}\" data-round=\"${roundIndex}\" data-task=\"${task.key}\" type=\"radio\" value=\"${escapeAttr(choice.value)}\" ${current === choice.value ? \"checked\" : \"\"}>\n            <label for=\"${id}\" title=\"${choice.title}\">${choice.label}</label>\n          </span>\n        `;\n      }).join(\"\")}\n    </div>\n  `;\n}\n\nfunction timeRow(entry) {\n  return `\n    <tr class=\"time-row\">\n      <td class=\"task-name\"><strong>比赛用时</strong></td>\n      <td class=\"allowed-scores\">0 - 180 秒</td>\n      ${[0, 1].map((roundIndex) => `\n        <td>\n          <label class=\"time-input\">\n            <input id=\"round-${roundIndex}-seconds\" data-score-field data-round=\"${roundIndex}\" data-field=\"seconds\" type=\"number\" min=\"0\" max=\"180\" step=\"1\" value=\"${escapeAttr(entry.rounds[roundIndex].seconds)}\">\n            <span>秒</span>\n          </label>\n        </td>\n      `).join(\"\")}\n    </tr>\n  `;\n}\n\nfunction summaryValue(label, value, unit, className = \"\") {\n  return `<div class=\"summary-value ${className}\"><span>${label}</span><strong>${value}</strong><small>${unit}</small></div>`;\n}\n\nfunction paperCheckMessage(status) {\n  if (status.key === \"reviewed\") {\n    return `<strong>复核完成</strong><span>修改任一成绩后将自动撤销复核状态</span>`;\n  }\n  if (status.key === \"ready\") {\n    return `<strong>纸单完整</strong><span>等待复核确认</span>`;\n  }\n  if (status.key === \"needs-weight\") {\n    return `<strong>成绩已录完</strong><span>待补机器人重量</span>`;\n  }\n  if (status.key === \"invalid\") {\n    const issue = status.issues.find((item) => item.type.startsWith(\"invalid\"));\n    return `<strong>存在异常值</strong><span>${escapeHtml(issue?.message ?? \"请检查录入内容\")}</span>`;\n  }\n  const remaining = Math.max(0, status.total - status.filled);\n  return `<strong>${status.label}</strong><span>${remaining ? `还差 ${remaining} 项` : \"\"}</span>`;\n}\n\nfunction overviewView(model) {\n  const rows = GROUPS.flatMap((group) => model.groups[group].teams.map((team) => ({ ...team, group })))\n    .filter((team) => state.overviewGroup === \"全部\" || team.group === state.overviewGroup)\n    .filter((team) => `${team.number ?? \"\"}${team.teamName}${team.school ?? \"\"}`.toLocaleLowerCase().includes(state.overviewQuery.toLocaleLowerCase()));\n\n  return `\n    <section class=\"page-section\">\n      <header class=\"section-header\">\n        <div>\n          <h1>成绩总览</h1>\n          <span>${rows.length} 支队伍</span>\n        </div>\n        <div class=\"section-tools\">\n          <div class=\"segmented-control\">\n            ${[\"全部\", ...GROUPS].map((group) => `<button class=\"${state.overviewGroup === group ? \"active\" : \"\"}\" data-overview-group=\"${group}\" type=\"button\">${group}</button>`).join(\"\")}\n          </div>\n          <input id=\"overviewSearch\" class=\"text-input overview-search\" value=\"${escapeAttr(state.overviewQuery)}\" placeholder=\"搜索队伍 / 学校\">\n        </div>\n      </header>\n      <div class=\"data-table-wrap\">\n        <table class=\"data-table\">\n          <thead>\n            <tr>\n              <th>组别</th><th>编号</th><th>队伍</th><th>录入状态</th><th>第一轮</th><th>第二轮</th><th>总成绩</th><th>总用时</th><th>重量</th><th>排名</th><th>奖项</th>\n            </tr>\n          </thead>\n          <tbody>\n            ${rows.length ? rows.map((team) => overviewRow(team, model)).join(\"\") : `<tr><td colspan=\"11\" class=\"table-empty\">暂无数据</td></tr>`}\n          </tbody>\n        </table>\n      </div>\n    </section>\n  `;\n}\n\nfunction overviewRow(team, model) {\n  const status = model.statuses.get(team.id) ?? getEntryWorkflowStatus(team);\n  return `\n    <tr class=\"clickable-row\" data-open-entry=\"${escapeAttr(team.id)}\">\n      <td>${escapeHtml(team.group)}</td>\n      <td>${escapeHtml(team.number || \"--\")}</td>\n      <td><strong>${escapeHtml(team.teamName)}</strong><span>${escapeHtml(team.school || \"\")}</span></td>\n      <td>${statusBadge(status)}</td>\n      <td>${team.complete ? team.roundTotals[0] : \"--\"}</td>\n      <td>${team.complete ? team.roundTotals[1] : \"--\"}</td>\n      <td class=\"number-strong\">${team.complete ? team.totalScore : \"--\"}</td>\n      <td>${team.complete ? `${team.totalSeconds} 秒` : \"--\"}</td>\n      <td>${team.robotWeight || \"--\"}</td>\n      <td>${team.rank ?? \"--\"}</td>\n      <td>${awardBadge(team.complete ? team.award : \"\")}</td>\n    </tr>\n  `;\n}\n\nfunction awardsView(model) {\n  const rankedRows = GROUPS.flatMap((group) => model.groups[group].teams.map((team) => ({ ...team, group })))\n    .filter((team) => team.complete);\n  const workflowIssues = state.entries\n    .map((entry) => ({ entry, status: model.statuses.get(entry.id) }))\n    .filter(({ status }) => status?.key !== \"reviewed\");\n\n  return `\n    <section class=\"page-section awards-page\">\n      <header class=\"section-header\">\n        <div>\n          <h1>奖项与导出</h1>\n          <span>${rankedRows.length} 支队伍进入排名</span>\n        </div>\n        <div class=\"section-tools\">\n          <button class=\"button button-secondary\" data-action=\"reset-awards\" type=\"button\">重算名额</button>\n          <button class=\"button button-primary\" data-action=\"export\" type=\"button\" ${state.entries.length && !state.busy ? \"\" : \"disabled\"}>${state.busy ? \"正在生成...\" : \"导出成绩包\"}</button>\n        </div>\n      </header>\n      <div class=\"awards-layout\">\n        <section class=\"award-settings\">\n          <div class=\"subsection-heading\">\n            <h2>奖项名额</h2>\n            <span>可手动调整</span>\n          </div>\n          <div class=\"award-groups\">\n            ${GROUPS.map((group) => awardGroup(group, model.groups[group])).join(\"\")}\n          </div>\n        </section>\n        <section class=\"review-panel\">\n          <div class=\"subsection-heading\">\n            <h2>导出前检查</h2>\n            <span>${workflowIssues.length + state.issues.length} 项待处理</span>\n          </div>\n          ${workflowIssueList(workflowIssues, state.issues)}\n        </section>\n      </div>\n      <section class=\"ranking-section\">\n        <div class=\"subsection-heading\">\n          <h2>排名预览</h2>\n          <span>总分、总用时、机器人重量</span>\n        </div>\n        <div class=\"data-table-wrap compact\">\n          <table class=\"data-table\">\n            <thead><tr><th>组别</th><th>排名</th><th>奖项</th><th>队伍</th><th>第一轮</th><th>第二轮</th><th>总成绩</th><th>总用时</th><th>重量</th></tr></thead>\n            <tbody>\n              ${rankedRows.length ? rankedRows.map((team) => `\n                <tr>\n                  <td>${escapeHtml(team.group)}</td><td>${team.rank ?? \"--\"}</td><td>${awardBadge(team.award)}</td>\n                  <td><strong>${escapeHtml(team.teamName)}</strong><span>${escapeHtml(team.school || \"\")}</span></td>\n                  <td>${team.roundTotals[0]}</td><td>${team.roundTotals[1]}</td><td class=\"number-strong\">${team.totalScore}</td>\n                  <td>${team.totalSeconds} 秒</td><td>${team.robotWeight || \"--\"}</td>\n                </tr>\n              `).join(\"\") : `<tr><td colspan=\"9\" class=\"table-empty\">暂无完整成绩</td></tr>`}\n            </tbody>\n          </table>\n        </div>\n      </section>\n      <footer class=\"danger-zone\">\n        <span>本机数据</span>\n        <button class=\"button button-danger-quiet button-small\" data-action=\"clear-all\" type=\"button\">清空全部</button>\n      </footer>\n    </section>\n  `;\n}\n\nfunction awardGroup(group, result) {\n  const active = result.teams.filter((team) => team.complete && !team.eliminated).length;\n  const counts = state.awardCountsByGroup[group] ?? result.awardCounts ?? suggestAwardCounts(active);\n  return `\n    <div class=\"award-group\">\n      <div><strong>${group}</strong><span>${active} 支有效队伍</span></div>\n      <label>一等奖<input data-award-group=\"${group}\" data-award-key=\"first\" type=\"number\" min=\"0\" max=\"${active}\" value=\"${counts.first ?? 0}\"></label>\n      <label>二等奖<input data-award-group=\"${group}\" data-award-key=\"second\" type=\"number\" min=\"0\" max=\"${active}\" value=\"${counts.second ?? 0}\"></label>\n      <label>三等奖<input data-award-group=\"${group}\" data-award-key=\"third\" type=\"number\" min=\"0\" max=\"${active}\" value=\"${counts.third ?? 0}\"></label>\n    </div>\n  `;\n}\n\nfunction workflowIssueList(workflowIssues, importIssues) {\n  const items = [\n    ...workflowIssues.map(({ entry, status }) => ({\n      entryId: entry.id,\n      title: entry.teamName,\n      message: status?.key === \"ready\" ? \"待复核\" : status?.label ?? \"待处理\",\n      tone: status?.key === \"ready\" ? \"warn\" : \"danger\",\n    })),\n    ...importIssues.map((issue) => ({ title: \"名单导入\", message: issue.message, tone: \"danger\" })),\n  ];\n  if (!items.length) {\n    return `<div class=\"all-clear\"><strong>检查完成</strong><span>所有纸单均已复核</span></div>`;\n  }\n  return `<div class=\"review-list\">${items.slice(0, 80).map((item) => `\n    <button class=\"review-item ${item.tone}\" ${item.entryId ? `data-open-entry=\"${escapeAttr(item.entryId)}\"` : \"disabled\"} type=\"button\">\n      <strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.message)}</span>\n    </button>\n  `).join(\"\")}</div>`;\n}\n\nfunction teamDialog() {\n  return `\n    <dialog id=\"teamDialog\" class=\"team-dialog\">\n      <form id=\"teamForm\">\n        <header>\n          <div><span id=\"teamDialogEyebrow\">纸质成绩单</span><h2 id=\"teamDialogTitle\">手工建队</h2></div>\n          <button class=\"icon-button\" data-action=\"close-dialog\" type=\"button\" aria-label=\"关闭\" title=\"关闭\">×</button>\n        </header>\n        <div class=\"team-form-grid\">\n          <label><span>组别 *</span><select name=\"group\" required>${GROUPS.map((group) => `<option value=\"${group}\">${group}</option>`).join(\"\")}</select></label>\n          <label><span>队伍编号</span><input name=\"number\" autocomplete=\"off\"></label>\n          <label class=\"wide\"><span>队伍名称 *</span><input name=\"teamName\" required autocomplete=\"off\"></label>\n          <label class=\"wide\"><span>学校</span><input name=\"school\" autocomplete=\"off\"></label>\n          <label><span>选手 A</span><input name=\"studentA\" autocomplete=\"off\"></label>\n          <label><span>选手 B</span><input name=\"studentB\" autocomplete=\"off\"></label>\n          <label class=\"wide\"><span>指导教师</span><input name=\"coach\" autocomplete=\"off\"></label>\n          <label class=\"wide\"><span>备注</span><input name=\"note\" autocomplete=\"off\"></label>\n        </div>\n        <div id=\"teamFormError\" class=\"form-error\" role=\"alert\"></div>\n        <footer>\n          <button class=\"button button-secondary\" data-action=\"close-dialog\" type=\"button\">取消</button>\n          <button class=\"button button-primary\" type=\"submit\">保存队伍</button>\n        </footer>\n      </form>\n    </dialog>\n  `;\n}\n\nfunction bindEvents() {\n  document.querySelectorAll(\"[data-view]\").forEach((button) => button.addEventListener(\"click\", () => {\n    state.view = button.dataset.view;\n    saveAndRender();\n  }));\n  document.querySelectorAll(\"[data-action='open-create']\").forEach((button) => button.addEventListener(\"click\", () => openTeamDialog(\"create\")));\n  document.querySelector(\"[data-action='open-edit']\")?.addEventListener(\"click\", () => openTeamDialog(\"edit\", state.activeEntryId));\n  document.querySelectorAll(\"[data-action='close-dialog']\").forEach((button) => button.addEventListener(\"click\", closeTeamDialog));\n  document.querySelector(\"#teamForm\")?.addEventListener(\"submit\", submitTeamForm);\n\n  document.querySelector(\"#rosterInput\")?.addEventListener(\"change\", importRoster);\n  document.querySelectorAll(\"[data-roster-input]\").forEach((input) => input.addEventListener(\"change\", importRoster));\n  document.querySelector(\"#queueSearch\")?.addEventListener(\"input\", updateQueueSearch);\n  document.querySelector(\"#queueGroup\")?.addEventListener(\"change\", (event) => {\n    state.queueGroup = event.target.value;\n    saveAndRender();\n  });\n  document.querySelector(\"#queueStatus\")?.addEventListener(\"change\", (event) => {\n    state.queueStatus = event.target.value;\n    saveAndRender();\n  });\n  document.querySelectorAll(\"[data-entry-id]\").forEach((button) => button.addEventListener(\"click\", () => {\n    state.activeEntryId = button.dataset.entryId;\n    saveAndRender();\n  }));\n\n  document.querySelectorAll(\"[data-score-radio]\").forEach((control) => control.addEventListener(\"change\", updateScoreRadio));\n  document.querySelectorAll(\"[data-score-field]\").forEach((control) => {\n    control.addEventListener(\"input\", stageScoreField);\n    control.addEventListener(\"change\", updateScoreField);\n  });\n  document.querySelectorAll(\"[data-action='previous-entry']\").forEach((button) => button.addEventListener(\"click\", () => navigateEntry(-1)));\n  document.querySelectorAll(\"[data-action='next-entry']\").forEach((button) => button.addEventListener(\"click\", () => navigateEntry(1)));\n  document.querySelector(\"[data-action='toggle-review']\")?.addEventListener(\"click\", toggleReview);\n  document.querySelector(\"[data-action='delete-entry']\")?.addEventListener(\"click\", deleteEntry);\n\n  document.querySelectorAll(\"[data-overview-group]\").forEach((button) => button.addEventListener(\"click\", () => {\n    state.overviewGroup = button.dataset.overviewGroup;\n    saveAndRender();\n  }));\n  document.querySelector(\"#overviewSearch\")?.addEventListener(\"input\", updateOverviewSearch);\n  document.querySelectorAll(\"[data-open-entry]\").forEach((element) => element.addEventListener(\"click\", () => {\n    state.activeEntryId = element.dataset.openEntry;\n    state.view = \"entry\";\n    saveAndRender();\n  }));\n\n  document.querySelectorAll(\"[data-award-group]\").forEach((control) => control.addEventListener(\"input\", updateAwardCount));\n  document.querySelector(\"[data-action='reset-awards']\")?.addEventListener(\"click\", () => resetAwardCounts(true));\n  document.querySelector(\"[data-action='export']\")?.addEventListener(\"click\", exportWorkbook);\n  document.querySelector(\"[data-action='clear-all']\")?.addEventListener(\"click\", clearAll);\n}\n\nfunction openTeamDialog(mode, entryId = null) {\n  const dialog = document.querySelector(\"#teamDialog\");\n  const form = document.querySelector(\"#teamForm\");\n  if (!dialog || !form) {\n    return;\n  }\n  teamDialogContext = { mode, entryId };\n  const entry = mode === \"edit\" ? state.entries.find((candidate) => candidate.id === entryId) : null;\n  form.reset();\n  form.elements.group.value = entry?.group ?? (GROUPS.includes(state.queueGroup) ? state.queueGroup : GROUPS[0]);\n  for (const field of [\"number\", \"teamName\", \"school\", \"studentA\", \"studentB\", \"coach\", \"note\"]) {\n    form.elements[field].value = entry?.[field] ?? \"\";\n  }\n  document.querySelector(\"#teamDialogTitle\").textContent = mode === \"edit\" ? \"编辑队伍\" : \"手工建队\";\n  document.querySelector(\"#teamFormError\").textContent = \"\";\n  dialog.showModal();\n  window.setTimeout(() => form.elements.teamName.focus(), 0);\n}\n\nfunction closeTeamDialog() {\n  document.querySelector(\"#teamDialog\")?.close();\n}\n\nfunction submitTeamForm(event) {\n  event.preventDefault();\n  const form = event.currentTarget;\n  const fields = Object.fromEntries(new FormData(form).entries());\n  const others = state.entries.filter((entry) => entry.id !== teamDialogContext.entryId);\n  const issues = validateManualTeam(fields, others);\n  if (issues.length) {\n    document.querySelector(\"#teamFormError\").textContent = issues[0].message;\n    form.elements[issues[0].field]?.focus();\n    return;\n  }\n\n  if (teamDialogContext.mode === \"edit\") {\n    const entry = state.entries.find((candidate) => candidate.id === teamDialogContext.entryId);\n    if (entry) {\n      for (const field of [\"group\", \"number\", \"teamName\", \"school\", \"studentA\", \"studentB\", \"coach\", \"note\"]) {\n        entry[field] = normalizeText(fields[field]);\n      }\n      entry.reviewed = false;\n    }\n  } else {\n    const entry = createManualEntry(fields, state.entries.length);\n    state.entries.push(entry);\n    state.activeEntryId = entry.id;\n  }\n\n  state.view = \"entry\";\n  closeTeamDialog();\n  syncAwardCounts();\n  saveAndRender();\n}\n\nasync function importRoster(event) {\n  const file = event.target.files?.[0];\n  if (!file) {\n    return;\n  }\n  state.busy = true;\n  render();\n  try {\n    const base64 = await fileToBase64(file);\n    const response = await fetch(\"/api/roster\", {\n      method: \"POST\",\n      headers: { \"content-type\": \"application/json\" },\n      body: JSON.stringify({ filename: file.name, base64 }),\n    });\n    const data = await response.json();\n    if (!response.ok) {\n      throw new Error(data.error || \"名单导入失败\");\n    }\n    const merged = mergeRosterEntries(state.entries, data.validRows);\n    state.entries = merged.entries;\n    state.issues = [\n      ...data.missingColumns.map((column) => ({ message: `缺少列：${column}` })),\n      ...data.issues,\n    ];\n    state.activeEntryId ??= state.entries[0]?.id ?? null;\n    state.view = \"entry\";\n    syncAwardCounts();\n    toast(`新增 ${data.validRows.length - merged.duplicates} 支队伍，合并 ${merged.duplicates} 支重复队伍`);\n  } catch (error) {\n    toast(error.message);\n  } finally {\n    state.busy = false;\n    saveAndRender();\n  }\n}\n\nfunction updateQueueSearch(event) {\n  state.query = event.target.value;\n  saveAndRender({ focusId: \"queueSearch\", cursorToEnd: true });\n}\n\nfunction updateOverviewSearch(event) {\n  state.overviewQuery = event.target.value;\n  saveAndRender({ focusId: \"overviewSearch\", cursorToEnd: true });\n}\n\nfunction updateScoreRadio(event) {\n  const control = event.currentTarget;\n  const entry = state.entries.find((candidate) => candidate.id === control.dataset.entry);\n  if (!entry) {\n    return;\n  }\n  const value = control.value;\n  entry.rounds[Number(control.dataset.round)].scores[control.dataset.task] = value === \"\" || value === \"/\" ? value : Number(value);\n  entry.reviewed = false;\n  syncAwardCounts();\n  saveAndRender({ focusId: control.id });\n}\n\nfunction updateScoreField(event) {\n  const control = event.currentTarget;\n  window.clearTimeout(scoreRenderTimer);\n  scoreRenderTimer = null;\n  applyScoreField(control);\n  saveAndRender({ focusId: control.id });\n}\n\nfunction stageScoreField(event) {\n  const control = event.currentTarget;\n  applyScoreField(control);\n  saveState();\n  window.clearTimeout(scoreRenderTimer);\n  scoreRenderTimer = window.setTimeout(() => {\n    scoreRenderTimer = null;\n    render({ focusId: control.id, cursorToEnd: true });\n  }, 180);\n}\n\nfunction applyScoreField(control) {\n  const entry = state.entries.find((candidate) => candidate.id === state.activeEntryId);\n  if (!entry) {\n    return;\n  }\n  if (control.dataset.field === \"robotWeight\") {\n    entry.robotWeight = control.value;\n  } else if (control.dataset.field === \"seconds\") {\n    entry.rounds[Number(control.dataset.round)].seconds = control.value;\n  }\n  entry.reviewed = false;\n  syncAwardCounts();\n}\n\nfunction navigateEntry(offset) {\n  const index = state.entries.findIndex((entry) => entry.id === state.activeEntryId);\n  const next = state.entries[index + offset];\n  if (next) {\n    state.activeEntryId = next.id;\n    saveAndRender();\n  }\n}\n\nfunction toggleReview() {\n  const entry = state.entries.find((candidate) => candidate.id === state.activeEntryId);\n  if (!entry) {\n    return;\n  }\n  const status = getEntryWorkflowStatus(entry);\n  if (status.key === \"reviewed\") {\n    entry.reviewed = false;\n  } else if (status.key === \"ready\") {\n    entry.reviewed = true;\n  }\n  saveAndRender();\n}\n\nfunction deleteEntry() {\n  const entry = state.entries.find((candidate) => candidate.id === state.activeEntryId);\n  if (!entry || !window.confirm(`确定删除“${entry.teamName}”及其全部成绩吗？`)) {\n    return;\n  }\n  const index = state.entries.indexOf(entry);\n  state.entries.splice(index, 1);\n  state.activeEntryId = state.entries[index]?.id ?? state.entries[index - 1]?.id ?? null;\n  syncAwardCounts();\n  saveAndRender();\n}\n\nfunction updateAwardCount(event) {\n  const control = event.currentTarget;\n  const group = control.dataset.awardGroup;\n  const key = control.dataset.awardKey;\n  state.awardCountsByGroup[group] ??= suggestAwardCounts(0);\n  state.awardCountsByGroup[group][key] = Math.max(0, Number(control.value) || 0);\n  state.awardManualGroups[group] = true;\n  saveState();\n}\n\nfunction resetAwardCounts(shouldRender = true) {\n  state.awardManualGroups = {};\n  state.awardCountsByGroup = reconcileAwardCounts(state.entries, {}, {});\n  if (shouldRender) {\n    saveAndRender();\n  }\n}\n\nfunction syncAwardCounts() {\n  state.awardCountsByGroup = reconcileAwardCounts(state.entries, state.awardCountsByGroup, state.awardManualGroups);\n}\n\nasync function exportWorkbook() {\n  if (!state.entries.length) {\n    toast(\"暂无可导出的队伍\");\n    return;\n  }\n  const unresolved = state.entries.filter((entry) => getEntryWorkflowStatus(entry).key !== \"reviewed\");\n  if (unresolved.length && !window.confirm(`仍有 ${unresolved.length} 支队伍未完成复核，继续导出草稿吗？`)) {\n    return;\n  }\n  state.busy = true;\n  render();\n  try {\n    const response = await fetch(\"/api/export\", {\n      method: \"POST\",\n      headers: { \"content-type\": \"application/json\" },\n      body: JSON.stringify({ entries: state.entries, awardCountsByGroup: state.awardCountsByGroup }),\n    });\n    if (!response.ok) {\n      const data = await response.json();\n      throw new Error(data.error || \"导出失败\");\n    }\n    const blob = await response.blob();\n    const url = URL.createObjectURL(blob);\n    const link = document.createElement(\"a\");\n    link.href = url;\n    link.download = \"道路工程成绩包.xlsx\";\n    document.body.append(link);\n    link.click();\n    link.remove();\n    URL.revokeObjectURL(url);\n    toast(\"成绩包已生成\");\n  } catch (error) {\n    toast(error.message);\n  } finally {\n    state.busy = false;\n    saveAndRender();\n  }\n}\n\nfunction clearAll() {\n  if (!state.entries.length || !window.confirm(\"确定清空全部队伍、成绩和奖项设置吗？\")) {\n    return;\n  }\n  state.entries = [];\n  state.activeEntryId = null;\n  state.issues = [];\n  state.awardCountsByGroup = {};\n  state.awardManualGroups = {};\n  state.query = \"\";\n  state.overviewQuery = \"\";\n  state.view = \"entry\";\n  saveAndRender();\n}\n\nfunction ensureActiveEntry() {\n  if (!state.entries.some((entry) => entry.id === state.activeEntryId)) {\n    state.activeEntryId = state.entries[0]?.id ?? null;\n  }\n}\n\nfunction hydrateState(saved) {\n  const source = saved && typeof saved === \"object\" ? saved : {};\n  const entries = Array.isArray(source.entries) ? source.entries.map(hydrateEntry) : [];\n  return {\n    entries,\n    activeEntryId: source.activeEntryId ?? entries[0]?.id ?? null,\n    view: [\"entry\", \"overview\", \"awards\"].includes(source.view) ? source.view : \"entry\",\n    queueGroup: [\"全部\", ...GROUPS].includes(source.queueGroup) ? source.queueGroup : \"全部\",\n    queueStatus: source.queueStatus ?? \"全部\",\n    query: source.query ?? \"\",\n    overviewGroup: [\"全部\", ...GROUPS].includes(source.overviewGroup) ? source.overviewGroup : \"全部\",\n    overviewQuery: source.overviewQuery ?? \"\",\n    issues: Array.isArray(source.issues) ? source.issues : [],\n    awardCountsByGroup: source.awardCountsByGroup ?? {},\n    awardManualGroups: source.awardManualGroups ?? {},\n    busy: false,\n  };\n}\n\nfunction hydrateEntry(entry, index) {\n  const rounds = [0, 1].map((roundIndex) => {\n    const base = emptyRound();\n    const sourceRound = entry.rounds?.[roundIndex] ?? {};\n    return {\n      seconds: sourceRound.seconds ?? \"\",\n      scores: Object.fromEntries(ROAD_TASKS.map((task) => [task.key, sourceRound.scores?.[task.key] ?? base.scores[task.key]])),\n    };\n  });\n  return {\n    ...entry,\n    id: entry.id ?? `team-${index + 1}`,\n    group: entry.group ?? GROUPS[0],\n    teamName: entry.teamName ?? `未命名队伍${index + 1}`,\n    school: entry.school ?? \"\",\n    studentA: entry.studentA ?? \"\",\n    studentB: entry.studentB ?? \"\",\n    coach: entry.coach ?? \"\",\n    number: entry.number ?? \"\",\n    note: entry.note ?? \"\",\n    robotWeight: entry.robotWeight ?? \"\",\n    rounds,\n    reviewed: Boolean(entry.reviewed),\n    source: entry.source ?? \"excel\",\n  };\n}\n\nfunction loadState() {\n  try {\n    return JSON.parse(localStorage.getItem(storageKey));\n  } catch {\n    return null;\n  }\n}\n\nfunction saveState() {\n  localStorage.setItem(storageKey, JSON.stringify(state));\n}\n\nfunction saveAndRender(options = {}) {\n  saveState();\n  render(options);\n}\n\nfunction restoreFocus(options) {\n  if (!options.focusId) {\n    return;\n  }\n  window.setTimeout(() => {\n    const element = document.getElementById(options.focusId);\n    element?.focus();\n    if (options.cursorToEnd && typeof element?.setSelectionRange === \"function\") {\n      const end = element.value.length;\n      element.setSelectionRange(end, end);\n    }\n  }, 0);\n}\n\nfunction statusBadge(status, large = false) {\n  const value = status ?? { key: \"unstarted\", label: \"未录入\" };\n  return `<span class=\"status-badge status-${value.key} ${large ? \"large\" : \"\"}\">${escapeHtml(value.label)}</span>`;\n}\n\nfunction awardBadge(award) {\n  if (!award) {\n    return `<span class=\"award-badge neutral\">未定</span>`;\n  }\n  const tone = { 一等奖: \"first\", 二等奖: \"second\", 三等奖: \"third\", 淘汰: \"out\" }[award] ?? \"neutral\";\n  return `<span class=\"award-badge ${tone}\">${escapeHtml(award)}</span>`;\n}\n\nfunction fileToBase64(file) {\n  return new Promise((resolve, reject) => {\n    const reader = new FileReader();\n    reader.addEventListener(\"load\", () => resolve(String(reader.result).split(\",\").pop()));\n    reader.addEventListener(\"error\", () => reject(reader.error));\n    reader.readAsDataURL(file);\n  });\n}\n\nfunction toast(message) {\n  document.querySelector(\".toast\")?.remove();\n  const element = document.createElement(\"div\");\n  element.className = \"toast\";\n  element.textContent = message;\n  document.body.append(element);\n  window.setTimeout(() => element.remove(), 2800);\n}\n\nfunction safeId(value) {\n  let hash = 0;\n  for (const character of String(value)) {\n    hash = ((hash << 5) - hash + character.codePointAt(0)) | 0;\n  }\n  return `field-${Math.abs(hash)}`;\n}\n\nfunction escapeHtml(value) {\n  return String(value ?? \"\")\n    .replace(/&/g, \"&amp;\")\n    .replace(/</g, \"&lt;\")\n    .replace(/>/g, \"&gt;\")\n    .replace(/\"/g, \"&quot;\")\n    .replace(/'/g, \"&#039;\");\n}\n\nfunction escapeAttr(value) {\n  return escapeHtml(value);\n}\n","shared/core.js":"export const GROUPS = [\"小学组\", \"初中组\", \"高中组\"];\n\nexport const REQUIRED_ROSTER_COLUMNS = [\"组别\", \"队伍名称\", \"学校\", \"选手A\", \"选手B\", \"指导教师\"];\n\nexport const AWARDS = {\n  first: \"一等奖\",\n  second: \"二等奖\",\n  third: \"三等奖\",\n  eliminated: \"淘汰\",\n  none: \"\",\n};\n\nexport const ENTRY_WORKFLOW_STATUS = {\n  unstarted: { key: \"unstarted\", label: \"未录入\" },\n  inProgress: { key: \"in-progress\", label: \"录入中\" },\n  needsWeight: { key: \"needs-weight\", label: \"待补重量\" },\n  ready: { key: \"ready\", label: \"待复核\" },\n  reviewed: { key: \"reviewed\", label: \"已确认\" },\n  invalid: { key: \"invalid\", label: \"有问题\" },\n};\n\nexport const ROAD_TASKS = [\n  {\n    key: \"materialRecovery\",\n    name: \"物料回收\",\n    allowedScores: [0, 30, 50],\n    description: \"指定区域50分，工程点黑框内30分。\",\n  },\n  {\n    key: \"serviceArea\",\n    name: \"建设服务区\",\n    allowedScores: [0, 30, 50, 80],\n    allowedScoresByGroup: { 小学组: [0, 30, 50] },\n    description: \"小学组按红色纸杯完成度；初高中组按颜色和层级完成度。\",\n  },\n  {\n    key: \"bridge\",\n    name: \"搭建桥梁\",\n    allowedScores: [0, 30, 50, 80],\n    allowedScoresByGroup: { 小学组: [0, 50] },\n    description: \"小学组任意两个原料堆叠50分；初高中组按堆叠与顺序计分。\",\n  },\n  {\n    key: \"tunnel\",\n    name: \"隧道挖掘\",\n    allowedScores: [0, 50],\n    description: \"驱动轮须在黑色隧道区域两侧通过。\",\n  },\n  {\n    key: \"gasStation\",\n    name: \"建设加油站\",\n    allowedScores: [0, 50],\n    description: \"泡沫球放在纸杯底上面。\",\n  },\n  {\n    key: \"gravityGate\",\n    name: \"重力闸口\",\n    allowedScores: [0, 50],\n    description: \"闸口横梁杆抬起，机器人循线通过。\",\n  },\n  {\n    key: \"autoCharging\",\n    name: \"自动充电\",\n    allowedScores: [0, 50],\n    description: \"机器人全部垂直投影在区域内且静态停止至少3秒。\",\n  },\n];\n\nconst TASK_BY_KEY = new Map(ROAD_TASKS.map((task) => [task.key, task]));\n\nexport function allowedScoresForTask(task, group) {\n  return task.allowedScoresByGroup?.[group] ?? task.allowedScores;\n}\n\nexport function normalizeText(value) {\n  return String(value ?? \"\").trim();\n}\n\nexport function toNumber(value, fallback = 0) {\n  if (value === \"/\" || value === null || value === undefined || value === \"\") {\n    return fallback;\n  }\n  const parsed = Number(value);\n  return Number.isFinite(parsed) ? parsed : fallback;\n}\n\nexport function validateRosterRows(rows) {\n  const presentColumns = new Set(rows.flatMap((row) => Object.keys(row ?? {})));\n  const missingColumns = REQUIRED_ROSTER_COLUMNS.filter((column) => !presentColumns.has(column));\n  const issues = [];\n  const seen = new Set();\n  const validRows = [];\n\n  rows.forEach((row, index) => {\n    const rowNumber = index + 2;\n    const group = normalizeText(row?.组别);\n    const teamName = normalizeText(row?.队伍名称);\n    const school = normalizeText(row?.学校);\n    const studentA = normalizeText(row?.选手A);\n    const studentB = normalizeText(row?.选手B);\n    const coach = normalizeText(row?.指导教师);\n    const rowIssues = [];\n\n    if (!teamName) {\n      rowIssues.push({ type: \"empty-team\", rowNumber, message: \"队伍名称为空\" });\n    }\n    if (group && !GROUPS.includes(group)) {\n      rowIssues.push({ type: \"unknown-group\", rowNumber, message: `未知组别：${group}` });\n    }\n    if (teamName) {\n      const duplicateKey = `${group}|${teamName}`;\n      if (seen.has(duplicateKey)) {\n        rowIssues.push({ type: \"duplicate-team\", rowNumber, message: `重复队伍：${teamName}` });\n      }\n      seen.add(duplicateKey);\n    }\n\n    issues.push(...rowIssues);\n    if (!missingColumns.length && !rowIssues.length && group && teamName) {\n      validRows.push({\n        id: createTeamId(group, teamName, validRows.length),\n        group,\n        teamName,\n        school,\n        studentA,\n        studentB,\n        coach,\n        number: normalizeText(row?.编号),\n        note: normalizeText(row?.备注),\n      });\n    }\n  });\n\n  return { missingColumns, issues, validRows };\n}\n\nexport function createTeamId(group, teamName, index = 0) {\n  const base = `${group}-${teamName}`.replace(/\\s+/g, \"\");\n  return `${base || \"team\"}-${index + 1}`;\n}\n\nexport function emptyRound() {\n  return {\n    seconds: \"\",\n    scores: Object.fromEntries(ROAD_TASKS.map((task) => [task.key, \"\"])),\n  };\n}\n\nexport function createEntryFromRoster(row) {\n  return {\n    ...row,\n    robotWeight: \"\",\n    rounds: [emptyRound(), emptyRound()],\n    reviewed: false,\n    source: row.source ?? \"excel\",\n  };\n}\n\nexport function validateManualTeam(fields, existingEntries = []) {\n  const group = normalizeText(fields?.group);\n  const teamName = normalizeText(fields?.teamName);\n  const issues = [];\n\n  if (!teamName) {\n    issues.push({ type: \"empty-team\", field: \"teamName\", message: \"队伍名称不能为空\" });\n  }\n  if (!GROUPS.includes(group)) {\n    issues.push({ type: \"unknown-group\", field: \"group\", message: \"请选择小学组、初中组或高中组\" });\n  }\n  if (teamName && existingEntries.some((entry) => (\n    normalizeText(entry.group) === group && normalizeText(entry.teamName) === teamName\n  ))) {\n    issues.push({ type: \"duplicate-team\", field: \"teamName\", message: `本组已存在队伍：${teamName}` });\n  }\n\n  return issues;\n}\n\nexport function createManualEntry(fields, index = 0) {\n  const group = normalizeText(fields?.group);\n  const teamName = normalizeText(fields?.teamName);\n  return createEntryFromRoster({\n    id: createTeamId(group, teamName, index),\n    group,\n    teamName,\n    school: normalizeText(fields?.school),\n    studentA: normalizeText(fields?.studentA),\n    studentB: normalizeText(fields?.studentB),\n    coach: normalizeText(fields?.coach),\n    number: normalizeText(fields?.number),\n    note: normalizeText(fields?.note),\n    source: \"manual\",\n  });\n}\n\nexport function mergeRosterEntries(existingEntries = [], importedEntries = []) {\n  const entries = existingEntries.map((entry) => ({ ...entry }));\n  const byTeam = new Map(entries.map((entry) => [teamKey(entry), entry]));\n  const profileFields = [\"school\", \"studentA\", \"studentB\", \"coach\", \"number\", \"note\"];\n  let duplicates = 0;\n\n  for (const imported of importedEntries) {\n    const key = teamKey(imported);\n    const existing = byTeam.get(key);\n    if (!existing) {\n      entries.push(imported);\n      byTeam.set(key, imported);\n      continue;\n    }\n\n    duplicates += 1;\n    for (const field of profileFields) {\n      if (!normalizeText(existing[field]) && normalizeText(imported[field])) {\n        existing[field] = normalizeText(imported[field]);\n      }\n    }\n  }\n\n  return { entries, duplicates };\n}\n\nfunction teamKey(entry) {\n  return `${normalizeText(entry?.group)}|${normalizeText(entry?.teamName)}`;\n}\n\nexport function calculateTeam(entry) {\n  const complete = isEntryScoreComplete(entry);\n  const rounds = [0, 1].map((roundIndex) => {\n    const sourceRound = entry.rounds?.[roundIndex] ?? {};\n    const scores = {};\n    for (const task of ROAD_TASKS) {\n      const rawScore = sourceRound.scores?.[task.key];\n      const allowedScores = allowedScoresForTask(task, entry.group ?? entry.组别);\n      scores[task.key] = allowedScores.includes(toNumber(rawScore)) ? toNumber(rawScore) : 0;\n    }\n    return {\n      seconds: toNumber(sourceRound.seconds),\n      scores,\n      total: ROAD_TASKS.reduce((sum, task) => sum + scores[task.key], 0),\n    };\n  });\n  const roundTotals = rounds.map((round) => round.total);\n  const totalScore = roundTotals[0] + roundTotals[1];\n  const totalSeconds = rounds[0].seconds + rounds[1].seconds;\n  const parsedWeight = toNumber(entry.robotWeight, Number.NaN);\n  const robotWeight = Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : \"\";\n\n  return {\n    ...entry,\n    teamName: entry.teamName ?? entry.队伍名称,\n    group: entry.group ?? entry.组别,\n    school: entry.school ?? entry.学校 ?? \"\",\n    robotWeight,\n    rounds,\n    roundTotals,\n    totalScore,\n    totalSeconds,\n    complete,\n    eliminated: complete && totalScore === 0,\n  };\n}\n\nexport function isEntryScoreComplete(entry) {\n  return [0, 1].every((roundIndex) => {\n    const round = entry.rounds?.[roundIndex];\n    const seconds = Number(round?.seconds);\n    if (round?.seconds === \"\" || round?.seconds === undefined || round?.seconds === null\n      || !Number.isFinite(seconds) || seconds < 0 || seconds > 180) {\n      return false;\n    }\n    return ROAD_TASKS.every((task) => {\n      const value = round?.scores?.[task.key];\n      if (value === \"/\") {\n        return true;\n      }\n      const allowedScores = allowedScoresForTask(task, entry.group ?? entry.组别);\n      return value !== \"\" && value !== undefined && value !== null\n        && allowedScores.includes(Number(value));\n    });\n  });\n}\n\nexport function validateScoreEntry(entry) {\n  const issues = [];\n\n  if (!GROUPS.includes(entry.group)) {\n    issues.push({ type: \"unknown-group\", field: \"group\", message: \"组别必须是小学组、初中组或高中组\" });\n  }\n  if (!normalizeText(entry.teamName)) {\n    issues.push({ type: \"empty-team\", field: \"teamName\", message: \"队伍名称不能为空\" });\n  }\n  if (entry.robotWeight === \"\" || entry.robotWeight === undefined || entry.robotWeight === null) {\n    issues.push({ type: \"missing-weight\", field: \"robotWeight\", message: \"机器人重量不能为空\" });\n  } else if (!Number.isFinite(Number(entry.robotWeight)) || Number(entry.robotWeight) <= 0) {\n    issues.push({ type: \"invalid-weight\", field: \"robotWeight\", message: \"机器人重量必须大于0\" });\n  }\n\n  [0, 1].forEach((roundIndex) => {\n    const round = entry.rounds?.[roundIndex] ?? {};\n    if (round.seconds === \"\" || round.seconds === undefined || round.seconds === null) {\n      issues.push({ type: \"missing-time\", field: `rounds.${roundIndex}.seconds`, message: `第${roundIndex + 1}轮用时不能为空` });\n    } else {\n      const seconds = Number(round.seconds);\n      if (!Number.isFinite(seconds) || seconds < 0 || seconds > 180) {\n        issues.push({ type: \"invalid-time\", field: `rounds.${roundIndex}.seconds`, message: `第${roundIndex + 1}轮用时必须在0-180秒之间` });\n      }\n    }\n\n    for (const task of ROAD_TASKS) {\n      const value = round.scores?.[task.key];\n      if (value === \"\" || value === undefined || value === null) {\n        issues.push({ type: \"missing-score\", field: `rounds.${roundIndex}.scores.${task.key}`, message: `第${roundIndex + 1}轮${task.name}得分不能为空` });\n        continue;\n      }\n      if (value === \"/\") {\n        continue;\n      }\n      const score = Number(value);\n      const allowedScores = allowedScoresForTask(task, entry.group);\n      if (!allowedScores.includes(score)) {\n        issues.push({\n          type: \"invalid-score\",\n          field: `rounds.${roundIndex}.scores.${task.key}`,\n          message: `第${roundIndex + 1}轮${task.name}只能填写：${allowedScores.join(\"、\")}`,\n        });\n      }\n    }\n  });\n\n  return issues;\n}\n\nexport function getEntryWorkflowStatus(entry) {\n  const paperFields = [];\n  for (const round of entry.rounds ?? []) {\n    paperFields.push(round?.seconds);\n    for (const task of ROAD_TASKS) {\n      paperFields.push(round?.scores?.[task.key]);\n    }\n  }\n\n  const filled = paperFields.filter((value) => value !== \"\" && value !== undefined && value !== null).length;\n  const total = ROAD_TASKS.length * 2 + 2;\n  const issues = validateScoreEntry(entry);\n  const invalidIssues = issues.filter((issue) => ![\"missing-score\", \"missing-time\", \"missing-weight\"].includes(issue.type));\n\n  if (invalidIssues.length) {\n    return { ...ENTRY_WORKFLOW_STATUS.invalid, filled, total, issues };\n  }\n  if (filled === 0) {\n    return { ...ENTRY_WORKFLOW_STATUS.unstarted, filled, total, issues };\n  }\n  if (filled < total) {\n    return { ...ENTRY_WORKFLOW_STATUS.inProgress, filled, total, issues };\n  }\n  if (issues.some((issue) => issue.type === \"missing-weight\")) {\n    return { ...ENTRY_WORKFLOW_STATUS.needsWeight, filled, total, issues };\n  }\n  if (entry.reviewed) {\n    return { ...ENTRY_WORKFLOW_STATUS.reviewed, filled, total, issues };\n  }\n  return { ...ENTRY_WORKFLOW_STATUS.ready, filled, total, issues };\n}\n\nexport function rankTeams(entries) {\n  const calculated = entries.map((entry) => (entry.totalScore === undefined ? calculateTeam(entry) : entry));\n  const active = calculated\n    .filter((team) => team.complete !== false && !team.eliminated)\n    .sort((a, b) => (\n      b.totalScore - a.totalScore\n      || a.totalSeconds - b.totalSeconds\n      || weightForSort(a) - weightForSort(b)\n      || normalizeText(a.teamName).localeCompare(normalizeText(b.teamName), \"zh-Hans-CN\")\n    ))\n    .map((team, index) => ({ ...team, rank: index + 1 }));\n  const eliminated = calculated\n    .filter((team) => team.complete !== false && team.eliminated)\n    .sort((a, b) => normalizeText(a.teamName).localeCompare(normalizeText(b.teamName), \"zh-Hans-CN\"))\n    .map((team) => ({ ...team, rank: null, award: AWARDS.eliminated }));\n  const pending = calculated\n    .filter((team) => team.complete === false)\n    .sort((a, b) => normalizeText(a.teamName).localeCompare(normalizeText(b.teamName), \"zh-Hans-CN\"))\n    .map((team) => ({ ...team, rank: null, award: AWARDS.none }));\n  return [...active, ...eliminated, ...pending];\n}\n\nfunction weightForSort(team) {\n  const weight = Number(team.robotWeight);\n  return Number.isFinite(weight) && weight > 0 ? weight : Number.POSITIVE_INFINITY;\n}\n\nexport function suggestAwardCounts(activeCount) {\n  const count = Math.max(0, Number(activeCount) || 0);\n  if (count === 0) {\n    return { first: 0, second: 0, third: 0 };\n  }\n  const first = Math.round(count * 0.15);\n  const second = Math.round(count * 0.35);\n  return {\n    first,\n    second,\n    third: Math.max(0, count - first - second),\n  };\n}\n\nexport function reconcileAwardCounts(entries, currentCounts = {}, manualGroups = {}) {\n  const groups = buildGroupResults(entries, {});\n  return Object.fromEntries(GROUPS.map((group) => {\n    const activeCount = groups[group].teams.filter((team) => team.complete && !team.eliminated).length;\n    const counts = manualGroups[group]\n      ? clampAwardCounts(currentCounts[group] ?? suggestAwardCounts(activeCount), activeCount)\n      : suggestAwardCounts(activeCount);\n    return [group, counts];\n  }));\n}\n\nexport function clampAwardCounts(counts, activeCount) {\n  const first = Math.max(0, Math.trunc(Number(counts.first) || 0));\n  const second = Math.max(0, Math.trunc(Number(counts.second) || 0));\n  const third = Math.max(0, Math.min(Math.trunc(Number(counts.third) || 0), Math.max(0, activeCount - first - second)));\n  return { first, second, third };\n}\n\nexport function assignAwards(rankedTeams, countsByGroupOrCounts) {\n  const teamsByGroup = groupBy(rankedTeams, (team) => team.group);\n  const output = [];\n\n  for (const team of rankedTeams) {\n    const groupTeams = teamsByGroup.get(team.group) ?? [];\n    const activeGroupTeams = groupTeams.filter((candidate) => candidate.complete !== false && !candidate.eliminated);\n    const counts = isSingleAwardCount(countsByGroupOrCounts)\n      ? clampAwardCounts(countsByGroupOrCounts, activeGroupTeams.length)\n      : clampAwardCounts(countsByGroupOrCounts?.[team.group] ?? suggestAwardCounts(activeGroupTeams.length), activeGroupTeams.length);\n\n    if (team.complete === false) {\n      output.push({ ...team, award: AWARDS.none });\n    } else if (team.eliminated) {\n      output.push({ ...team, award: AWARDS.eliminated });\n    } else if (team.rank <= counts.first) {\n      output.push({ ...team, award: AWARDS.first });\n    } else if (team.rank <= counts.first + counts.second) {\n      output.push({ ...team, award: AWARDS.second });\n    } else if (team.rank <= counts.first + counts.second + counts.third) {\n      output.push({ ...team, award: AWARDS.third });\n    } else {\n      output.push({ ...team, award: AWARDS.none });\n    }\n  }\n\n  return output;\n}\n\nexport function buildGroupResults(entries, awardCountsByGroup = {}) {\n  const calculated = entries.map(calculateTeam);\n  const byGroup = groupBy(calculated, (team) => team.group);\n  const groups = {};\n\n  for (const group of GROUPS) {\n    const ranked = rankTeams(byGroup.get(group) ?? []);\n    const activeCount = ranked.filter((team) => team.complete !== false && !team.eliminated).length;\n    const counts = awardCountsByGroup[group] ?? suggestAwardCounts(activeCount);\n    groups[group] = {\n      awardCounts: clampAwardCounts(counts, activeCount),\n      teams: assignAwards(ranked, counts),\n    };\n  }\n\n  return groups;\n}\n\nfunction isSingleAwardCount(value) {\n  return value && [\"first\", \"second\", \"third\"].some((key) => Object.hasOwn(value, key));\n}\n\nfunction groupBy(items, getKey) {\n  const map = new Map();\n  for (const item of items) {\n    const key = getKey(item);\n    if (!map.has(key)) {\n      map.set(key, []);\n    }\n    map.get(key).push(item);\n  }\n  return map;\n}\n"};
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
