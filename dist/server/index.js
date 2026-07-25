import {
  GROUPS,
  OFFICIAL_SCORE_HEADERS,
  OFFICIAL_SCORE_OUTPUT_FILENAME,
  ROSTER_TEMPLATE_COLUMNS,
  ROAD_TASKS,
  buildGroupResults,
  buildOfficialScoreSheets,
  createEntryFromRoster,
  normalizeText,
  validateRosterRows,
} from "./core.js";

const STATIC_ASSETS = {"index.html":"<!doctype html>\n<html lang=\"zh-CN\">\n  <head>\n    <meta charset=\"utf-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n    <title>道路工程成绩统计工具</title>\n    <link rel=\"stylesheet\" href=\"/styles.css\">\n  </head>\n  <body>\n    <div id=\"app\" class=\"app-shell\">\n      <main class=\"boot-panel\">\n        <div class=\"loader\"></div>\n        <p id=\"bootStatus\">正在加载工具...</p>\n      </main>\n    </div>\n    <script>\n      (() => {\n        const showBootError = (message) => {\n          const status = document.querySelector(\"#bootStatus\");\n          const loader = document.querySelector(\".loader\");\n          if (!status || !document.querySelector(\".boot-panel\")) return;\n          if (loader) loader.remove();\n          status.textContent = message;\n          status.style.color = \"#a33a32\";\n        };\n\n        window.addEventListener(\"error\", (event) => {\n          const target = event.target;\n          if (target?.tagName === \"SCRIPT\") {\n            showBootError(\"入口脚本加载失败，请检查 Cloudflare 部署入口和静态资源路径。\");\n            return;\n          }\n          if (event.message) {\n            showBootError(`工具启动失败：${event.message}`);\n          }\n        }, true);\n\n        window.addEventListener(\"unhandledrejection\", (event) => {\n          showBootError(`工具启动失败：${event.reason?.message || event.reason || \"未知错误\"}`);\n        });\n\n        window.setTimeout(() => {\n          showBootError(\"加载超时，请检查部署命令是否使用 npx wrangler deploy，且入口为 dist/server/index.js。\");\n        }, 8000);\n      })();\n    </script>\n    <script type=\"module\" src=\"/app.js\"></script>\n  </body>\n</html>\n","styles.css":":root{color-scheme:light;--canvas:#f1f4f1;--surface:#ffffff;--surface-subtle:#f7f9f7;--surface-muted:#edf1ee;--ink:#172625;--ink-soft:#334846;--muted:#667774;--line:#d9e1dd;--line-strong:#bcc9c4;--brand:#176b63;--brand-strong:#0e514b;--brand-soft:#e5f2ef;--amber:#a96716;--amber-soft:#fff1d8;--blue:#35627f;--blue-soft:#e8f1f7;--danger:#a33a32;--danger-soft:#fbe9e6;--ok:#28654a;--ok-soft:#e5f3ea;--shadow:0 14px 32px rgba(32,51,47,0.09);--radius:6px;font-family:\"Microsoft YaHei UI\",\"PingFang SC\",\"Noto Sans CJK SC\",sans-serif}*{box-sizing:border-box}html,body{min-height:100%;margin:0}body{min-width:320px;background:var(--canvas);color:var(--ink);font-size:14px;letter-spacing:0}button,input,select{font:inherit;letter-spacing:0}button,label,a{-webkit-tap-highlight-color:transparent}button:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid rgba(23,107,99,0.23);outline-offset:2px}button:disabled,.is-disabled{cursor:not-allowed;opacity:0.48}h1,h2,p{margin:0}.visually-hidden{position:absolute !important;width:1px !important;height:1px !important;padding:0 !important;margin:-1px !important;overflow:hidden !important;clip:rect(0,0,0,0) !important;white-space:nowrap !important;border:0 !important}.app-shell{height:100vh;min-height:100vh;display:flex;flex-direction:column;overflow:hidden}.appbar{position:sticky;top:0;z-index:30;min-height:64px;display:grid;grid-template-columns:220px minmax(360px,1fr) auto;align-items:center;gap:20px;padding:0 22px;border-bottom:1px solid var(--line);background:rgba(255,255,255,0.97)}.brand-block{display:flex;align-items:center;gap:10px;min-width:0}.brand-mark{width:34px;height:34px;flex:0 0 34px;display:grid;place-items:center;border-radius:5px;background:var(--brand-strong);color:#ffffff;font-family:\"STKaiti\",\"KaiTi\",serif;font-size:20px;font-weight:700}.brand-block div{min-width:0}.brand-block strong,.brand-block span{display:block;white-space:nowrap}.brand-block strong{font-size:15px}.brand-block div span{margin-top:2px;color:var(--muted);font-size:11px}.view-tabs{height:64px;display:flex;align-items:stretch;justify-content:center;gap:6px}.view-tab{position:relative;min-width:104px;padding:0 16px;border:0;background:transparent;color:var(--muted);font-weight:700;cursor:pointer}.view-tab::after{content:\"\";position:absolute;right:14px;bottom:0;left:14px;height:3px;border-radius:3px 3px 0 0;background:transparent}.view-tab:hover{color:var(--ink);background:var(--surface-subtle)}.view-tab.active{color:var(--brand-strong)}.view-tab.active::after{background:var(--brand)}.app-actions,.section-tools,.toolbar-actions,.paper-actions,.empty-actions{display:flex;align-items:center;gap:8px}.button,.icon-button{border:1px solid transparent;border-radius:var(--radius);cursor:pointer;text-decoration:none;transition:background 140ms ease,border-color 140ms ease,color 140ms ease,transform 100ms ease}.button{min-height:36px;display:inline-flex;align-items:center;justify-content:center;padding:0 13px;white-space:nowrap;font-size:13px;font-weight:700}.button:active,.icon-button:active{transform:translateY(1px)}.button-primary{border-color:var(--brand);background:var(--brand);color:#ffffff}.button-primary:hover:not(:disabled){border-color:var(--brand-strong);background:var(--brand-strong)}.button-secondary{border-color:var(--line-strong);background:var(--surface);color:var(--ink-soft)}.button-secondary:hover:not(:disabled){border-color:#8da39c;background:var(--surface-subtle)}.button-quiet{border-color:transparent;background:transparent;color:var(--muted)}.button-quiet:hover{background:var(--surface-muted);color:var(--ink)}.button-danger-quiet{border-color:transparent;background:transparent;color:var(--danger)}.button-danger-quiet:hover{border-color:#e7b8b2;background:var(--danger-soft)}.button-small{min-height:30px;padding:0 10px;font-size:12px}.icon-button{width:34px;height:34px;display:inline-grid;place-items:center;padding:0;border-color:var(--line-strong);background:var(--surface);color:var(--ink-soft);font-size:18px;line-height:1}.icon-button:hover:not(:disabled){border-color:#8da39c;background:var(--surface-subtle)}.progress-strip{min-height:42px;display:flex;align-items:center;gap:0;padding:0 22px;border-bottom:1px solid var(--line);background:#f8faf8}.compact-metric{display:flex;align-items:baseline;gap:8px;min-width:120px;padding:0 22px;border-right:1px solid var(--line)}.compact-metric:first-child{padding-left:0}.compact-metric span{color:var(--muted);font-size:12px}.compact-metric strong{font-variant-numeric:tabular-nums;font-size:17px}.compact-metric.warn strong{color:var(--amber)}.compact-metric.ok strong{color:var(--ok)}.save-state{margin-left:auto;color:var(--muted);font-size:12px}.save-state::before{content:\"\";width:7px;height:7px;display:inline-block;margin-right:7px;border-radius:50%;background:var(--ok)}.view-area{min-height:0;flex:1;overflow:auto}.entry-layout{height:100%;min-height:0;display:grid;grid-template-columns:292px minmax(0,1fr)}.entry-queue{height:100%;min-height:0;display:flex;flex-direction:column;border-right:1px solid var(--line);background:var(--surface)}.queue-header{min-height:60px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.queue-header > div{display:flex;align-items:baseline;gap:8px}.queue-header h2{font-size:15px}.queue-header span{color:var(--muted);font-size:11px}.queue-header-actions{display:flex;flex:0 0 auto;align-items:center;gap:6px}.queue-header-actions .button{min-height:34px}.queue-filters{display:grid;gap:8px;padding:12px;border-bottom:1px solid var(--line);background:var(--surface-subtle)}.filter-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.text-input,.select-input,.team-form-grid input,.team-form-grid select,.award-group input{width:100%;height:36px;padding:0 10px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--surface);color:var(--ink)}.text-input::placeholder{color:#92a19d}.text-input:hover,.select-input:hover,.team-form-grid input:hover,.team-form-grid select:hover{border-color:#8da39c}.queue-list{min-height:0;flex:1;overflow:auto}.queue-item{width:100%;min-height:76px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:11px 13px;border:0;border-bottom:1px solid var(--line);background:var(--surface);color:var(--ink);text-align:left;cursor:pointer}.queue-item:hover{background:#f7faf8}.queue-item.active{background:var(--brand-soft);box-shadow:inset 3px 0 0 var(--brand)}.queue-item-main,.queue-item-side{min-width:0;display:flex;flex-direction:column}.queue-item-main{gap:3px}.queue-item-main strong,.queue-item-main small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.queue-item-main strong{font-size:14px}.queue-number{color:var(--brand-strong);font-size:11px;font-weight:700}.queue-item-main small{color:var(--muted);font-size:11px}.queue-item-side{align-items:flex-end;justify-content:space-between;gap:7px}.queue-item-side b{font-variant-numeric:tabular-nums;font-size:16px}.queue-empty{padding:30px 16px;color:var(--muted);text-align:center}.paper-stage{height:100%;min-width:0;overflow:auto;padding:18px 22px 30px}.paper-toolbar,.paper-sheet{width:min(1100px,100%);margin-right:auto;margin-left:auto}.paper-toolbar{min-height:42px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;color:var(--muted);font-size:12px}.paper-sheet{border:1px solid var(--line-strong);border-radius:4px;background:var(--surface);box-shadow:var(--shadow)}.paper-heading{min-height:112px;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:22px 26px;border-bottom:1px solid var(--line-strong)}.paper-heading p{margin-bottom:5px;color:var(--brand-strong);font-family:\"STKaiti\",\"KaiTi\",serif;font-size:15px;font-weight:700}.paper-heading h1{max-width:680px;overflow-wrap:anywhere;font-size:23px;line-height:1.25}.paper-heading div > span{display:block;margin-top:7px;color:var(--muted);font-size:12px}.score-table-wrap{overflow-x:auto}.paper-score-table,.data-table{width:100%;border-collapse:collapse}.paper-score-table{min-width:790px;table-layout:fixed}.paper-score-table th,.paper-score-table td{height:58px;padding:8px 12px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);text-align:center;vertical-align:middle}.paper-score-table th:last-child,.paper-score-table td:last-child{border-right:0}.paper-score-table thead th{height:42px;background:#edf3f1;color:var(--ink-soft);font-size:12px}.paper-score-table th:nth-child(1){width:18%}.paper-score-table th:nth-child(2){width:14%}.paper-score-table th:nth-child(3),.paper-score-table th:nth-child(4){width:34%}.task-name{text-align:left !important}.task-name strong{font-size:14px}.allowed-scores{color:var(--muted);font-variant-numeric:tabular-nums;font-size:12px}.score-options{min-height:34px;display:flex;align-items:stretch;justify-content:center}.score-choice label{min-width:42px;height:34px;display:grid;place-items:center;margin-left:-1px;border:1px solid var(--line-strong);background:var(--surface);color:var(--ink-soft);font-variant-numeric:tabular-nums;font-size:13px;font-weight:700;cursor:pointer}.score-choice:first-child label{margin-left:0;border-radius:5px 0 0 5px}.score-choice:last-child label{border-radius:0 5px 5px 0}.score-choice input:checked + label{position:relative;z-index:1;border-color:var(--brand);background:var(--brand);color:#ffffff}.score-choice input:focus-visible + label{position:relative;z-index:2;outline:3px solid rgba(23,107,99,0.23);outline-offset:2px}.clear-choice label{color:#9aa7a3;font-size:16px;font-weight:400}.clear-choice input:checked + label{border-color:var(--line-strong);background:var(--surface-muted);color:var(--muted)}.time-row td{background:#fbfcfb}.time-input{display:inline-flex;align-items:center;gap:6px;color:var(--muted);font-size:12px}.time-input input,.weight-field input{height:36px;padding:0 8px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--surface);color:var(--ink);font-variant-numeric:tabular-nums;text-align:right}.time-input input{width:112px;text-align:center}.time-format-label{white-space:nowrap}.score-summary{display:grid;grid-template-columns:repeat(4,minmax(110px,1fr)) minmax(190px,1.25fr);border-bottom:1px solid var(--line);background:#f7f9f7}.summary-value,.weight-field{min-height:82px;display:flex;align-items:baseline;justify-content:center;gap:5px;padding:18px 14px;border-right:1px solid var(--line)}.summary-value > span,.weight-field > span:first-child{align-self:flex-start;color:var(--muted);font-size:11px}.summary-value strong{align-self:center;font-variant-numeric:tabular-nums;font-size:24px}.summary-value small{align-self:center;color:var(--muted)}.summary-value.strong{background:var(--brand-soft);color:var(--brand-strong)}.weight-field{border-right:0;flex-direction:column;align-items:flex-start;justify-content:center}.weight-field > span:last-child{display:flex;align-items:center;gap:7px;color:var(--muted)}.weight-field input{width:116px}.paper-footer{min-height:82px;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px 20px}.paper-check{min-width:0;display:flex;flex-direction:column;gap:4px}.paper-check strong{font-size:13px}.paper-check span{color:var(--muted);font-size:11px;text-wrap:pretty}.status-badge,.award-badge{display:inline-flex;align-items:center;justify-content:center;min-height:24px;padding:0 8px;border-radius:999px;white-space:nowrap;font-size:11px;font-weight:700}.status-badge.large{min-height:30px;padding:0 11px;font-size:12px}.status-unstarted{background:var(--surface-muted);color:var(--muted)}.status-in-progress{background:var(--blue-soft);color:var(--blue)}.status-needs-weight,.status-ready{background:var(--amber-soft);color:var(--amber)}.status-reviewed{background:var(--ok-soft);color:var(--ok)}.status-invalid{background:var(--danger-soft);color:var(--danger)}.page-section{width:min(1500px,calc(100% - 40px));margin:0 auto;padding:24px 0 36px}.section-header{min-height:58px;display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:16px}.section-header > div:first-child,.subsection-heading{min-width:0}.section-header h1{font-size:22px}.section-header > div:first-child span,.subsection-heading span{display:block;margin-top:4px;color:var(--muted);font-size:12px}.segmented-control{display:inline-flex;overflow:hidden;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--surface)}.segmented-control button{min-width:72px;height:34px;padding:0 10px;border:0;border-right:1px solid var(--line);background:transparent;color:var(--muted);cursor:pointer}.segmented-control button:last-child{border-right:0}.segmented-control button.active{background:var(--brand);color:#ffffff}.overview-search{width:230px}.data-table-wrap{overflow:auto;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface)}.data-table-wrap.compact{max-height:500px}.data-table{min-width:1080px}.data-table th,.data-table td{min-height:44px;padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle;font-size:12px}.data-table th{position:sticky;top:0;z-index:2;background:#edf3f1;color:var(--ink-soft);white-space:nowrap}.data-table tbody tr:last-child td{border-bottom:0}.data-table td strong,.data-table td span{display:block}.data-table td span:not(.status-badge):not(.award-badge){margin-top:2px;color:var(--muted);font-size:11px}.clickable-row{cursor:pointer}.clickable-row:hover td{background:#f8faf8}.number-strong{color:var(--brand-strong);font-variant-numeric:tabular-nums;font-size:14px !important;font-weight:800}.table-empty{height:120px;color:var(--muted);text-align:center !important}.award-badge.neutral{background:var(--surface-muted);color:var(--muted)}.award-badge.first{background:#fff0c7;color:#7a5200}.award-badge.second{background:#e9eef1;color:#425762}.award-badge.third{background:#f1e4d4;color:#744518}.award-badge.out{background:var(--danger-soft);color:var(--danger)}.awards-layout{display:grid;grid-template-columns:minmax(620px,1.7fr) minmax(300px,0.8fr);gap:18px;margin-bottom:18px}.award-settings,.review-panel,.ranking-section{border:1px solid var(--line);border-radius:var(--radius);background:var(--surface)}.subsection-heading{min-height:58px;padding:13px 16px;border-bottom:1px solid var(--line)}.subsection-heading h2{font-size:15px}.award-groups{padding:0 16px}.award-group{min-height:82px;display:grid;grid-template-columns:minmax(130px,1.2fr) repeat(3,minmax(96px,1fr));gap:12px;align-items:end;padding:14px 0;border-bottom:1px solid var(--line)}.award-group:last-child{border-bottom:0}.award-group > div{align-self:center}.award-group > div strong,.award-group > div span{display:block}.award-group > div span{margin-top:4px;color:var(--muted);font-size:11px}.award-group label{display:grid;gap:5px;color:var(--muted);font-size:11px}.export-source-note{padding:10px 14px;border-bottom:1px solid var(--line);background:var(--surface-subtle);color:var(--muted);font-size:12px;line-height:1.5}.review-list{max-height:284px;overflow:auto}.review-item{width:100%;min-height:52px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;border:0;border-bottom:1px solid var(--line);background:var(--surface);color:var(--ink);text-align:left;cursor:pointer}.review-item:hover:not(:disabled){background:var(--surface-subtle)}.review-item span{color:var(--amber);font-size:11px}.review-item.danger span{color:var(--danger)}.all-clear{min-height:160px;display:grid;place-content:center;gap:5px;color:var(--ok);text-align:center}.all-clear span{color:var(--muted);font-size:12px}.ranking-section{overflow:hidden}.danger-zone{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:18px 0 0;color:var(--muted);font-size:11px}.empty-workspace{min-height:calc(100vh - 107px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:28px}.empty-workspace h1{font-size:21px}.empty-sheet{width:180px;height:124px;display:grid;grid-template-columns:1.1fr 0.9fr;grid-template-rows:repeat(2,1fr);overflow:hidden;border:1px solid var(--line-strong);border-radius:3px;background:var(--surface);box-shadow:var(--shadow);transform:rotate(-2deg)}.empty-sheet span{border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.empty-sheet span:nth-child(2n){border-right:0}.empty-sheet span:nth-child(n + 3){border-bottom:0}.team-dialog{width:min(640px,calc(100vw - 28px));padding:0;overflow:hidden;border:1px solid var(--line-strong);border-radius:7px;background:var(--surface);color:var(--ink);box-shadow:0 26px 80px rgba(20,37,34,0.28)}.team-dialog::backdrop{background:rgba(20,35,33,0.46)}.team-dialog form > header,.team-dialog form > footer{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:16px 18px}.team-dialog form > header{border-bottom:1px solid var(--line)}.team-dialog form > header span{color:var(--brand-strong);font-size:11px;font-weight:700}.team-dialog form > header h2{margin-top:3px;font-size:19px}.team-dialog form > footer{justify-content:flex-end;border-top:1px solid var(--line);background:var(--surface-subtle)}.team-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:18px}.team-form-grid label{min-width:0;display:grid;gap:6px}.team-form-grid label.wide{grid-column:1 / -1}.team-form-grid label > span{color:var(--muted);font-size:12px;font-weight:700}.form-error{min-height:20px;padding:0 18px 12px;color:var(--danger);font-size:12px}.toast{position:fixed;right:20px;bottom:20px;z-index:100;max-width:min(420px,calc(100vw - 40px));padding:12px 15px;border-radius:var(--radius);background:#203532;color:#ffffff;box-shadow:var(--shadow);font-size:13px}.boot-panel{min-height:100vh;display:flex;align-items:center;justify-content:center;gap:10px;color:var(--muted)}.loader{width:18px;height:18px;border:2px solid var(--line-strong);border-top-color:var(--brand);border-radius:50%;animation:spin 700ms linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media (max-width:1180px){.appbar{grid-template-columns:190px minmax(320px,1fr) auto;gap:10px;padding:0 14px}.app-actions .button-quiet{display:none}.entry-layout{grid-template-columns:260px minmax(0,1fr)}.paper-stage{padding-right:14px;padding-left:14px}.score-summary{grid-template-columns:repeat(4,minmax(96px,1fr))}.weight-field{grid-column:1 / -1;min-height:64px;flex-direction:row;align-items:center;justify-content:flex-end;border-top:1px solid var(--line)}.awards-layout{grid-template-columns:1fr}}@media (max-width:860px){body{overflow:auto}.app-shell{height:auto;overflow:visible}.view-area{overflow:visible}.appbar{position:static;grid-template-columns:1fr auto;padding:10px 12px}.brand-block{grid-column:1}.view-tabs{grid-column:1 / -1;grid-row:2;height:44px;order:3}.view-tab{min-width:0;flex:1;padding:0 8px}.app-actions{grid-column:2}.app-actions .button-secondary,.app-actions .button-quiet{display:none}.progress-strip{overflow-x:auto;padding:0 12px}.compact-metric{min-width:104px;padding:0 13px}.save-state{display:none}.entry-layout{height:auto;min-height:auto;grid-template-columns:1fr}.entry-queue{height:auto;max-height:300px;border-right:0;border-bottom:1px solid var(--line)}.paper-toolbar{align-items:flex-start}.paper-stage{height:auto}.toolbar-actions{flex-wrap:wrap;justify-content:flex-end}.paper-heading{min-height:96px;padding:18px}.paper-heading h1{font-size:19px}.paper-footer{align-items:flex-start;flex-direction:column}.paper-actions{width:100%}.paper-actions .button{flex:1}.page-section{width:calc(100% - 24px);padding-top:14px}.section-header{align-items:stretch;flex-direction:column}.section-tools{align-items:stretch;flex-wrap:wrap}.segmented-control{width:100%}.segmented-control button{min-width:0;flex:1}.overview-search{width:100%}.award-group{grid-template-columns:repeat(3,1fr)}.award-group > div{grid-column:1 / -1}}@media (max-width:560px){.brand-mark{width:30px;height:30px;flex-basis:30px;font-size:18px}.brand-block div span{display:none}.button{min-height:40px}.paper-stage{padding:10px 8px 24px}.paper-toolbar{align-items:stretch;flex-direction:column}.toolbar-actions{justify-content:flex-start}.paper-heading{align-items:flex-start;flex-direction:column}.score-summary{grid-template-columns:1fr 1fr}.summary-value:nth-child(2),.summary-value:nth-child(4){border-right:0}.summary-value:nth-child(n + 3){border-top:1px solid var(--line)}.weight-field{grid-column:1 / -1}.team-form-grid{grid-template-columns:1fr}.team-form-grid label.wide{grid-column:auto}}@media (prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto !important;transition-duration:0.01ms !important;animation-duration:0.01ms !important;animation-iteration-count:1 !important}}","app.js":"import {\n  GROUPS,\n  ROAD_TASKS,\n  allowedScoresForTask,\n  buildGroupResults,\n  calculateTeam,\n  createManualEntry,\n  emptyRound,\n  formatPaperTime,\n  getEntryWorkflowStatus,\n  mergeRosterEntries,\n  normalizeText,\n  parsePaperTimeToSeconds,\n  reconcileAwardCounts,\n  suggestAwardCounts,\n  validateManualTeam,\n} from \"/shared/core.js\";\n\nconst storageKey = \"road-engineering-score-tool:v1\";\nconst app = document.querySelector(\"#app\");\nconst state = hydrateState(loadState());\nstate.awardCountsByGroup = reconcileAwardCounts(state.entries, state.awardCountsByGroup, state.awardManualGroups);\nlet teamDialogContext = { mode: \"create\", entryId: null };\nfunction debounce(fn, ms) {\n  let timer;\n  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };\n}\nconst debouncedSaveAndRender = debounce((options) => saveAndRender(options), 200);\n\nrender();\n\nfunction render(options = {}) {\n  ensureActiveEntry();\n  const model = buildViewModel();\n  app.innerHTML = `\n    <div class=\"app-shell\">\n      ${appHeader(model)}\n      ${progressStrip(model)}\n      <main class=\"view-area\">\n        ${state.view === \"overview\"\n          ? overviewView(model)\n          : state.view === \"awards\"\n            ? awardsView(model)\n            : paperEntryView(model)}\n      </main>\n      ${teamDialog()}\n    </div>\n  `;\n  bindEvents();\n  restoreViewport(options);\n}\n\nfunction buildViewModel() {\n  const statuses = new Map(state.entries.map((entry) => [entry.id, getEntryWorkflowStatus(entry)]));\n  const calculated = state.entries.map(calculateTeam);\n  const calculatedById = new Map(calculated.map((c) => [c.id, c]));\n  const groups = buildGroupResults(state.entries, state.awardCountsByGroup);\n  const reviewedCount = state.entries.filter((entry) => statuses.get(entry.id)?.key === \"reviewed\").length;\n  const paperCompleteCount = calculated.filter((c) => c.complete).length;\n  const unresolvedEntries = state.entries.filter((entry) => ![\"ready\", \"reviewed\"].includes(statuses.get(entry.id)?.key));\n\n  return {\n    statuses,\n    calculated,\n    calculatedById,\n    groups,\n    reviewedCount,\n    paperCompleteCount,\n    unresolvedEntries,\n    activeEntry: state.entries.find((entry) => entry.id === state.activeEntryId) ?? null,\n  };\n}\n\nfunction appHeader(model) {\n  return `\n    <header class=\"appbar\">\n      <div class=\"brand-block\">\n        <span class=\"brand-mark\" aria-hidden=\"true\">路</span>\n        <div>\n          <strong>道路工程</strong>\n          <span>成绩统计</span>\n        </div>\n      </div>\n      <nav class=\"view-tabs\" aria-label=\"工作区\">\n        ${viewTab(\"entry\", \"纸单录入\")}\n        ${viewTab(\"overview\", \"成绩总览\")}\n        ${viewTab(\"awards\", \"奖项与导出\")}\n      </nav>\n      <div class=\"app-actions\">\n        <button class=\"button button-primary\" data-action=\"open-create\" type=\"button\">手工建队</button>\n        <label class=\"button button-secondary ${state.busy ? \"is-disabled\" : \"\"}\">\n          导入 Excel\n          <input id=\"rosterInput\" class=\"visually-hidden\" type=\"file\" accept=\".xlsx,.xls\" ${state.busy ? \"disabled\" : \"\"}>\n        </label>\n        <a class=\"button button-quiet\" href=\"/api/template\">名单模板</a>\n      </div>\n    </header>\n  `;\n}\n\nfunction viewTab(key, label) {\n  return `<button class=\"view-tab ${state.view === key ? \"active\" : \"\"}\" data-view=\"${key}\" type=\"button\">${label}</button>`;\n}\n\nfunction progressStrip(model) {\n  const pending = Math.max(0, state.entries.length - model.reviewedCount);\n  return `\n    <section class=\"progress-strip\" aria-label=\"录入进度\">\n      ${compactMetric(\"队伍\", state.entries.length, \"\", \"teams\")}\n      ${compactMetric(\"纸单完整\", model.paperCompleteCount, \"\", \"complete\")}\n      ${compactMetric(\"已复核\", model.reviewedCount, \"\", \"reviewed\")}\n      ${compactMetric(\"待处理\", pending, pending ? \"warn\" : \"ok\", \"pending\")}\n      <span class=\"save-state\">本机自动保存</span>\n    </section>\n  `;\n}\n\nfunction compactMetric(label, value, tone = \"\", key = \"\") {\n  return `<div class=\"compact-metric ${tone}\" ${key ? `data-metric=\"${escapeAttr(key)}\"` : \"\"}><span>${label}</span><strong>${value}</strong></div>`;\n}\n\nfunction paperEntryView(model) {\n  if (!state.entries.length) {\n    return `\n      <section class=\"empty-workspace\">\n        <div class=\"empty-sheet\" aria-hidden=\"true\">\n          <span></span><span></span><span></span><span></span>\n        </div>\n        <h1>暂无队伍</h1>\n        <div class=\"empty-actions\">\n          <button class=\"button button-primary\" data-action=\"open-create\" type=\"button\">手工建队</button>\n          <label class=\"button button-secondary\">\n            导入 Excel\n            <input class=\"visually-hidden\" data-roster-input type=\"file\" accept=\".xlsx,.xls\">\n          </label>\n        </div>\n      </section>\n    `;\n  }\n\n  return `\n    <div class=\"entry-layout\">\n      ${entryQueue(model)}\n      ${paperEditor(model.activeEntry, model)}\n    </div>\n  `;\n}\n\nfunction entryQueue(model) {\n  const filtered = state.entries.filter((entry) => {\n    const status = model.statuses.get(entry.id);\n    const haystack = `${entry.number ?? \"\"}${entry.systemId ?? \"\"}${entry.serial ?? \"\"}${entry.city ?? \"\"}${entry.teamName}${entry.school ?? \"\"}${entry.studentA ?? \"\"}${entry.studentB ?? \"\"}${entry.coach ?? \"\"}${entry.coachPhone ?? \"\"}`;\n    return (state.queueGroup === \"全部\" || entry.group === state.queueGroup)\n      && (state.queueStatus === \"全部\" || status?.key === state.queueStatus)\n      && haystack.toLocaleLowerCase().includes(state.query.toLocaleLowerCase());\n  });\n\n  return `\n    <aside class=\"entry-queue\">\n      <div class=\"queue-header\">\n        <div>\n          <h2>纸单队列</h2>\n          <span>${filtered.length} / ${state.entries.length}</span>\n        </div>\n        <div class=\"queue-header-actions\">\n          <button class=\"button button-danger-quiet button-small\" data-action=\"clear-all\" type=\"button\">删除全部队伍</button>\n          <button class=\"icon-button\" data-action=\"open-create\" type=\"button\" title=\"手工建队\" aria-label=\"手工建队\">+</button>\n        </div>\n      </div>\n      <div class=\"queue-filters\">\n        <input id=\"queueSearch\" class=\"text-input\" value=\"${escapeAttr(state.query)}\" placeholder=\"队伍 / 抽签号 / 学校 / 地市\">\n        <div class=\"filter-row\">\n          <select id=\"queueGroup\" class=\"select-input\" aria-label=\"筛选组别\">\n            ${[\"全部\", ...GROUPS].map((group) => `<option value=\"${group}\" ${state.queueGroup === group ? \"selected\" : \"\"}>${group}</option>`).join(\"\")}\n          </select>\n          <select id=\"queueStatus\" class=\"select-input\" aria-label=\"筛选状态\">\n            ${statusFilterOptions()}\n          </select>\n        </div>\n      </div>\n      <div class=\"queue-list\">\n        ${filtered.length ? filtered.map((entry) => queueItem(entry, model)).join(\"\") : `<div class=\"queue-empty\">没有匹配的队伍</div>`}\n      </div>\n    </aside>\n  `;\n}\n\nfunction statusFilterOptions() {\n  const options = [\n    [\"全部\", \"全部状态\"],\n    [\"unstarted\", \"未录入\"],\n    [\"in-progress\", \"录入中\"],\n    [\"needs-weight\", \"待补重量\"],\n    [\"ready\", \"待复核\"],\n    [\"reviewed\", \"已确认\"],\n    [\"invalid\", \"有问题\"],\n  ];\n  return options.map(([value, label]) => `<option value=\"${value}\" ${state.queueStatus === value ? \"selected\" : \"\"}>${label}</option>`).join(\"\");\n}\n\nfunction queueItem(entry, model) {\n  const status = model.statuses.get(entry.id);\n  const calculated = model.calculatedById.get(entry.id) ?? calculateTeam(entry);\n  return `\n    <button class=\"queue-item ${entry.id === state.activeEntryId ? \"active\" : \"\"}\" data-entry-id=\"${escapeAttr(entry.id)}\" type=\"button\">\n      <span class=\"queue-item-main\">\n        <span class=\"queue-number\">${escapeHtml(entry.number || entry.group)}</span>\n        <strong>${escapeHtml(entry.teamName)}</strong>\n        <small>${escapeHtml(profileLine(entry) || \"资料待补\")}</small>\n      </span>\n      <span class=\"queue-item-side\">\n        ${statusBadge(status)}\n        <b>${calculated.complete ? calculated.totalScore : \"--\"}</b>\n      </span>\n    </button>\n  `;\n}\n\nfunction profileLine(entry) {\n  return [entry.city, entry.school, entry.coachPhone ? `教练 ${entry.coachPhone}` : \"\"]\n    .filter(Boolean)\n    .join(\" · \");\n}\n\nfunction paperEditor(entry, model) {\n  if (!entry) {\n    return `<section class=\"paper-stage\"><div class=\"queue-empty\">请选择队伍</div></section>`;\n  }\n  const status = model.statuses.get(entry.id);\n  const calculated = model.calculatedById.get(entry.id) ?? calculateTeam(entry);\n  const index = state.entries.findIndex((candidate) => candidate.id === entry.id);\n  const isFirst = index <= 0;\n  const isLast = index >= state.entries.length - 1;\n  const reviewDisabled = ![\"ready\", \"reviewed\"].includes(status.key);\n\n  return `\n    <section class=\"paper-stage\">\n      <div class=\"paper-toolbar\">\n        <span>第 ${index + 1} 张 / 共 ${state.entries.length} 张</span>\n        <div class=\"toolbar-actions\">\n          <button class=\"icon-button\" data-action=\"previous-entry\" type=\"button\" title=\"上一张纸单\" aria-label=\"上一张纸单\" ${isFirst ? \"disabled\" : \"\"}>←</button>\n          <button class=\"icon-button\" data-action=\"next-entry\" type=\"button\" title=\"下一张纸单\" aria-label=\"下一张纸单\" ${isLast ? \"disabled\" : \"\"}>→</button>\n          <button class=\"button button-quiet button-small\" data-action=\"open-edit\" type=\"button\">编辑队伍</button>\n          <button class=\"button button-danger-quiet button-small\" data-action=\"delete-entry\" type=\"button\">删除</button>\n        </div>\n      </div>\n      <article class=\"paper-sheet\">\n        <header class=\"paper-heading\">\n          <div>\n            <p>道路工程记分表</p>\n            <h1>${escapeHtml(entry.teamName)}</h1>\n            <span>${escapeHtml([entry.group, entry.number, entry.city, entry.school].filter(Boolean).join(\" · \"))}</span>\n          </div>\n          ${statusBadge(status, true)}\n        </header>\n        <div class=\"score-table-wrap\">\n          <table class=\"paper-score-table\">\n            <thead>\n              <tr>\n                <th>任务事项</th>\n                <th>允许分值</th>\n                <th>第一轮得分</th>\n                <th>第二轮得分</th>\n              </tr>\n            </thead>\n            <tbody>\n              ${ROAD_TASKS.map((task) => paperTaskRow(entry, task)).join(\"\")}\n              ${timeRow(entry)}\n            </tbody>\n          </table>\n        </div>\n        <section class=\"score-summary\">\n          ${summaryValue(\"第一轮\", calculated.complete || status.filled ? calculated.roundTotals[0] : \"--\", \"分\", \"\", \"round-0\")}\n          ${summaryValue(\"第二轮\", calculated.complete || status.filled ? calculated.roundTotals[1] : \"--\", \"分\", \"\", \"round-1\")}\n          ${summaryValue(\"总成绩\", calculated.complete ? calculated.totalScore : \"--\", \"分\", \"strong\", \"total-score\")}\n          ${summaryValue(\"总用时\", calculated.complete ? calculated.totalSeconds : \"--\", \"秒\", \"\", \"total-seconds\")}\n          <label class=\"weight-field\">\n            <span>机器人重量</span>\n            <span><input id=\"robotWeight\" data-score-field data-field=\"robotWeight\" type=\"number\" min=\"0.01\" step=\"0.01\" value=\"${escapeAttr(entry.robotWeight)}\"> kg</span>\n          </label>\n        </section>\n        <footer class=\"paper-footer\">\n          <div class=\"paper-check\">${paperCheckMessage(status)}</div>\n          <div class=\"paper-actions\">\n            <button class=\"button ${status.key === \"reviewed\" ? \"button-secondary\" : \"button-primary\"}\" data-action=\"toggle-review\" type=\"button\" ${reviewDisabled ? \"disabled\" : \"\"}>\n              ${status.key === \"reviewed\" ? \"取消复核\" : \"标记已复核\"}\n            </button>\n            <button class=\"button button-secondary\" data-action=\"next-entry\" type=\"button\" ${isLast ? \"disabled\" : \"\"}>下一张纸单</button>\n          </div>\n        </footer>\n      </article>\n    </section>\n  `;\n}\n\nfunction paperTaskRow(entry, task) {\n  const allowedScores = allowedScoresForTask(task, entry.group);\n  return `\n    <tr>\n      <td class=\"task-name\"><strong>${escapeHtml(task.name)}</strong></td>\n      <td class=\"allowed-scores\">${allowedScores.filter((score) => score > 0).join(\" / \")}</td>\n      <td>${scoreOptions(entry, 0, task)}</td>\n      <td>${scoreOptions(entry, 1, task)}</td>\n    </tr>\n  `;\n}\n\nfunction scoreOptions(entry, roundIndex, task) {\n  const allowedScores = allowedScoresForTask(task, entry.group);\n  const raw = entry.rounds?.[roundIndex]?.scores?.[task.key] ?? \"\";\n  const current = raw === 0 || raw === \"0\" ? \"/\" : String(raw);\n  const choices = [\n    { value: \"\", label: \"×\", title: \"清空该项\" },\n    { value: \"/\", label: \"/\", title: \"无得分\" },\n    ...allowedScores.filter((score) => score > 0).map((score) => ({ value: String(score), label: String(score), title: `${score}分` })),\n  ];\n  const name = `score-${entry.id}-${roundIndex}-${task.key}`;\n  return `\n    <div class=\"score-options\">\n      ${choices.map((choice, choiceIndex) => {\n        const id = `${safeId(name)}-${choiceIndex}`;\n        return `\n          <span class=\"score-choice ${choice.value === \"\" ? \"clear-choice\" : \"\"}\">\n            <input class=\"visually-hidden\" id=\"${id}\" name=\"${escapeAttr(name)}\" data-score-radio data-entry=\"${escapeAttr(entry.id)}\" data-round=\"${roundIndex}\" data-task=\"${task.key}\" type=\"radio\" value=\"${escapeAttr(choice.value)}\" ${current === choice.value ? \"checked\" : \"\"}>\n            <label for=\"${id}\" title=\"${choice.title}\">${choice.label}</label>\n          </span>\n        `;\n      }).join(\"\")}\n    </div>\n  `;\n}\n\nfunction timeRow(entry) {\n  return `\n    <tr class=\"time-row\">\n      <td class=\"task-name\"><strong>比赛用时</strong></td>\n      <td class=\"allowed-scores\">0'00''00 - 3'00''00</td>\n      ${[0, 1].map((roundIndex) => `\n        <td>\n          <label class=\"time-input\">\n            <input id=\"round-${roundIndex}-seconds\" class=\"paper-timecode-input\" data-score-field data-round=\"${roundIndex}\" data-field=\"seconds\" type=\"text\" inputmode=\"numeric\" autocomplete=\"off\" placeholder=\"0'00''00\" value=\"${escapeAttr(timeInputValue(entry.rounds[roundIndex].seconds))}\" aria-label=\"第${roundIndex + 1}轮比赛用时，格式 0'00''00\" title=\"格式：0'00''00\">\n            <span class=\"time-format-label\">分'秒''百分秒</span>\n          </label>\n        </td>\n      `).join(\"\")}\n    </tr>\n  `;\n}\n\nfunction timeInputValue(value) {\n  return formatPaperTime(value) || normalizeText(value);\n}\n\nfunction summaryValue(label, value, unit, className = \"\", key = \"\") {\n  return `<div class=\"summary-value ${className}\" ${key ? `data-summary=\"${escapeAttr(key)}\"` : \"\"}><span>${label}</span><strong>${value}</strong><small>${unit}</small></div>`;\n}\n\nfunction paperCheckMessage(status) {\n  if (status.key === \"reviewed\") {\n    return `<strong>复核完成</strong><span>修改任一成绩后将自动撤销复核状态</span>`;\n  }\n  if (status.key === \"ready\") {\n    return `<strong>纸单完整</strong><span>等待复核确认</span>`;\n  }\n  if (status.key === \"needs-weight\") {\n    return `<strong>成绩已录完</strong><span>待补机器人重量</span>`;\n  }\n  if (status.key === \"invalid\") {\n    const issue = status.issues.find((item) => item.type.startsWith(\"invalid\"));\n    return `<strong>存在异常值</strong><span>${escapeHtml(issue?.message ?? \"请检查录入内容\")}</span>`;\n  }\n  const remaining = Math.max(0, status.total - status.filled);\n  return `<strong>${status.label}</strong><span>${remaining ? `还差 ${remaining} 项` : \"\"}</span>`;\n}\n\nfunction overviewView(model) {\n  const rows = GROUPS.flatMap((group) => model.groups[group].teams.map((team) => ({ ...team, group })))\n    .filter((team) => state.overviewGroup === \"全部\" || team.group === state.overviewGroup)\n    .filter((team) => `${team.number ?? \"\"}${team.systemId ?? \"\"}${team.city ?? \"\"}${team.teamName}${team.school ?? \"\"}${team.studentA ?? \"\"}${team.studentB ?? \"\"}${team.coachPhone ?? \"\"}`.toLocaleLowerCase().includes(state.overviewQuery.toLocaleLowerCase()));\n\n  return `\n    <section class=\"page-section\">\n      <header class=\"section-header\">\n        <div>\n          <h1>成绩总览</h1>\n          <span>${rows.length} 支队伍</span>\n        </div>\n        <div class=\"section-tools\">\n          <div class=\"segmented-control\">\n            ${[\"全部\", ...GROUPS].map((group) => `<button class=\"${state.overviewGroup === group ? \"active\" : \"\"}\" data-overview-group=\"${group}\" type=\"button\">${group}</button>`).join(\"\")}\n          </div>\n          <input id=\"overviewSearch\" class=\"text-input overview-search\" value=\"${escapeAttr(state.overviewQuery)}\" placeholder=\"搜索队伍 / 抽签号 / 学校 / 地市\">\n        </div>\n      </header>\n      <div class=\"data-table-wrap\">\n        <table class=\"data-table\">\n          <thead>\n            <tr>\n              <th>组别</th><th>抽签号</th><th>地市</th><th>队伍</th><th>录入状态</th><th>第一轮</th><th>第二轮</th><th>总成绩</th><th>总用时</th><th>重量</th><th>排名</th><th>奖项</th>\n            </tr>\n          </thead>\n          <tbody>\n            ${rows.length ? rows.map((team) => overviewRow(team, model)).join(\"\") : `<tr><td colspan=\"12\" class=\"table-empty\">暂无数据</td></tr>`}\n          </tbody>\n        </table>\n      </div>\n    </section>\n  `;\n}\n\nfunction overviewRow(team, model) {\n  const status = model.statuses.get(team.id) ?? getEntryWorkflowStatus(team);\n  return `\n    <tr class=\"clickable-row\" data-open-entry=\"${escapeAttr(team.id)}\">\n      <td>${escapeHtml(team.group)}</td>\n      <td>${escapeHtml(team.number || \"--\")}</td>\n      <td>${escapeHtml(team.city || \"--\")}</td>\n      <td><strong>${escapeHtml(team.teamName)}</strong><span>${escapeHtml(team.school || \"\")}</span></td>\n      <td>${statusBadge(status)}</td>\n      <td>${team.complete ? team.roundTotals[0] : \"--\"}</td>\n      <td>${team.complete ? team.roundTotals[1] : \"--\"}</td>\n      <td class=\"number-strong\">${team.complete ? team.totalScore : \"--\"}</td>\n      <td>${team.complete ? `${team.totalSeconds} 秒` : \"--\"}</td>\n      <td>${team.robotWeight || \"--\"}</td>\n      <td>${team.rank ?? \"--\"}</td>\n      <td>${awardBadge(team.complete ? team.award : \"\")}</td>\n    </tr>\n  `;\n}\n\nfunction awardsView(model) {\n  const rankedRows = GROUPS.flatMap((group) => model.groups[group].teams.map((team) => ({ ...team, group })))\n    .filter((team) => team.complete);\n  const workflowIssues = state.entries\n    .map((entry) => ({ entry, status: model.statuses.get(entry.id) }))\n    .filter(({ status }) => status?.key !== \"reviewed\");\n\n  return `\n    <section class=\"page-section awards-page\">\n      <header class=\"section-header\">\n        <div>\n          <h1>奖项与导出</h1>\n          <span>${rankedRows.length} 支队伍进入排名</span>\n        </div>\n        <div class=\"section-tools\">\n          <button class=\"button button-secondary\" data-action=\"reset-awards\" type=\"button\">重算名额</button>\n          <button class=\"button button-primary\" data-action=\"export\" type=\"button\" ${state.entries.length && !state.busy ? \"\" : \"disabled\"}>${state.busy ? \"正在生成...\" : \"导出成绩表\"}</button>\n        </div>\n      </header>\n      <div class=\"awards-layout\">\n        <section class=\"award-settings\">\n          <div class=\"subsection-heading\">\n            <h2>奖项名额</h2>\n            <span>可手动调整</span>\n          </div>\n          <div class=\"award-groups\">\n            ${GROUPS.map((group) => awardGroup(group, model.groups[group])).join(\"\")}\n          </div>\n        </section>\n        <section class=\"review-panel\">\n          <div class=\"subsection-heading\">\n            <h2>导出前检查</h2>\n            <span>${workflowIssues.length + state.issues.length} 项待处理</span>\n          </div>\n          <div class=\"export-source-note\">\n            ${state.sourceWorkbook?.filename\n              ? `将回填：${escapeHtml(state.sourceWorkbook.filename)}`\n              : \"未导入原成绩表时，将生成同列结构的新成绩表。\"}\n          </div>\n          ${workflowIssueList(workflowIssues, state.issues)}\n        </section>\n      </div>\n      <section class=\"ranking-section\">\n        <div class=\"subsection-heading\">\n          <h2>排名预览</h2>\n          <span>总分、总用时、机器人重量</span>\n        </div>\n        <div class=\"data-table-wrap compact\">\n          <table class=\"data-table\">\n            <thead><tr><th>组别</th><th>排名</th><th>奖项</th><th>队伍</th><th>第一轮</th><th>第二轮</th><th>总成绩</th><th>总用时</th><th>重量</th></tr></thead>\n            <tbody>\n              ${rankedRows.length ? rankedRows.map((team) => `\n                <tr>\n                  <td>${escapeHtml(team.group)}</td><td>${team.rank ?? \"--\"}</td><td>${awardBadge(team.award)}</td>\n                  <td><strong>${escapeHtml(team.teamName)}</strong><span>${escapeHtml(team.school || \"\")}</span></td>\n                  <td>${team.roundTotals[0]}</td><td>${team.roundTotals[1]}</td><td class=\"number-strong\">${team.totalScore}</td>\n                  <td>${team.totalSeconds} 秒</td><td>${team.robotWeight || \"--\"}</td>\n                </tr>\n              `).join(\"\") : `<tr><td colspan=\"9\" class=\"table-empty\">暂无完整成绩</td></tr>`}\n            </tbody>\n          </table>\n        </div>\n      </section>\n      <footer class=\"danger-zone\">\n        <span>本机数据</span>\n        <button class=\"button button-danger-quiet button-small\" data-action=\"clear-all\" type=\"button\">删除全部队伍</button>\n      </footer>\n    </section>\n  `;\n}\n\nfunction awardGroup(group, result) {\n  const active = result.teams.filter((team) => team.complete && !team.eliminated).length;\n  const counts = state.awardCountsByGroup[group] ?? result.awardCounts ?? suggestAwardCounts(active);\n  return `\n    <div class=\"award-group\">\n      <div><strong>${group}</strong><span>${active} 支有效队伍</span></div>\n      <label>一等奖<input data-award-group=\"${group}\" data-award-key=\"first\" type=\"number\" min=\"0\" max=\"${active}\" value=\"${counts.first ?? 0}\"></label>\n      <label>二等奖<input data-award-group=\"${group}\" data-award-key=\"second\" type=\"number\" min=\"0\" max=\"${active}\" value=\"${counts.second ?? 0}\"></label>\n      <label>三等奖<input data-award-group=\"${group}\" data-award-key=\"third\" type=\"number\" min=\"0\" max=\"${active}\" value=\"${counts.third ?? 0}\"></label>\n    </div>\n  `;\n}\n\nfunction workflowIssueList(workflowIssues, importIssues) {\n  const items = [\n    ...workflowIssues.map(({ entry, status }) => ({\n      entryId: entry.id,\n      title: entry.teamName,\n      message: status?.key === \"ready\" ? \"待复核\" : status?.label ?? \"待处理\",\n      tone: status?.key === \"ready\" ? \"warn\" : \"danger\",\n    })),\n    ...importIssues.map((issue) => ({ title: \"名单导入\", message: issue.message, tone: \"danger\" })),\n  ];\n  if (!items.length) {\n    return `<div class=\"all-clear\"><strong>检查完成</strong><span>所有纸单均已复核</span></div>`;\n  }\n  return `<div class=\"review-list\">${items.slice(0, 80).map((item) => `\n    <button class=\"review-item ${item.tone}\" ${item.entryId ? `data-open-entry=\"${escapeAttr(item.entryId)}\"` : \"disabled\"} type=\"button\">\n      <strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.message)}</span>\n    </button>\n  `).join(\"\")}</div>`;\n}\n\nfunction teamDialog() {\n  return `\n    <dialog id=\"teamDialog\" class=\"team-dialog\">\n      <form id=\"teamForm\">\n        <header>\n          <div><span id=\"teamDialogEyebrow\">纸质成绩单</span><h2 id=\"teamDialogTitle\">手工建队</h2></div>\n          <button class=\"icon-button\" data-action=\"close-dialog\" type=\"button\" aria-label=\"关闭\" title=\"关闭\">×</button>\n        </header>\n        <div class=\"team-form-grid\">\n          <label><span>组别 *</span><select name=\"group\" required>${GROUPS.map((group) => `<option value=\"${group}\">${group}</option>`).join(\"\")}</select></label>\n          <label><span>序号</span><input name=\"serial\" autocomplete=\"off\"></label>\n          <label><span>抽签号</span><input name=\"number\" autocomplete=\"off\"></label>\n          <label><span>地市</span><input name=\"city\" autocomplete=\"off\"></label>\n          <label class=\"wide\"><span>队伍名称</span><input name=\"teamName\" autocomplete=\"off\"></label>\n          <label class=\"wide\"><span>学校全称</span><input name=\"school\" autocomplete=\"off\"></label>\n          <label><span>参赛选手 A</span><input name=\"studentA\" autocomplete=\"off\"></label>\n          <label><span>参赛选手 B</span><input name=\"studentB\" autocomplete=\"off\"></label>\n          <label><span>教练员</span><input name=\"coach\" autocomplete=\"off\"></label>\n          <label><span>教练员联系方式</span><input name=\"coachPhone\" autocomplete=\"off\" inputmode=\"tel\"></label>\n          <label class=\"wide\"><span>备注</span><input name=\"note\" autocomplete=\"off\"></label>\n        </div>\n        <div id=\"teamFormError\" class=\"form-error\" role=\"alert\"></div>\n        <footer>\n          <button class=\"button button-secondary\" data-action=\"close-dialog\" type=\"button\">取消</button>\n          <button class=\"button button-primary\" type=\"submit\">保存队伍</button>\n        </footer>\n      </form>\n    </dialog>\n  `;\n}\n\nfunction bindEvents() {\n  // 事件委托：在 app 容器上单次绑定 click 事件\n  app.onclick = (event) => {\n    const viewButton = event.target.closest(\"[data-view]\");\n    if (viewButton && app.contains(viewButton)) {\n      state.view = viewButton.dataset.view;\n      saveAndRender();\n      return;\n    }\n\n    const actionElement = event.target.closest(\"[data-action]\");\n    if (actionElement && app.contains(actionElement)) {\n      const action = actionElement.dataset.action;\n      if (action === \"open-create\") { openTeamDialog(\"create\"); return; }\n      if (action === \"open-edit\") { openTeamDialog(\"edit\", state.activeEntryId); return; }\n      if (action === \"close-dialog\") { closeTeamDialog(); return; }\n      if (action === \"previous-entry\") { navigateEntry(-1); return; }\n      if (action === \"next-entry\") { navigateEntry(1); return; }\n      if (action === \"toggle-review\") { toggleReview(); return; }\n      if (action === \"delete-entry\") { deleteEntry(); return; }\n      if (action === \"reset-awards\") { resetAwardCounts(true); return; }\n      if (action === \"export\") { exportWorkbook(); return; }\n      if (action === \"clear-all\") { clearAll(); return; }\n      return;\n    }\n\n    const entryButton = event.target.closest(\"[data-entry-id]\");\n    if (entryButton && app.contains(entryButton)) {\n      state.activeEntryId = entryButton.dataset.entryId;\n      saveAndRender();\n      return;\n    }\n\n    const overviewGroupButton = event.target.closest(\"[data-overview-group]\");\n    if (overviewGroupButton && app.contains(overviewGroupButton)) {\n      state.overviewGroup = overviewGroupButton.dataset.overviewGroup;\n      saveAndRender();\n      return;\n    }\n\n    const openEntryElement = event.target.closest(\"[data-open-entry]\");\n    if (openEntryElement && app.contains(openEntryElement)) {\n      state.activeEntryId = openEntryElement.dataset.openEntry;\n      state.view = \"entry\";\n      saveAndRender();\n      return;\n    }\n  };\n\n  // 保留直接绑定：表单、文件输入、搜索、评分控件等需要精确事件处理的元素\n  document.querySelector(\"#teamForm\")?.addEventListener(\"submit\", submitTeamForm);\n  document.querySelector(\"#rosterInput\")?.addEventListener(\"change\", importRoster);\n  document.querySelectorAll(\"[data-roster-input]\").forEach((input) => input.addEventListener(\"change\", importRoster));\n  document.querySelector(\"#queueSearch\")?.addEventListener(\"input\", updateQueueSearch);\n  document.querySelector(\"#queueGroup\")?.addEventListener(\"change\", (event) => {\n    state.queueGroup = event.target.value;\n    saveAndRender();\n  });\n  document.querySelector(\"#queueStatus\")?.addEventListener(\"change\", (event) => {\n    state.queueStatus = event.target.value;\n    saveAndRender();\n  });\n\n  document.querySelectorAll(\"[data-score-radio]\").forEach((control) => control.addEventListener(\"change\", updateScoreRadio));\n  document.querySelectorAll(\"[data-score-field]\").forEach((control) => {\n    control.addEventListener(\"input\", stageScoreField);\n    control.addEventListener(\"change\", updateScoreField);\n  });\n\n  document.querySelector(\"#overviewSearch\")?.addEventListener(\"input\", updateOverviewSearch);\n  document.querySelectorAll(\"[data-award-group]\").forEach((control) => control.addEventListener(\"input\", updateAwardCount));\n}\n\nfunction openTeamDialog(mode, entryId = null) {\n  const dialog = document.querySelector(\"#teamDialog\");\n  const form = document.querySelector(\"#teamForm\");\n  if (!dialog || !form) {\n    return;\n  }\n  teamDialogContext = { mode, entryId };\n  const entry = mode === \"edit\" ? state.entries.find((candidate) => candidate.id === entryId) : null;\n  form.reset();\n  form.elements.group.value = entry?.group ?? (GROUPS.includes(state.queueGroup) ? state.queueGroup : GROUPS[0]);\n  for (const field of [\"serial\", \"number\", \"city\", \"teamName\", \"school\", \"studentA\", \"studentB\", \"coach\", \"coachPhone\", \"note\"]) {\n    form.elements[field].value = entry?.[field] ?? \"\";\n  }\n  document.querySelector(\"#teamDialogTitle\").textContent = mode === \"edit\" ? \"编辑队伍\" : \"手工建队\";\n  document.querySelector(\"#teamFormError\").textContent = \"\";\n  dialog.showModal();\n  window.setTimeout(() => form.elements.teamName.focus(), 0);\n}\n\nfunction closeTeamDialog() {\n  document.querySelector(\"#teamDialog\")?.close();\n}\n\nfunction submitTeamForm(event) {\n  event.preventDefault();\n  const form = event.currentTarget;\n  const fields = Object.fromEntries(new FormData(form).entries());\n  fields.teamName = normalizeText(fields.teamName) || manualTeamName(fields);\n  const others = state.entries.filter((entry) => entry.id !== teamDialogContext.entryId);\n  const issues = validateManualTeam(fields, others);\n  if (issues.length) {\n    document.querySelector(\"#teamFormError\").textContent = issues[0].message;\n    form.elements[issues[0].field]?.focus();\n    return;\n  }\n\n  if (teamDialogContext.mode === \"edit\") {\n    const entry = state.entries.find((candidate) => candidate.id === teamDialogContext.entryId);\n    if (entry) {\n      const previousSystemId = entry.systemId;\n      const previousNumber = entry.number;\n      for (const field of [\"group\", \"serial\", \"number\", \"city\", \"teamName\", \"school\", \"studentA\", \"studentB\", \"coach\", \"coachPhone\", \"note\"]) {\n        entry[field] = normalizeText(fields[field]);\n      }\n      if (!previousSystemId || previousSystemId === previousNumber) {\n        entry.systemId = entry.number;\n      }\n      entry.reviewed = false;\n    }\n  } else {\n    const entry = createManualEntry(fields, state.entries.length);\n    state.entries.push(entry);\n    state.activeEntryId = entry.id;\n  }\n\n  state.view = \"entry\";\n  closeTeamDialog();\n  syncAwardCounts();\n  saveAndRender();\n}\n\nfunction manualTeamName(fields) {\n  const school = normalizeText(fields.school);\n  const students = [fields.studentA, fields.studentB].map(normalizeText).filter(Boolean).join(\"、\");\n  if (school && students) {\n    return `${school}（${students}）`;\n  }\n  return school || students || normalizeText(fields.number);\n}\n\nasync function importRoster(event) {\n  const file = event.target.files?.[0];\n  if (!file) {\n    return;\n  }\n  state.busy = true;\n  render();\n  try {\n    const base64 = await fileToBase64(file);\n    const response = await fetch(\"/api/roster\", {\n      method: \"POST\",\n      headers: { \"content-type\": \"application/json\" },\n      body: JSON.stringify({ filename: file.name, base64 }),\n    });\n    const data = await response.json();\n    if (!response.ok) {\n      throw new Error(data.error || \"名单导入失败\");\n    }\n    const merged = mergeRosterEntries(state.entries, data.validRows);\n    state.entries = merged.entries;\n    state.issues = [\n      ...data.missingColumns.map((column) => ({ message: `缺少列：${column}` })),\n      ...data.issues,\n    ];\n    state.sourceWorkbook = {\n      filename: file.name,\n      base64,\n      importedAt: new Date().toISOString(),\n    };\n    state.activeEntryId ??= state.entries[0]?.id ?? null;\n    state.view = \"entry\";\n    syncAwardCounts();\n    toast(`新增 ${data.validRows.length - merged.duplicates} 支队伍，合并 ${merged.duplicates} 支重复队伍`);\n  } catch (error) {\n    toast(error.message);\n  } finally {\n    state.busy = false;\n    saveAndRender();\n  }\n}\n\nfunction updateQueueSearch(event) {\n  state.query = event.target.value;\n  debouncedSaveAndRender({ focusId: \"queueSearch\", cursorToEnd: true });\n}\n\nfunction updateOverviewSearch(event) {\n  state.overviewQuery = event.target.value;\n  debouncedSaveAndRender({ focusId: \"overviewSearch\", cursorToEnd: true });\n}\n\nfunction updateScoreRadio(event) {\n  const control = event.currentTarget;\n  const entry = state.entries.find((candidate) => candidate.id === control.dataset.entry);\n  if (!entry) {\n    return;\n  }\n  const value = control.value;\n  entry.rounds[Number(control.dataset.round)].scores[control.dataset.task] = value === \"\" || value === \"/\" ? value : Number(value);\n  entry.reviewed = false;\n  syncAwardCounts();\n  saveState();\n  refreshActiveScoreDisplay(entry);\n}\n\nfunction updateScoreField(event) {\n  const control = event.currentTarget;\n  applyScoreField(control);\n  normalizeTimeField(control);\n  saveState();\n  refreshActiveScoreDisplay();\n}\n\nfunction stageScoreField(event) {\n  const control = event.currentTarget;\n  applyScoreField(control);\n  saveState();\n  refreshActiveScoreDisplay();\n}\n\nfunction applyScoreField(control) {\n  const entry = state.entries.find((candidate) => candidate.id === state.activeEntryId);\n  if (!entry) {\n    return;\n  }\n  if (control.dataset.field === \"robotWeight\") {\n    entry.robotWeight = control.value;\n  } else if (control.dataset.field === \"seconds\") {\n    entry.rounds[Number(control.dataset.round)].seconds = control.value;\n  }\n  entry.reviewed = false;\n  syncAwardCounts();\n}\n\nfunction normalizeTimeField(control) {\n  if (control.dataset.field !== \"seconds\") {\n    return;\n  }\n  const entry = state.entries.find((candidate) => candidate.id === state.activeEntryId);\n  if (!entry) {\n    return;\n  }\n  const seconds = parsePaperTimeToSeconds(control.value);\n  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 180) {\n    return;\n  }\n  const normalizedSeconds = Math.round((seconds + Number.EPSILON) * 100) / 100;\n  entry.rounds[Number(control.dataset.round)].seconds = normalizedSeconds;\n  control.value = formatPaperTime(normalizedSeconds);\n}\n\nfunction refreshActiveScoreDisplay(entry = state.entries.find((candidate) => candidate.id === state.activeEntryId)) {\n  if (!entry) {\n    return;\n  }\n  const status = getEntryWorkflowStatus(entry);\n  const calculated = calculateTeam(entry);\n\n  updateSummaryValue(\"round-0\", calculated.complete || status.filled ? calculated.roundTotals[0] : \"--\");\n  updateSummaryValue(\"round-1\", calculated.complete || status.filled ? calculated.roundTotals[1] : \"--\");\n  updateSummaryValue(\"total-score\", calculated.complete ? calculated.totalScore : \"--\");\n  updateSummaryValue(\"total-seconds\", calculated.complete ? calculated.totalSeconds : \"--\");\n\n  const paperStatus = document.querySelector(\".paper-heading .status-badge\");\n  if (paperStatus) {\n    paperStatus.outerHTML = statusBadge(status, true);\n  }\n  const paperCheck = document.querySelector(\".paper-check\");\n  if (paperCheck) {\n    paperCheck.innerHTML = paperCheckMessage(status);\n  }\n  refreshReviewButton(status);\n  refreshActiveQueueItem(status, calculated);\n  refreshProgressMetrics();\n}\n\nfunction updateSummaryValue(key, value) {\n  const element = document.querySelector(`[data-summary=\"${key}\"] strong`);\n  if (element) {\n    element.textContent = value;\n  }\n}\n\nfunction refreshReviewButton(status) {\n  const button = document.querySelector(\"[data-action='toggle-review']\");\n  if (!button) {\n    return;\n  }\n  const reviewDisabled = ![\"ready\", \"reviewed\"].includes(status.key);\n  button.disabled = reviewDisabled;\n  button.classList.toggle(\"button-secondary\", status.key === \"reviewed\");\n  button.classList.toggle(\"button-primary\", status.key !== \"reviewed\");\n  button.textContent = status.key === \"reviewed\" ? \"取消复核\" : \"标记已复核\";\n}\n\nfunction refreshActiveQueueItem(status, calculated) {\n  const activeItem = document.querySelector(\".queue-item.active\");\n  if (!activeItem) {\n    return;\n  }\n  const badge = activeItem.querySelector(\".status-badge\");\n  if (badge) {\n    badge.outerHTML = statusBadge(status);\n  }\n  const score = activeItem.querySelector(\".queue-item-side b\");\n  if (score) {\n    score.textContent = calculated.complete ? calculated.totalScore : \"--\";\n  }\n}\n\nfunction refreshProgressMetrics() {\n  const statuses = state.entries.map((entry) => getEntryWorkflowStatus(entry));\n  const paperCompleteCount = state.entries.map(calculateTeam).filter((team) => team.complete).length;\n  const reviewedCount = statuses.filter((status) => status.key === \"reviewed\").length;\n  const pending = Math.max(0, state.entries.length - reviewedCount);\n  updateMetricValue(\"teams\", state.entries.length);\n  updateMetricValue(\"complete\", paperCompleteCount);\n  updateMetricValue(\"reviewed\", reviewedCount);\n  updateMetricValue(\"pending\", pending);\n  document.querySelector('[data-metric=\"pending\"]')?.classList.toggle(\"warn\", Boolean(pending));\n  document.querySelector('[data-metric=\"pending\"]')?.classList.toggle(\"ok\", !pending);\n}\n\nfunction updateMetricValue(key, value) {\n  const element = document.querySelector(`[data-metric=\"${key}\"] strong`);\n  if (element) {\n    element.textContent = value;\n  }\n}\n\nfunction navigateEntry(offset) {\n  const index = state.entries.findIndex((entry) => entry.id === state.activeEntryId);\n  const next = state.entries[index + offset];\n  if (next) {\n    state.activeEntryId = next.id;\n    saveAndRender();\n  }\n}\n\nfunction toggleReview() {\n  const entry = state.entries.find((candidate) => candidate.id === state.activeEntryId);\n  if (!entry) {\n    return;\n  }\n  const status = getEntryWorkflowStatus(entry);\n  if (status.key === \"reviewed\") {\n    entry.reviewed = false;\n  } else if (status.key === \"ready\") {\n    entry.reviewed = true;\n  }\n  saveAndRender();\n}\n\nfunction deleteEntry() {\n  const entry = state.entries.find((candidate) => candidate.id === state.activeEntryId);\n  if (!entry || !window.confirm(`确定删除“${entry.teamName}”及其全部成绩吗？`)) {\n    return;\n  }\n  const index = state.entries.indexOf(entry);\n  state.entries.splice(index, 1);\n  state.activeEntryId = state.entries[index]?.id ?? state.entries[index - 1]?.id ?? null;\n  syncAwardCounts();\n  saveAndRender();\n}\n\nfunction updateAwardCount(event) {\n  const control = event.currentTarget;\n  const group = control.dataset.awardGroup;\n  const key = control.dataset.awardKey;\n  state.awardCountsByGroup[group] ??= suggestAwardCounts(0);\n  state.awardCountsByGroup[group][key] = Math.max(0, Number(control.value) || 0);\n  state.awardManualGroups[group] = true;\n  saveState();\n}\n\nfunction resetAwardCounts(shouldRender = true) {\n  state.awardManualGroups = {};\n  state.awardCountsByGroup = reconcileAwardCounts(state.entries, {}, {});\n  if (shouldRender) {\n    saveAndRender();\n  }\n}\n\nfunction syncAwardCounts() {\n  state.awardCountsByGroup = reconcileAwardCounts(state.entries, state.awardCountsByGroup, state.awardManualGroups);\n}\n\nasync function exportWorkbook() {\n  if (!state.entries.length) {\n    toast(\"暂无可导出的队伍\");\n    return;\n  }\n  const unresolved = state.entries.filter((entry) => getEntryWorkflowStatus(entry).key !== \"reviewed\");\n  if (unresolved.length && !window.confirm(`仍有 ${unresolved.length} 支队伍未完成复核，继续导出草稿吗？`)) {\n    return;\n  }\n  state.busy = true;\n  render();\n  try {\n    const response = await fetch(\"/api/export\", {\n      method: \"POST\",\n      headers: { \"content-type\": \"application/json\" },\n      body: JSON.stringify({\n        entries: state.entries,\n        awardCountsByGroup: state.awardCountsByGroup,\n        sourceWorkbookBase64: state.sourceWorkbook?.base64 ?? \"\",\n      }),\n    });\n    if (!response.ok) {\n      const data = await response.json();\n      throw new Error(data.error || \"导出失败\");\n    }\n    const blob = await response.blob();\n    const url = URL.createObjectURL(blob);\n    const link = document.createElement(\"a\");\n    link.href = url;\n    link.download = \"26届省赛道路工程_成绩表.xlsx\";\n    document.body.append(link);\n    link.click();\n    link.remove();\n    URL.revokeObjectURL(url);\n    toast(\"成绩表已生成\");\n  } catch (error) {\n    toast(error.message);\n  } finally {\n    state.busy = false;\n    saveAndRender();\n  }\n}\n\nfunction clearAll() {\n  if (!state.entries.length || !window.confirm(\"确定删除全部队伍、成绩和奖项设置吗？此操作只清空本机保存的数据。\")) {\n    return;\n  }\n  state.entries = [];\n  state.activeEntryId = null;\n  state.issues = [];\n  state.awardCountsByGroup = {};\n  state.awardManualGroups = {};\n  state.sourceWorkbook = null;\n  state.query = \"\";\n  state.overviewQuery = \"\";\n  state.view = \"entry\";\n  saveAndRender();\n}\n\nfunction ensureActiveEntry() {\n  if (!state.entries.some((entry) => entry.id === state.activeEntryId)) {\n    state.activeEntryId = state.entries[0]?.id ?? null;\n  }\n}\n\nfunction hydrateState(saved) {\n  const source = saved && typeof saved === \"object\" ? saved : {};\n  const entries = Array.isArray(source.entries) ? source.entries.map(hydrateEntry) : [];\n  return {\n    entries,\n    activeEntryId: source.activeEntryId ?? entries[0]?.id ?? null,\n    view: [\"entry\", \"overview\", \"awards\"].includes(source.view) ? source.view : \"entry\",\n    queueGroup: [\"全部\", ...GROUPS].includes(source.queueGroup) ? source.queueGroup : \"全部\",\n    queueStatus: source.queueStatus ?? \"全部\",\n    query: source.query ?? \"\",\n    overviewGroup: [\"全部\", ...GROUPS].includes(source.overviewGroup) ? source.overviewGroup : \"全部\",\n    overviewQuery: source.overviewQuery ?? \"\",\n    issues: Array.isArray(source.issues) ? source.issues : [],\n    awardCountsByGroup: source.awardCountsByGroup ?? {},\n    awardManualGroups: source.awardManualGroups ?? {},\n    sourceWorkbook: source.sourceWorkbook?.base64 ? {\n      filename: source.sourceWorkbook.filename ?? \"原成绩表.xlsx\",\n      base64: source.sourceWorkbook.base64,\n      importedAt: source.sourceWorkbook.importedAt ?? \"\",\n    } : null,\n    busy: false,\n  };\n}\n\nfunction hydrateEntry(entry, index) {\n  const rounds = [0, 1].map((roundIndex) => {\n    const base = emptyRound();\n    const sourceRound = entry.rounds?.[roundIndex] ?? {};\n    return {\n      seconds: sourceRound.seconds ?? \"\",\n      scores: Object.fromEntries(ROAD_TASKS.map((task) => [task.key, sourceRound.scores?.[task.key] ?? base.scores[task.key]])),\n    };\n  });\n  return {\n    ...entry,\n    id: entry.id ?? `team-${index + 1}`,\n    group: entry.group ?? GROUPS[0],\n    teamName: entry.teamName ?? `未命名队伍${index + 1}`,\n    school: entry.school ?? \"\",\n    studentA: entry.studentA ?? \"\",\n    studentB: entry.studentB ?? \"\",\n    coach: entry.coach ?? \"\",\n    number: entry.number ?? \"\",\n    city: entry.city ?? \"\",\n    coachPhone: entry.coachPhone ?? \"\",\n    serial: entry.serial ?? \"\",\n    systemId: entry.systemId ?? \"\",\n    rawStudents: entry.rawStudents ?? \"\",\n    sourceSheet: entry.sourceSheet ?? \"\",\n    note: entry.note ?? \"\",\n    robotWeight: entry.robotWeight ?? \"\",\n    rounds,\n    reviewed: Boolean(entry.reviewed),\n    source: entry.source ?? \"excel\",\n  };\n}\n\nfunction loadState() {\n  try {\n    return JSON.parse(localStorage.getItem(storageKey));\n  } catch {\n    return null;\n  }\n}\n\nfunction saveState() {\n  localStorage.setItem(storageKey, JSON.stringify(state));\n}\n\nfunction saveAndRender(options = {}) {\n  const nextOptions = options.preserveScroll\n    ? { ...options, scrollState: captureScrollState() }\n    : options;\n  saveState();\n  render(nextOptions);\n}\n\nfunction captureScrollState() {\n  return {\n    windowX: window.scrollX,\n    windowY: window.scrollY,\n    containers: [\".view-area\", \".paper-stage\", \".queue-list\"].map((selector) => {\n      const element = document.querySelector(selector);\n      return element\n        ? { selector, scrollLeft: element.scrollLeft, scrollTop: element.scrollTop }\n        : null;\n    }).filter(Boolean),\n  };\n}\n\nfunction restoreViewport(options) {\n  window.setTimeout(() => {\n    restoreScrollState(options.scrollState);\n    restoreFocus(options);\n    restoreScrollState(options.scrollState);\n  }, 0);\n}\n\nfunction restoreScrollState(scrollState) {\n  if (!scrollState) {\n    return;\n  }\n  for (const item of scrollState.containers ?? []) {\n    const element = document.querySelector(item.selector);\n    if (element) {\n      element.scrollLeft = item.scrollLeft;\n      element.scrollTop = item.scrollTop;\n    }\n  }\n  window.scrollTo(scrollState.windowX ?? 0, scrollState.windowY ?? 0);\n}\n\nfunction restoreFocus(options) {\n  if (!options.focusId) {\n    return;\n  }\n  const element = document.getElementById(options.focusId);\n  if (!element) {\n    return;\n  }\n  try {\n    element.focus({ preventScroll: true });\n  } catch {\n    element.focus();\n  }\n  if (options.cursorToEnd && typeof element.setSelectionRange === \"function\") {\n    const end = element.value.length;\n    element.setSelectionRange(end, end);\n  }\n}\n\nfunction statusBadge(status, large = false) {\n  const value = status ?? { key: \"unstarted\", label: \"未录入\" };\n  return `<span class=\"status-badge status-${value.key} ${large ? \"large\" : \"\"}\">${escapeHtml(value.label)}</span>`;\n}\n\nfunction awardBadge(award) {\n  if (!award) {\n    return `<span class=\"award-badge neutral\">未定</span>`;\n  }\n  const tone = { 一等奖: \"first\", 二等奖: \"second\", 三等奖: \"third\", 淘汰: \"out\" }[award] ?? \"neutral\";\n  return `<span class=\"award-badge ${tone}\">${escapeHtml(award)}</span>`;\n}\n\nfunction fileToBase64(file) {\n  return new Promise((resolve, reject) => {\n    const reader = new FileReader();\n    reader.addEventListener(\"load\", () => resolve(String(reader.result).split(\",\").pop()));\n    reader.addEventListener(\"error\", () => reject(reader.error));\n    reader.readAsDataURL(file);\n  });\n}\n\nfunction toast(message) {\n  document.querySelector(\".toast\")?.remove();\n  const element = document.createElement(\"div\");\n  element.className = \"toast\";\n  element.textContent = message;\n  document.body.append(element);\n  window.setTimeout(() => element.remove(), 2800);\n}\n\nfunction safeId(value) {\n  let hash = 0;\n  for (const character of String(value)) {\n    hash = ((hash << 5) - hash + character.codePointAt(0)) | 0;\n  }\n  return `field-${Math.abs(hash)}`;\n}\n\nfunction escapeHtml(value) {\n  return String(value ?? \"\")\n    .replace(/&/g, \"&amp;\")\n    .replace(/</g, \"&lt;\")\n    .replace(/>/g, \"&gt;\")\n    .replace(/\"/g, \"&quot;\")\n    .replace(/'/g, \"&#039;\");\n}\n\nfunction escapeAttr(value) {\n  return escapeHtml(value);\n}\n","shared/core.js":"export const GROUPS = [\"小学组\", \"初中组\", \"高中组\"];\n\nexport const REQUIRED_ROSTER_COLUMNS = [\"组别\", \"队伍名称\", \"学校\", \"选手A\", \"选手B\", \"指导教师\"];\nexport const ROSTER_TEMPLATE_COLUMNS = [\"组别\", \"序号\", \"地市\", \"学校全称\", \"参赛选手\", \"教练员\", \"教练员联系方式\", \"抽签号\", \"队伍名称\", \"备注\"];\nexport const OFFICIAL_SCORE_OUTPUT_FILENAME = \"26届省赛道路工程_成绩表.xlsx\";\nexport const OFFICIAL_SCORE_SHEET_NAMES = {\n  小学组: \"小学组成绩表\",\n  初中组: \"初中组成绩表\",\n  高中组: \"高中组成绩表\",\n};\nexport const OFFICIAL_SCORE_HEADERS = [\n  \"出场\\n序号\",\n  \"系统编号\",\n  \"地市\",\n  \"学校名称\",\n  \"参赛选手\",\n  \"教练员\",\n  \"第一轮\\n分数\",\n  \"第一轮\\n完成时间\",\n  \"第二轮\\n分数\",\n  \"第二轮\\n完成时间\",\n  \"重量\",\n  \"总成绩\",\n  \"总用时\",\n  \"名次\",\n  \"等次\",\n];\n\nexport const AWARDS = {\n  first: \"一等奖\",\n  second: \"二等奖\",\n  third: \"三等奖\",\n  eliminated: \"淘汰\",\n  none: \"\",\n};\n\nexport const ENTRY_WORKFLOW_STATUS = {\n  unstarted: { key: \"unstarted\", label: \"未录入\" },\n  inProgress: { key: \"in-progress\", label: \"录入中\" },\n  needsWeight: { key: \"needs-weight\", label: \"待补重量\" },\n  ready: { key: \"ready\", label: \"待复核\" },\n  reviewed: { key: \"reviewed\", label: \"已确认\" },\n  invalid: { key: \"invalid\", label: \"有问题\" },\n};\n\nexport const ROAD_TASKS = [\n  {\n    key: \"materialRecovery\",\n    name: \"物料回收\",\n    allowedScores: [0, 30, 50],\n    description: \"指定区域50分，工程点黑框内30分。\",\n  },\n  {\n    key: \"serviceArea\",\n    name: \"建设服务区\",\n    allowedScores: [0, 30, 50, 80],\n    allowedScoresByGroup: { 小学组: [0, 30, 50] },\n    description: \"小学组按红色纸杯完成度；初高中组按颜色和层级完成度。\",\n  },\n  {\n    key: \"bridge\",\n    name: \"搭建桥梁\",\n    allowedScores: [0, 30, 50, 80],\n    allowedScoresByGroup: { 小学组: [0, 50] },\n    description: \"小学组任意两个原料堆叠50分；初高中组按堆叠与顺序计分。\",\n  },\n  {\n    key: \"tunnel\",\n    name: \"隧道挖掘\",\n    allowedScores: [0, 50],\n    description: \"驱动轮须在黑色隧道区域两侧通过。\",\n  },\n  {\n    key: \"gasStation\",\n    name: \"建设加油站\",\n    allowedScores: [0, 50],\n    description: \"泡沫球放在纸杯底上面。\",\n  },\n  {\n    key: \"gravityGate\",\n    name: \"重力闸口\",\n    allowedScores: [0, 50],\n    description: \"闸口横梁杆抬起，机器人循线通过。\",\n  },\n  {\n    key: \"autoCharging\",\n    name: \"自动充电\",\n    allowedScores: [0, 50],\n    description: \"机器人全部垂直投影在区域内且静态停止至少3秒。\",\n  },\n];\n\nconst TASK_BY_KEY = new Map(ROAD_TASKS.map((task) => [task.key, task]));\n\nexport function allowedScoresForTask(task, group) {\n  return task.allowedScoresByGroup?.[group] ?? task.allowedScores;\n}\n\nexport function normalizeText(value) {\n  return String(value ?? \"\").trim();\n}\n\nexport function toNumber(value, fallback = 0) {\n  if (value === \"/\" || value === null || value === undefined || value === \"\") {\n    return fallback;\n  }\n  const parsed = Number(value);\n  return Number.isFinite(parsed) ? parsed : fallback;\n}\n\nconst ROSTER_COLUMN_ALIASES = {\n  group: [\"组别\"],\n  teamName: [\"队伍名称\", \"队伍名\", \"队名\", \"团队名称\"],\n  school: [\"学校\", \"学校全称\", \"学校名称\"],\n  students: [\"参赛选手\", \"选手\", \"参赛学生\", \"学生\"],\n  studentA: [\"选手A\", \"选手 A\", \"学生A\", \"学生 A\"],\n  studentB: [\"选手B\", \"选手 B\", \"学生B\", \"学生 B\"],\n  coach: [\"指导教师\", \"教练员\", \"教练\", \"指导老师\"],\n  coachPhone: [\"教练员联系方式\", \"联系方式\", \"联系电话\", \"手机号码\", \"手机号\"],\n  serial: [\"序号\", \"出场序号\"],\n  systemId: [\"系统编号\"],\n  number: [\"编号\", \"队伍编号\"],\n  drawNumber: [\"抽签号\"],\n  city: [\"地市\", \"城市\", \"地区\"],\n  note: [\"备注\"],\n};\n\nconst COMPETITION_ROSTER_REQUIRED_FIELDS = [\n  [\"序号\", ROSTER_COLUMN_ALIASES.serial],\n  [\"地市\", ROSTER_COLUMN_ALIASES.city],\n  [\"学校全称\", ROSTER_COLUMN_ALIASES.school],\n  [\"参赛选手\", ROSTER_COLUMN_ALIASES.students],\n  [\"教练员\", ROSTER_COLUMN_ALIASES.coach],\n  [\"教练员联系方式\", ROSTER_COLUMN_ALIASES.coachPhone],\n];\n\nexport function validateRosterRows(rows) {\n  const presentColumns = new Set(rows.flatMap((row) => Object.keys(row ?? {})));\n  const missingColumns = detectMissingRosterColumns(presentColumns);\n  const issues = [];\n  const seen = new Set();\n  const validRows = [];\n\n  rows.forEach((row, index) => {\n    const normalized = normalizeRosterRow(row, index);\n    const rowIssues = [];\n\n    if (!normalized.school && usesCompetitionRosterColumns(presentColumns)) {\n      rowIssues.push({ type: \"empty-school\", rowNumber: normalized.rowNumber, message: \"学校全称为空\" });\n    }\n    if (!normalized.rawStudents && usesCompetitionRosterColumns(presentColumns)) {\n      rowIssues.push({ type: \"empty-students\", rowNumber: normalized.rowNumber, message: \"参赛选手为空\" });\n    }\n    if (!normalized.teamName) {\n      rowIssues.push({ type: \"empty-team\", rowNumber: normalized.rowNumber, message: \"队伍名称为空\" });\n    }\n    if (!GROUPS.includes(normalized.group)) {\n      rowIssues.push({ type: \"unknown-group\", rowNumber: normalized.rowNumber, message: `未知组别：${normalized.group || \"未填写\"}` });\n    }\n    if (normalized.teamName) {\n      const duplicateKey = rosterDuplicateKey(normalized);\n      if (seen.has(duplicateKey)) {\n        rowIssues.push({ type: \"duplicate-team\", rowNumber: normalized.rowNumber, message: `重复队伍：${normalized.teamName}` });\n      }\n      seen.add(duplicateKey);\n    }\n\n    issues.push(...rowIssues);\n    if (!missingColumns.length && !rowIssues.length && normalized.group && normalized.teamName) {\n      validRows.push({\n        id: createTeamId(normalized.group, normalized.systemId || normalized.teamName, validRows.length),\n        group: normalized.group,\n        teamName: normalized.teamName,\n        school: normalized.school,\n        studentA: normalized.studentA,\n        studentB: normalized.studentB,\n        coach: normalized.coach,\n        number: normalized.number,\n        note: normalized.note,\n        city: normalized.city,\n        coachPhone: normalized.coachPhone,\n        serial: normalized.serial,\n        systemId: normalized.systemId,\n        rawStudents: normalized.rawStudents,\n        sourceSheet: normalized.sourceSheet,\n      });\n    }\n  });\n\n  return { missingColumns, issues, validRows };\n}\n\nfunction normalizeRosterRow(row, index) {\n  const rowColumns = new Set(Object.keys(row ?? {}));\n  const isCompetitionRoster = usesCompetitionRosterColumns(rowColumns);\n  const sourceSheet = normalizeText(row?.__sheetName);\n  const rowNumber = Number(row?.__rowNumber) || index + 2;\n  const rawStudents = firstValue(row, ROSTER_COLUMN_ALIASES.students);\n  const splitStudents = splitRosterNames(rawStudents);\n  const studentA = firstValue(row, ROSTER_COLUMN_ALIASES.studentA) || splitStudents[0] || \"\";\n  const studentB = firstValue(row, ROSTER_COLUMN_ALIASES.studentB) || splitStudents.slice(1).join(\"、\");\n  const school = firstValue(row, ROSTER_COLUMN_ALIASES.school);\n  const serial = firstValue(row, ROSTER_COLUMN_ALIASES.serial);\n  const number = isCompetitionRoster\n    ? firstValue(row, ROSTER_COLUMN_ALIASES.drawNumber)\n    : firstValue(row, ROSTER_COLUMN_ALIASES.number) || firstValue(row, ROSTER_COLUMN_ALIASES.drawNumber);\n  const systemId = isCompetitionRoster ? number : firstValue(row, ROSTER_COLUMN_ALIASES.systemId);\n  const group = normalizeGroup(firstValue(row, ROSTER_COLUMN_ALIASES.group) || sourceSheet);\n  const explicitTeamName = firstValue(row, ROSTER_COLUMN_ALIASES.teamName);\n  const teamName = explicitTeamName || (isCompetitionRoster\n    ? composeTeamName(school, [studentA, studentB].filter(Boolean).join(\"、\"), number)\n    : \"\");\n\n  return {\n    rowNumber,\n    sourceSheet,\n    group,\n    teamName,\n    school,\n    studentA,\n    studentB,\n    coach: firstValue(row, ROSTER_COLUMN_ALIASES.coach),\n    number,\n    note: firstValue(row, ROSTER_COLUMN_ALIASES.note),\n    city: firstValue(row, ROSTER_COLUMN_ALIASES.city),\n    coachPhone: firstValue(row, ROSTER_COLUMN_ALIASES.coachPhone),\n    serial,\n    systemId,\n    rawStudents,\n  };\n}\n\nexport function splitRosterNames(value) {\n  return normalizeText(value)\n    .split(/[、,，;；/\\\\\\n\\r]+/)\n    .map((item) => item.trim())\n    .filter(Boolean);\n}\n\nfunction firstValue(row, aliases) {\n  for (const alias of aliases) {\n    const value = normalizeText(row?.[alias]);\n    if (value) {\n      return value;\n    }\n  }\n  return \"\";\n}\n\nfunction composeTeamName(school, students, fallback) {\n  const normalizedSchool = normalizeText(school);\n  const normalizedStudents = normalizeText(students);\n  if (normalizedSchool && normalizedStudents) {\n    return `${normalizedSchool}（${normalizedStudents}）`;\n  }\n  return normalizedSchool || normalizedStudents || normalizeText(fallback);\n}\n\nfunction normalizeGroup(value) {\n  const text = normalizeText(value);\n  if (GROUPS.includes(text)) {\n    return text;\n  }\n  if (text.includes(\"小学\")) {\n    return \"小学组\";\n  }\n  if (text.includes(\"初中\")) {\n    return \"初中组\";\n  }\n  if (text.includes(\"高中\")) {\n    return \"高中组\";\n  }\n  return text;\n}\n\nfunction detectMissingRosterColumns(presentColumns) {\n  if (usesCompetitionRosterColumns(presentColumns)) {\n    return COMPETITION_ROSTER_REQUIRED_FIELDS\n      .filter(([, aliases]) => !aliases.some((alias) => presentColumns.has(alias)))\n      .map(([label]) => label);\n  }\n  return REQUIRED_ROSTER_COLUMNS.filter((column) => !presentColumns.has(column));\n}\n\nfunction usesCompetitionRosterColumns(presentColumns) {\n  return [\n    ...ROSTER_COLUMN_ALIASES.students,\n    ...ROSTER_COLUMN_ALIASES.coachPhone,\n    ...ROSTER_COLUMN_ALIASES.city,\n    ...ROSTER_COLUMN_ALIASES.serial,\n  ].some((column) => presentColumns.has(column));\n}\n\nfunction rosterDuplicateKey(row) {\n  return `${row.group}|${row.systemId || row.teamName}`;\n}\n\nexport function createTeamId(group, teamName, index = 0) {\n  const base = `${group}-${teamName}`.replace(/\\s+/g, \"\");\n  return `${base || \"team\"}-${index + 1}`;\n}\n\nexport function emptyRound() {\n  return {\n    seconds: \"\",\n    scores: Object.fromEntries(ROAD_TASKS.map((task) => [task.key, \"\"])),\n  };\n}\n\nexport function createEntryFromRoster(row) {\n  return {\n    ...row,\n    robotWeight: \"\",\n    rounds: [emptyRound(), emptyRound()],\n    reviewed: false,\n    source: row.source ?? \"excel\",\n  };\n}\n\nexport function validateManualTeam(fields, existingEntries = []) {\n  const group = normalizeText(fields?.group);\n  const teamName = normalizeText(fields?.teamName);\n  const number = normalizeText(fields?.number);\n  const issues = [];\n\n  if (!teamName) {\n    issues.push({ type: \"empty-team\", field: \"teamName\", message: \"队伍名称不能为空\" });\n  }\n  if (!GROUPS.includes(group)) {\n    issues.push({ type: \"unknown-group\", field: \"group\", message: \"请选择小学组、初中组或高中组\" });\n  }\n  if (teamName && existingEntries.some((entry) => (\n    normalizeText(entry.group) === group && normalizeText(entry.teamName) === teamName\n  ))) {\n    issues.push({ type: \"duplicate-team\", field: \"teamName\", message: `本组已存在队伍：${teamName}` });\n  }\n  if (number && existingEntries.some((entry) => (\n    normalizeText(entry.group) === group && normalizeText(entry.number) === number\n  ))) {\n    issues.push({ type: \"duplicate-number\", field: \"number\", message: `本组已存在编号：${number}` });\n  }\n\n  return issues;\n}\n\nexport function createManualEntry(fields, index = 0) {\n  const group = normalizeText(fields?.group);\n  const teamName = normalizeText(fields?.teamName);\n  return createEntryFromRoster({\n    id: createTeamId(group, teamName, index),\n    group,\n    teamName,\n    school: normalizeText(fields?.school),\n    studentA: normalizeText(fields?.studentA),\n    studentB: normalizeText(fields?.studentB),\n    coach: normalizeText(fields?.coach),\n    number: normalizeText(fields?.number),\n    city: normalizeText(fields?.city),\n    coachPhone: normalizeText(fields?.coachPhone),\n    serial: normalizeText(fields?.serial),\n    systemId: normalizeText(fields?.systemId) || normalizeText(fields?.number),\n    note: normalizeText(fields?.note),\n    source: \"manual\",\n  });\n}\n\nexport function mergeRosterEntries(existingEntries = [], importedEntries = []) {\n  const entries = existingEntries.map((entry) => ({ ...entry }));\n  const byTeam = new Map(entries.map((entry) => [teamKey(entry), entry]));\n  const profileFields = [\"school\", \"studentA\", \"studentB\", \"coach\", \"number\", \"city\", \"coachPhone\", \"serial\", \"systemId\", \"rawStudents\", \"sourceSheet\", \"note\"];\n  let duplicates = 0;\n\n  for (const imported of importedEntries) {\n    const key = teamKey(imported);\n    const existing = byTeam.get(key);\n    if (!existing) {\n      entries.push(imported);\n      byTeam.set(key, imported);\n      continue;\n    }\n\n    duplicates += 1;\n    for (const field of profileFields) {\n      if (!normalizeText(existing[field]) && normalizeText(imported[field])) {\n        existing[field] = normalizeText(imported[field]);\n      }\n    }\n  }\n\n  return { entries, duplicates };\n}\n\nfunction teamKey(entry) {\n  return `${normalizeText(entry?.group)}|${normalizeText(entry?.systemId) || normalizeText(entry?.teamName)}`;\n}\n\nexport function calculateTeam(entry) {\n  const complete = isEntryScoreComplete(entry);\n  const rounds = [0, 1].map((roundIndex) => {\n    const sourceRound = entry.rounds?.[roundIndex] ?? {};\n    const scores = {};\n    for (const task of ROAD_TASKS) {\n      const rawScore = sourceRound.scores?.[task.key];\n      const allowedScores = allowedScoresForTask(task, entry.group ?? entry.组别);\n      scores[task.key] = allowedScores.includes(toNumber(rawScore)) ? toNumber(rawScore) : 0;\n    }\n    return {\n      seconds: secondsFromCentiseconds(sourceRound.seconds),\n      scores,\n      total: ROAD_TASKS.reduce((sum, task) => sum + scores[task.key], 0),\n    };\n  });\n  const roundTotals = rounds.map((round) => round.total);\n  const totalScore = roundTotals[0] + roundTotals[1];\n  const totalSeconds = secondsFromCentiseconds(rounds[0].seconds + rounds[1].seconds);\n  const parsedWeight = toNumber(entry.robotWeight, Number.NaN);\n  const robotWeight = Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : \"\";\n\n  return {\n    ...entry,\n    teamName: entry.teamName ?? entry.队伍名称,\n    group: entry.group ?? entry.组别,\n    school: entry.school ?? entry.学校 ?? \"\",\n    robotWeight,\n    rounds,\n    roundTotals,\n    totalScore,\n    totalSeconds,\n    complete,\n    eliminated: complete && totalScore === 0,\n  };\n}\n\nexport function isEntryScoreComplete(entry) {\n  return [0, 1].every((roundIndex) => {\n    const round = entry.rounds?.[roundIndex];\n    const seconds = parsePaperTimeToSeconds(round?.seconds);\n    if (round?.seconds === \"\" || round?.seconds === undefined || round?.seconds === null\n      || !Number.isFinite(seconds) || seconds < 0 || seconds > 180) {\n      return false;\n    }\n    return ROAD_TASKS.every((task) => {\n      const value = round?.scores?.[task.key];\n      if (value === \"/\") {\n        return true;\n      }\n      const allowedScores = allowedScoresForTask(task, entry.group ?? entry.组别);\n      return value !== \"\" && value !== undefined && value !== null\n        && allowedScores.includes(Number(value));\n    });\n  });\n}\n\nexport function validateScoreEntry(entry) {\n  const issues = [];\n\n  if (!GROUPS.includes(entry.group)) {\n    issues.push({ type: \"unknown-group\", field: \"group\", message: \"组别必须是小学组、初中组或高中组\" });\n  }\n  if (!normalizeText(entry.teamName)) {\n    issues.push({ type: \"empty-team\", field: \"teamName\", message: \"队伍名称不能为空\" });\n  }\n  if (entry.robotWeight === \"\" || entry.robotWeight === undefined || entry.robotWeight === null) {\n    issues.push({ type: \"missing-weight\", field: \"robotWeight\", message: \"机器人重量不能为空\" });\n  } else if (!Number.isFinite(Number(entry.robotWeight)) || Number(entry.robotWeight) <= 0) {\n    issues.push({ type: \"invalid-weight\", field: \"robotWeight\", message: \"机器人重量必须大于0\" });\n  }\n\n  [0, 1].forEach((roundIndex) => {\n    const round = entry.rounds?.[roundIndex] ?? {};\n    if (round.seconds === \"\" || round.seconds === undefined || round.seconds === null) {\n      issues.push({ type: \"missing-time\", field: `rounds.${roundIndex}.seconds`, message: `第${roundIndex + 1}轮用时不能为空` });\n    } else {\n      const seconds = parsePaperTimeToSeconds(round.seconds);\n      if (!Number.isFinite(seconds) || seconds < 0 || seconds > 180) {\n        issues.push({ type: \"invalid-time\", field: `rounds.${roundIndex}.seconds`, message: `第${roundIndex + 1}轮用时必须为 0'00''00 格式，且在 0'00''00 - 3'00''00 之间` });\n      }\n    }\n\n    for (const task of ROAD_TASKS) {\n      const value = round.scores?.[task.key];\n      if (value === \"\" || value === undefined || value === null) {\n        issues.push({ type: \"missing-score\", field: `rounds.${roundIndex}.scores.${task.key}`, message: `第${roundIndex + 1}轮${task.name}得分不能为空` });\n        continue;\n      }\n      if (value === \"/\") {\n        continue;\n      }\n      const score = Number(value);\n      const allowedScores = allowedScoresForTask(task, entry.group);\n      if (!allowedScores.includes(score)) {\n        issues.push({\n          type: \"invalid-score\",\n          field: `rounds.${roundIndex}.scores.${task.key}`,\n          message: `第${roundIndex + 1}轮${task.name}只能填写：${allowedScores.join(\"、\")}`,\n        });\n      }\n    }\n  });\n\n  return issues;\n}\n\nexport function getEntryWorkflowStatus(entry) {\n  const paperFields = [];\n  for (const round of entry.rounds ?? []) {\n    paperFields.push(round?.seconds);\n    for (const task of ROAD_TASKS) {\n      paperFields.push(round?.scores?.[task.key]);\n    }\n  }\n\n  const filled = paperFields.filter((value) => value !== \"\" && value !== undefined && value !== null).length;\n  const total = ROAD_TASKS.length * 2 + 2;\n  const issues = validateScoreEntry(entry);\n  const invalidIssues = issues.filter((issue) => ![\"missing-score\", \"missing-time\", \"missing-weight\"].includes(issue.type));\n\n  if (invalidIssues.length) {\n    return { ...ENTRY_WORKFLOW_STATUS.invalid, filled, total, issues };\n  }\n  if (filled === 0) {\n    return { ...ENTRY_WORKFLOW_STATUS.unstarted, filled, total, issues };\n  }\n  if (filled < total) {\n    return { ...ENTRY_WORKFLOW_STATUS.inProgress, filled, total, issues };\n  }\n  if (issues.some((issue) => issue.type === \"missing-weight\")) {\n    return { ...ENTRY_WORKFLOW_STATUS.needsWeight, filled, total, issues };\n  }\n  if (entry.reviewed) {\n    return { ...ENTRY_WORKFLOW_STATUS.reviewed, filled, total, issues };\n  }\n  return { ...ENTRY_WORKFLOW_STATUS.ready, filled, total, issues };\n}\n\nexport function rankTeams(entries) {\n  const calculated = entries.map((entry) => (entry.totalScore === undefined ? calculateTeam(entry) : entry));\n  const active = calculated\n    .filter((team) => team.complete !== false && !team.eliminated)\n    .sort((a, b) => (\n      b.totalScore - a.totalScore\n      || a.totalSeconds - b.totalSeconds\n      || weightForSort(a) - weightForSort(b)\n      || normalizeText(a.teamName).localeCompare(normalizeText(b.teamName), \"zh-Hans-CN\")\n    ))\n    .map((team, index) => ({ ...team, rank: index + 1 }));\n  const eliminated = calculated\n    .filter((team) => team.complete !== false && team.eliminated)\n    .sort((a, b) => normalizeText(a.teamName).localeCompare(normalizeText(b.teamName), \"zh-Hans-CN\"))\n    .map((team) => ({ ...team, rank: null, award: AWARDS.eliminated }));\n  const pending = calculated\n    .filter((team) => team.complete === false)\n    .sort((a, b) => normalizeText(a.teamName).localeCompare(normalizeText(b.teamName), \"zh-Hans-CN\"))\n    .map((team) => ({ ...team, rank: null, award: AWARDS.none }));\n  return [...active, ...eliminated, ...pending];\n}\n\nfunction weightForSort(team) {\n  const weight = Number(team.robotWeight);\n  return Number.isFinite(weight) && weight > 0 ? weight : Number.POSITIVE_INFINITY;\n}\n\nexport function suggestAwardCounts(activeCount) {\n  const count = Math.max(0, Number(activeCount) || 0);\n  if (count === 0) {\n    return { first: 0, second: 0, third: 0 };\n  }\n  const first = Math.round(count * 0.15);\n  const second = Math.round(count * 0.35);\n  return {\n    first,\n    second,\n    third: Math.max(0, count - first - second),\n  };\n}\n\nexport function reconcileAwardCounts(entries, currentCounts = {}, manualGroups = {}) {\n  const groups = buildGroupResults(entries, {});\n  return Object.fromEntries(GROUPS.map((group) => {\n    const activeCount = groups[group].teams.filter((team) => team.complete && !team.eliminated).length;\n    const counts = manualGroups[group]\n      ? clampAwardCounts(currentCounts[group] ?? suggestAwardCounts(activeCount), activeCount)\n      : suggestAwardCounts(activeCount);\n    return [group, counts];\n  }));\n}\n\nexport function clampAwardCounts(counts, activeCount) {\n  const first = Math.max(0, Math.trunc(Number(counts.first) || 0));\n  const second = Math.max(0, Math.trunc(Number(counts.second) || 0));\n  const third = Math.max(0, Math.min(Math.trunc(Number(counts.third) || 0), Math.max(0, activeCount - first - second)));\n  return { first, second, third };\n}\n\nexport function assignAwards(rankedTeams, countsByGroupOrCounts) {\n  const teamsByGroup = groupBy(rankedTeams, (team) => team.group);\n  const activeTeamsByGroup = new Map();\n  for (const [group, groupTeams] of teamsByGroup) {\n    activeTeamsByGroup.set(group, groupTeams.filter((candidate) => candidate.complete !== false && !candidate.eliminated));\n  }\n  const output = [];\n\n  for (const team of rankedTeams) {\n    const activeGroupTeams = activeTeamsByGroup.get(team.group) ?? [];\n    const counts = isSingleAwardCount(countsByGroupOrCounts)\n      ? clampAwardCounts(countsByGroupOrCounts, activeGroupTeams.length)\n      : clampAwardCounts(countsByGroupOrCounts?.[team.group] ?? suggestAwardCounts(activeGroupTeams.length), activeGroupTeams.length);\n\n    if (team.complete === false) {\n      output.push({ ...team, award: AWARDS.none });\n    } else if (team.eliminated) {\n      output.push({ ...team, award: AWARDS.eliminated });\n    } else if (team.rank <= counts.first) {\n      output.push({ ...team, award: AWARDS.first });\n    } else if (team.rank <= counts.first + counts.second) {\n      output.push({ ...team, award: AWARDS.second });\n    } else if (team.rank <= counts.first + counts.second + counts.third) {\n      output.push({ ...team, award: AWARDS.third });\n    } else {\n      output.push({ ...team, award: AWARDS.none });\n    }\n  }\n\n  return output;\n}\n\nexport function buildGroupResults(entries, awardCountsByGroup = {}) {\n  const calculated = entries.map(calculateTeam);\n  const byGroup = groupBy(calculated, (team) => team.group);\n  const groups = {};\n\n  for (const group of GROUPS) {\n    const ranked = rankTeams(byGroup.get(group) ?? []);\n    const activeCount = ranked.filter((team) => team.complete !== false && !team.eliminated).length;\n    const counts = awardCountsByGroup[group] ?? suggestAwardCounts(activeCount);\n    groups[group] = {\n      awardCounts: clampAwardCounts(counts, activeCount),\n      teams: assignAwards(ranked, counts),\n    };\n  }\n\n  return groups;\n}\n\nexport function buildOfficialScoreSheets(entries, awardCountsByGroup = {}, existingSheets = {}) {\n  const groups = buildGroupResults(entries, awardCountsByGroup);\n  return GROUPS.map((group) => {\n    const name = OFFICIAL_SCORE_SHEET_NAMES[group];\n    return {\n      group,\n      name,\n      rows: buildOfficialScoreRows(group, groups[group], existingScoreRows(existingSheets, name)),\n    };\n  });\n}\n\nexport function buildOfficialScoreRows(group, result, existingRows = []) {\n  const existingDataRows = existingRows\n    .slice(2)\n    .map(normalizeOfficialExistingRow)\n    .filter((row) => Array.isArray(row) && row.some((cell) => normalizeText(cell)));\n  const teamRecords = (result?.teams ?? []).map((team, index) => ({\n    team,\n    token: officialTeamToken(team, index),\n  }));\n  const lookup = buildOfficialTeamLookup(teamRecords);\n  const used = new Set();\n  const rows = [\n    [officialScoreTitle(group), ...Array.from({ length: OFFICIAL_SCORE_HEADERS.length - 1 }, () => \"\")],\n    OFFICIAL_SCORE_HEADERS,\n  ];\n\n  existingDataRows.forEach((existingRow, index) => {\n    const record = matchOfficialTeam(existingRow, index, lookup, used);\n    if (record) {\n      used.add(record.token);\n    }\n    rows.push(officialScoreDataRow(record?.team ?? null, existingRow));\n  });\n\n  for (const record of teamRecords) {\n    if (!used.has(record.token)) {\n      used.add(record.token);\n      rows.push(officialScoreDataRow(record.team, []));\n    }\n  }\n\n  return rows;\n}\n\nexport function secondsToOfficialTime(value) {\n  const centiseconds = centisecondsFromTimeValue(value);\n  if (!Number.isFinite(centiseconds) || centiseconds < 0) {\n    return \"\";\n  }\n  const minutes = Math.floor(centiseconds / 6000);\n  const remainder = centiseconds % 6000;\n  const secondPart = Math.floor(remainder / 100);\n  const hundredths = remainder % 100;\n  return minutes * 10000 + secondPart * 100 + hundredths;\n}\n\nexport function parsePaperTimeToSeconds(value) {\n  const centiseconds = centisecondsFromTimeValue(value);\n  return Number.isFinite(centiseconds) ? centiseconds / 100 : Number.NaN;\n}\n\nexport function formatPaperTime(value) {\n  const centiseconds = centisecondsFromTimeValue(value);\n  if (!Number.isFinite(centiseconds) || centiseconds < 0) {\n    return \"\";\n  }\n  const minutes = Math.floor(centiseconds / 6000);\n  const remainder = centiseconds % 6000;\n  const seconds = Math.floor(remainder / 100);\n  const hundredths = remainder % 100;\n  return `${minutes}'${String(seconds).padStart(2, \"0\")}''${String(hundredths).padStart(2, \"0\")}`;\n}\n\nfunction secondsFromCentiseconds(value) {\n  const centiseconds = centisecondsFromTimeValue(value);\n  return Number.isFinite(centiseconds) ? centiseconds / 100 : 0;\n}\n\nfunction centisecondsFromTimeValue(value) {\n  const paperTime = paperTimeToCentiseconds(value);\n  if (Number.isFinite(paperTime)) {\n    return paperTime;\n  }\n  return centisecondsFromSeconds(toNumber(value, Number.NaN));\n}\n\nfunction paperTimeToCentiseconds(value) {\n  if (value === null || value === undefined || value === \"\") {\n    return Number.NaN;\n  }\n  if (typeof value === \"number\") {\n    return Number.NaN;\n  }\n  const text = normalizeText(value)\n    .replace(/[’‘′]/g, \"'\")\n    .replace(/[“”″]/g, \"''\")\n    .replace(/毫秒|毫米|厘秒|百分秒/g, \"\")\n    .replace(/分/g, \"'\")\n    .replace(/秒/g, \"''\")\n    .replace(/\\s+/g, \"\");\n  if (!text) {\n    return Number.NaN;\n  }\n\n  const compactMatch = text.match(/^\\d{4,5}$/);\n  if (compactMatch) {\n    const padded = text.padStart(5, \"0\");\n    return paperTimePartsToCentiseconds(\n      Number(padded.slice(0, -4)),\n      Number(padded.slice(-4, -2)),\n      Number(padded.slice(-2)),\n    );\n  }\n\n  const textMatch = text.match(/^(\\d+)'(\\d{1,2})''(\\d{1,2})$/);\n  if (textMatch) {\n    return paperTimePartsToCentiseconds(Number(textMatch[1]), Number(textMatch[2]), Number(textMatch[3]));\n  }\n\n  const colonMatch = text.match(/^(\\d+):(\\d{1,2})[:.](\\d{1,2})$/);\n  if (colonMatch) {\n    return paperTimePartsToCentiseconds(Number(colonMatch[1]), Number(colonMatch[2]), Number(colonMatch[3]));\n  }\n\n  return Number.NaN;\n}\n\nfunction paperTimePartsToCentiseconds(minutes, seconds, hundredths) {\n  if (![minutes, seconds, hundredths].every(Number.isInteger)\n    || minutes < 0 || seconds < 0 || seconds > 59 || hundredths < 0 || hundredths > 99) {\n    return Number.NaN;\n  }\n  return minutes * 6000 + seconds * 100 + hundredths;\n}\n\nfunction centisecondsFromSeconds(value) {\n  const seconds = Number(value);\n  return Number.isFinite(seconds) ? Math.round((seconds + Number.EPSILON) * 100) : Number.NaN;\n}\n\nexport function officialScoreTitle(group) {\n  return `第二十六届广东省青少年机器人竞赛-道路工程比赛成绩表（${group}）`;\n}\n\nfunction isSingleAwardCount(value) {\n  return value && [\"first\", \"second\", \"third\"].some((key) => Object.hasOwn(value, key));\n}\n\nfunction existingScoreRows(existingSheets, sheetName) {\n  if (existingSheets instanceof Map) {\n    return existingSheets.get(sheetName) ?? [];\n  }\n  return existingSheets?.[sheetName] ?? [];\n}\n\nfunction buildOfficialTeamLookup(teamRecords) {\n  const bySerial = new Map();\n  const byNumber = new Map();\n  const bySystemId = new Map();\n  const byProfile = new Map();\n\n  for (const record of teamRecords) {\n    addLookupRecord(bySerial, record.team.serial, record);\n    addLookupRecord(byNumber, record.team.number, record);\n    addLookupRecord(bySystemId, record.team.systemId, record);\n    for (const key of officialProfileKeysForTeam(record.team)) {\n      addLookupRecord(byProfile, key, record, false);\n    }\n  }\n\n  return { bySerial, byNumber, bySystemId, byProfile };\n}\n\nfunction addLookupRecord(map, value, record, shouldNormalize = true) {\n  const key = shouldNormalize ? officialKeyText(value) : value;\n  if (!key) {\n    return;\n  }\n  if (!map.has(key)) {\n    map.set(key, []);\n  }\n  map.get(key).push(record);\n}\n\nfunction matchOfficialTeam(existingRow, index, lookup, used) {\n  const candidates = [\n    lookup.bySerial.get(officialKeyText(index + 1)),\n    lookup.byNumber.get(officialKeyText(existingRow[0])),\n    lookup.bySystemId.get(officialKeyText(existingRow[1])),\n    ...officialProfileKeysForExistingRow(existingRow).map((key) => lookup.byProfile.get(key)),\n  ];\n\n  for (const records of candidates) {\n    const record = firstUnusedOfficialRecord(records, used);\n    if (record) {\n      return record;\n    }\n  }\n  return null;\n}\n\nfunction firstUnusedOfficialRecord(records, used) {\n  return records?.find((record) => !used.has(record.token)) ?? null;\n}\n\nfunction officialScoreDataRow(team, existingRow = []) {\n  const complete = team && team.complete !== false;\n  const students = teamStudentsText(team);\n  const firstRoundTime = complete ? secondsToOfficialTime(team.rounds?.[0]?.seconds) : \"\";\n  const secondRoundTime = complete ? secondsToOfficialTime(team.rounds?.[1]?.seconds) : \"\";\n  const totalScore = complete ? team.totalScore ?? 0 : 0;\n  const totalTime = complete ? secondsToOfficialTime(team.totalSeconds) : 0;\n\n  return [\n    team ? normalizeText(team.number) : normalizeText(existingRow[0]),\n    officialSystemId(team, existingRow[1]),\n    officialProfileValue(team, existingRow[2], team?.city),\n    officialProfileValue(team, existingRow[3], team?.school),\n    officialProfileValue(team, existingRow[4], students),\n    officialProfileValue(team, existingRow[5], team?.coach),\n    complete ? team.roundTotals?.[0] ?? \"\" : \"\",\n    firstRoundTime,\n    complete ? team.roundTotals?.[1] ?? \"\" : \"\",\n    secondRoundTime,\n    team ? team.robotWeight ?? \"\" : \"\",\n    totalScore,\n    totalTime,\n    complete ? team.rank ?? \"\" : \"\",\n    complete ? team.award ?? \"\" : \"\",\n  ];\n}\n\nfunction normalizeOfficialExistingRow(row) {\n  if (!Array.isArray(row)) {\n    return [];\n  }\n  const first = normalizeText(row[0]);\n  const second = normalizeText(row[1]);\n  if (first && !second && normalizeText(row[2])) {\n    return [\"\", \"\", ...row.slice(2)].slice(0, OFFICIAL_SCORE_HEADERS.length);\n  }\n  if (/^D\\d{4,}$/i.test(first) && second && !/^D\\d{4,}$/i.test(second)) {\n    return [\"\", ...row].slice(0, OFFICIAL_SCORE_HEADERS.length);\n  }\n  return row;\n}\n\nfunction officialSystemId(team, existingValue) {\n  const existing = normalizeText(existingValue);\n  if (existing) {\n    return existing;\n  }\n  const systemId = normalizeText(team?.systemId);\n  return systemId && systemId !== normalizeText(team?.number) ? systemId : \"\";\n}\n\nfunction officialProfileValue(team, existingValue, fallback) {\n  return normalizeText(existingValue) || normalizeText(fallback) || (team ? \"\" : normalizeText(existingValue));\n}\n\nfunction officialProfileKeysForTeam(team) {\n  const city = officialKeyText(team?.city);\n  const school = officialKeyText(team?.school);\n  const students = officialKeyText(teamStudentsText(team));\n  const teamName = officialKeyText(team?.teamName);\n  return [\n    [city, school, students].filter(Boolean).join(\"|\"),\n    [school, students].filter(Boolean).join(\"|\"),\n    teamName,\n  ].filter(Boolean);\n}\n\nfunction officialProfileKeysForExistingRow(row) {\n  const city = officialKeyText(row[2]);\n  const school = officialKeyText(row[3]);\n  const students = officialKeyText(row[4]);\n  const teamName = officialKeyText(composeTeamName(row[3], row[4], \"\"));\n  return [\n    [city, school, students].filter(Boolean).join(\"|\"),\n    [school, students].filter(Boolean).join(\"|\"),\n    teamName,\n  ].filter(Boolean);\n}\n\nfunction teamStudentsText(team) {\n  if (!team) {\n    return \"\";\n  }\n  return normalizeText(team.rawStudents) || [team.studentA, team.studentB].map(normalizeText).filter(Boolean).join(\"、\");\n}\n\nfunction officialTeamToken(team, index) {\n  return normalizeText(team?.id)\n    || `${normalizeText(team?.group)}|${normalizeText(team?.systemId)}|${normalizeText(team?.teamName)}|${index}`;\n}\n\nfunction officialKeyText(value) {\n  return normalizeText(value).replace(/\\s+/g, \"\").toLocaleLowerCase();\n}\n\nfunction groupBy(items, getKey) {\n  const map = new Map();\n  for (const item of items) {\n    const key = getKey(item);\n    if (!map.has(key)) {\n      map.set(key, []);\n    }\n    map.get(key).push(item);\n  }\n  return map;\n}\n"};
const xlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

const summaryHeaders = [
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

const rosterSheetPattern = /队伍抽签名单|参赛名单|名单/i;
const nonRosterSheetPattern = /成绩表|物料|贴桌面|赛板/i;

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
      const bytes = await createWorkbook(templateSheets());
      return xlsxResponse(bytes, "道路工程参赛名单模板.xlsx");
    }

    if (request.method === "POST" && url.pathname === "/api/roster") {
      return importRosterResponse(request);
    }

    if (request.method === "POST" && url.pathname === "/api/export") {
      const payload = await readJson(request);
      const exportPayload = {
        entries: Array.isArray(payload.entries) ? payload.entries : [],
        awardCountsByGroup: payload.awardCountsByGroup ?? {},
      };
      const bytes = payload.sourceWorkbookBase64
        ? await patchOfficialWorkbook(base64ToBytes(stripDataUrlPrefix(payload.sourceWorkbookBase64)), exportPayload)
        : await createWorkbook(officialScoreWorkbookSheets(exportPayload));
      return xlsxResponse(bytes, OFFICIAL_SCORE_OUTPUT_FILENAME);
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
    const sheets = await workbookMatrices(bytes);
    const rosterRows = rosterRowsFromSheets(sheets);
    const validation = validateRosterRows(rosterRows);
    return jsonResponse({
      ...validation,
      scannedSheets: sheets.map((sheet) => ({ name: sheet.name, rows: rowsFromMatrix(sheet.matrix, sheet.name).length })),
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
        ROSTER_TEMPLATE_COLUMNS,
        ["小学组", "1", "珠海市", "示例小学", "学生A、学生B", "指导教师", "13800000000", "A01", "示例小学（学生A、学生B）", ""],
        ["初中组", "2", "广州市", "示例初中", "学生A、学生B", "指导教师", "13900000000", "B01", "示例初中（学生A、学生B）", ""],
        ["高中组", "3", "深圳市", "示例高中", "学生A、学生B", "指导教师", "13700000000", "C01", "示例高中（学生A、学生B）", ""],
      ],
    },
    {
      name: "填写说明",
      rows: [
        ["道路工程参赛名单模板说明", ""],
        ["必填列", "序号、地市、学校全称、参赛选手、教练员、教练员联系方式"],
        ["组别取值", GROUPS.join("、")],
        ["队伍名称", "可选；留空时会自动用“学校全称（参赛选手）”生成。"],
        ["抽签号", "可选；导入后作为页面和导出表中的抽签号，空白时保持空白。"],
        ["参赛选手", "两名选手可用“、”或逗号分隔，会自动拆分为选手A和选手B。"],
        ["导入方式", "支持直接导入含“队伍抽签名单-小学/初中/高中”工作表的成绩表。"],
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
        ["排名", "奖项", "抽签号", "地市", "队伍名称", "学校", "第一轮总分", "第二轮总分", "总成绩", "总用时(秒)", "备注"],
        ...result.teams.map((team) => [
          team.rank ?? "",
          team.award ?? "",
          team.number ?? "",
          team.city ?? "",
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
        ["排名", "奖项", "抽签号", "地市", "队伍名称", "学校", "总成绩", "总用时(秒)", "裁判签名", "裁判长签名"],
        ...result.teams.map((team) => [
          team.rank ?? "",
          team.award ?? "",
          team.number ?? "",
          team.city ?? "",
          team.teamName,
          team.school,
          completedValue(team, team.totalScore),
          completedValue(team, team.totalSeconds),
          "",
          "",
        ]),
        ["", "", "", "", "", "", "", "", "裁判长确认：", ""],
        ["", "", "", "", "", "", "", "", "日期：", ""],
      ],
    });
  }

  return sheets;
}

function officialScoreWorkbookSheets({ entries, awardCountsByGroup }) {
  return buildOfficialScoreSheets(entries, awardCountsByGroup).map((sheet) => ({
    name: sheet.name,
    rows: sheet.rows,
  }));
}

async function patchOfficialWorkbook(sourceBytes, { entries, awardCountsByGroup }) {
  const files = await readZip(sourceBytes);
  const workbookSheets = workbookSheetPaths(files);
  const matrices = await workbookMatrices(sourceBytes);
  const existingRowsBySheet = new Map(matrices.map((sheet) => [sheet.name, sheet.matrix]));
  const scoreSheets = buildOfficialScoreSheets(entries, awardCountsByGroup, existingRowsBySheet);

  for (const scoreSheet of scoreSheets) {
    const workbookSheet = workbookSheets.find((sheet) => sheet.name === scoreSheet.name);
    if (!workbookSheet) {
      return createWorkbook(officialScoreWorkbookSheets({ entries, awardCountsByGroup }));
    }
    const originalXml = parseXmlFile(files, workbookSheet.path);
    const patchedXml = patchWorksheetData(originalXml, scoreSheet);
    files.set(workbookSheet.path, patchedXml);
  }

  return createZip([...files.entries()].map(([name, data]) => ({ name, data })));
}

function workbookSheetPaths(files) {
  const workbook = parseXmlFile(files, "xl/workbook.xml");
  const rels = parseRelationships(parseXmlFile(files, "xl/_rels/workbook.xml.rels"));
  return tags(workbook, "sheet").flatMap((tag, index) => {
    const attrs = parseAttributes(tag);
    const target = rels.get(attrs["r:id"]);
    return target ? [{ name: attrs.name || `Sheet${index + 1}`, path: normalizeWorkbookTarget(target) }] : [];
  });
}

function patchWorksheetData(xml, scoreSheet) {
  const rows = scoreSheet.rows;
  const colCount = OFFICIAL_SCORE_HEADERS.length;
  const prefix = elementPrefix(xml, "worksheet") || elementPrefix(xml, "sheetData");
  const rowStyles = worksheetRowStyles(xml);
  const fallbackStyles = fallbackCellStyles(rowStyles);
  const rowXml = rows.map((row, rowIndex) => officialWorksheetRowXml(
    row,
    rowIndex + 1,
    colCount,
    rowStyles[rowIndex],
    fallbackStyles,
    prefix,
  )).join("");
  const dimension = `<${prefix}dimension ref="A1:${columnName(colCount)}${Math.max(1, rows.length)}"/>`;
  const dimensionPattern = new RegExp(`<${qualifiedName("dimension")}\\b[^>]*(?:\\/>|>[\\s\\S]*?<\\/${qualifiedName("dimension")}>)`);
  const withDimension = xml.match(dimensionPattern)
    ? xml.replace(dimensionPattern, dimension)
    : xml.replace(new RegExp(`<${qualifiedName("worksheet")}\\b[^>]*>`), (match) => `${match}${dimension}`);
  const sheetDataPattern = new RegExp(`<${qualifiedName("sheetData")}\\b[^>]*>[\\s\\S]*?<\\/${qualifiedName("sheetData")}>`);
  return withDimension.match(sheetDataPattern)
    ? withDimension.replace(sheetDataPattern, `<${prefix}sheetData>${rowXml}</${prefix}sheetData>`)
    : withDimension.replace(new RegExp(`<${qualifiedName("worksheet")}\\b[^>]*>`), (match) => `${match}<${prefix}sheetData>${rowXml}</${prefix}sheetData>`);
}

function worksheetRowStyles(xml) {
  const rows = [];
  for (const rowBlock of fullBlocks(xml, "row")) {
    const rowTag = rowBlock.match(new RegExp(`^<${qualifiedName("row")}\\b[^>]*>`))?.[0] ?? "";
    const rowAttrs = parseAttributes(rowTag);
    const cells = new Map();
    const cellXmls = new Map();
    for (const cellTag of cellTags(rowBlock)) {
      const tagEnd = cellTag.indexOf(">");
      const attrs = parseAttributes(cellTag.slice(0, tagEnd + 1));
      const column = attrs.r ? columnIndex(attrs.r.replace(/\d+/g, "")) + 1 : cells.size + 1;
      cells.set(column, attrs.s ? attrs.s : "");
      cellXmls.set(column, cellTag);
    }
    rows[Number(rowAttrs.r || rows.length + 1) - 1] = { attrs: rowAttrs, cells, cellXmls };
  }
  return rows;
}

function fallbackCellStyles(rowStyles) {
  const styles = new Map();
  for (const row of rowStyles) {
    if (!row) {
      continue;
    }
    for (const [column, style] of row.cells) {
      if (style && !styles.has(column)) {
        styles.set(column, style);
      }
    }
  }
  if (!styles.has(1) && styles.has(2)) {
    styles.set(1, styles.get(2));
  }
  return styles;
}

function officialWorksheetRowXml(row, rowNumber, colCount, rowStyle, fallbackStyles, prefix = "") {
  const rowAttrs = officialRowAttributes(rowNumber, rowStyle?.attrs);
  const cells = Array.from({ length: colCount }, (_, index) => {
    const columnNumber = index + 1;
    const value = row[index] ?? "";
    const style = rowStyle?.cells.get(columnNumber) || fallbackStyles.get(columnNumber) || "";
    return officialCellXml(value, rowNumber, columnNumber, style, prefix, rowStyle);
  }).join("");
  return `<${prefix}row${rowAttrs}>${cells}</${prefix}row>`;
}

function officialRowAttributes(rowNumber, attrs = {}) {
  const keep = ["spans", "s", "customFormat", "ht", "customHeight", "hidden", "outlineLevel", "collapsed"];
  const pairs = [`r="${rowNumber}"`];
  for (const key of keep) {
    if (attrs[key] !== undefined) {
      pairs.push(`${key}="${escapeXml(attrs[key])}"`);
    }
  }
  return ` ${pairs.join(" ")}`;
}

function officialCellXml(value, rowNumber, columnNumber, style, prefix = "", rowStyle = null) {
  const ref = `${columnName(columnNumber)}${rowNumber}`;
  const styleAttr = style ? ` s="${escapeXml(style)}"` : "";
  if (rowNumber >= 3 && columnNumber === 2 && !normalizeText(value) && rowStyle?.cellXmls?.has(columnNumber)) {
    return rowStyle.cellXmls.get(columnNumber);
  }
  if (rowNumber >= 3 && columnNumber === 2 && !normalizeText(value) && rowStyle?.cellXmls?.has(1)) {
    return retargetCellXml(rowStyle.cellXmls.get(1), ref);
  }
  if (rowNumber >= 3 && columnNumber === 12) {
    if (rowStyle?.cellXmls?.has(columnNumber)) {
      return formulaCellWithCachedValue(rowStyle.cellXmls.get(columnNumber), value);
    }
    return formulaCellXml(ref, styleAttr, officialTotalScoreFormula(rowNumber), value, prefix);
  }
  if (rowNumber >= 3 && columnNumber === 13) {
    if (rowStyle?.cellXmls?.has(columnNumber)) {
      return formulaCellWithCachedValue(rowStyle.cellXmls.get(columnNumber), value);
    }
    return formulaCellXml(ref, styleAttr, officialTotalTimeFormula(rowNumber), value, prefix);
  }
  return valueCellXml(ref, styleAttr, value, prefix);
}

function formulaCellWithCachedValue(cellXml, cachedValue) {
  if (!/<(?:[\w.-]+:)?f\b/.test(cellXml)) {
    return cellXml;
  }
  const prefix = cellXml.match(/^<((?:[\w.-]+:)?)c\b/)?.[1] ?? "";
  const value = cachedValue === "" || cachedValue === null || cachedValue === undefined ? "" : `<${prefix}v>${Number(cachedValue)}</${prefix}v>`;
  if (/<(?:[\w.-]+:)?v>[\s\S]*?<\/(?:[\w.-]+:)?v>/.test(cellXml)) {
    return cellXml.replace(/<(?:[\w.-]+:)?v>[\s\S]*?<\/(?:[\w.-]+:)?v>/, value);
  }
  return cellXml.replace(/<\/((?:[\w.-]+:)?c)>$/, `${value}</$1>`);
}

function formulaCellXml(ref, styleAttr, formula, cachedValue, prefix = "") {
  const value = cachedValue === "" || cachedValue === null || cachedValue === undefined ? "" : `<${prefix}v>${Number(cachedValue)}</${prefix}v>`;
  return `<${prefix}c r="${ref}"${styleAttr}><${prefix}f>${escapeXml(formula)}</${prefix}f>${value}</${prefix}c>`;
}

function valueCellXml(ref, styleAttr, value, prefix = "") {
  if (value === null || value === undefined || value === "") {
    return `<${prefix}c r="${ref}"${styleAttr}/>`;
  }
  const number = Number(value);
  if (typeof value === "number" || (String(value).trim() !== "" && Number.isFinite(number) && !/^0\d+/.test(String(value)))) {
    return `<${prefix}c r="${ref}"${styleAttr}><${prefix}v>${number}</${prefix}v></${prefix}c>`;
  }
  return `<${prefix}c r="${ref}"${styleAttr} t="inlineStr"><${prefix}is><${prefix}t>${escapeXml(String(value))}</${prefix}t></${prefix}is></${prefix}c>`;
}

function retargetCellXml(cellXml, ref) {
  if (/\sr="[^"]*"/.test(cellXml)) {
    return cellXml.replace(/\sr="[^"]*"/, ` r="${ref}"`);
  }
  return cellXml.replace(/<((?:[\w.-]+:)?c)\b/, `<$1 r="${ref}"`);
}

function officialTotalScoreFormula(row) {
  return `G${row}+I${row}`;
}

function officialTotalTimeFormula(row) {
  const total = `(H${row}-INT(H${row}/10000)*4000)+(J${row}-INT(J${row}/10000)*4000)`;
  return `_xlfn.LET(_xlpm.T,${total},INT(_xlpm.T/6000)*10000+MOD(_xlpm.T,6000))`;
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

async function createWorkbook(sheets) {
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
  return await createZip(files);
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

async function workbookMatrices(xlsxBytes) {
  const files = await readZip(xlsxBytes);
  const workbook = parseXmlFile(files, "xl/workbook.xml");
  const rels = parseRelationships(parseXmlFile(files, "xl/_rels/workbook.xml.rels"));
  const sheets = tags(workbook, "sheet").map((tag) => parseAttributes(tag));
  if (!sheets.length) {
    throw new Error("工作簿没有可读取的工作表");
  }
  const sharedStrings = files.has("xl/sharedStrings.xml")
    ? parseSharedStrings(parseXmlFile(files, "xl/sharedStrings.xml"))
    : [];
  const matrices = [];

  sheets.forEach((sheet, index) => {
    const target = rels.get(sheet["r:id"]);
    if (!target) {
      return;
    }
    const sheetPath = normalizeWorkbookTarget(target);
    matrices.push({
      name: sheet.name || `Sheet${index + 1}`,
      matrix: parseWorksheet(parseXmlFile(files, sheetPath), sharedStrings),
    });
  });

  if (!matrices.length) {
    throw new Error("工作表关系缺失");
  }
  return matrices;
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
    rows.push(Array.from({ length: row.length }, (_, index) => row[index] ?? ""));
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

function rosterRowsFromSheets(sheets) {
  const candidateSheets = selectRosterSheets(sheets);
  return candidateSheets.flatMap((sheet) => rowsFromMatrix(sheet.matrix, sheet.name));
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

function selectRosterSheets(sheets) {
  const namedRosterSheets = sheets.filter((sheet) => rosterSheetPattern.test(sheet.name) && !nonRosterSheetPattern.test(sheet.name));
  if (namedRosterSheets.length) {
    return namedRosterSheets;
  }
  const plausibleSheets = sheets.filter((sheet) => !nonRosterSheetPattern.test(sheet.name));
  return plausibleSheets.length ? plausibleSheets : sheets.slice(0, 1);
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

function tags(xml, tagName) {
  return [...xml.matchAll(new RegExp(`<${qualifiedName(tagName)}\\b[^>]*\\/?>`, "g"))].map((match) => match[0]);
}

function blocks(xml, tagName) {
  return [...xml.matchAll(new RegExp(`<${qualifiedName(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${qualifiedName(tagName)}>`, "g"))].map((match) => match[1]);
}

function fullBlocks(xml, tagName) {
  return [...xml.matchAll(new RegExp(`<${qualifiedName(tagName)}\\b[^>]*>[\\s\\S]*?<\\/${qualifiedName(tagName)}>`, "g"))].map((match) => match[0]);
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

function elementPrefix(xml, tagName) {
  const match = xml.match(new RegExp(`<((?:[\\w.-]+:)?)${tagName}\\b`));
  return match?.[1] ?? "";
}

function qualifiedName(tagName) {
  return `(?:[\\w.-]+:)?${tagName}`;
}

function normalizeWorkbookTarget(target) {
  const cleaned = target.replace(/^\/+/, "");
  return cleaned.startsWith("xl/") ? cleaned : `xl/${cleaned}`;
}

async function deflateCompress(bytes) {
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null; // Fallback: compression not available
  }
}

async function createZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const now = dosDateTime(new Date());

  for (const file of files) {
    const nameBytes = textEncoder.encode(file.name);
    const rawData = typeof file.data === "string" ? textEncoder.encode(file.data) : file.data;
    const crc = crc32(rawData);
    const compressed = await deflateCompress(rawData);
    const useCompression = compressed !== null;
    const data = useCompression ? compressed : rawData;
    const method = useCompression ? 8 : 0;

    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, method, true);
    localView.setUint16(10, now.time, true);
    localView.setUint16(12, now.date, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, rawData.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    chunks.push(local, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, method, true);
    centralView.setUint16(12, now.time, true);
    centralView.setUint16(14, now.date, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, rawData.length, true);
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
