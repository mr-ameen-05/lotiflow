# SOCflow UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Native in-session implementation. Complete tasks in order and record checks; no subagents are authorized for this task.

**Goal:** Redesign SOCflow’s existing screens as a responsive light enterprise console, preserve both roles, complete case details, and make global search and notifications useful.

**Architecture:** Keep React/Vite, Tailwind, current route structure, APIs, and database. Rework the shared shell and page components in place; add only small shared UI components for command search and notifications. Reuse `GET /api/alerts` and existing case APIs. Preserve the prior uncommitted ATT&CK work.

**Tech Stack:** React 19, TypeScript, React Router 6, Tailwind CSS, lucide-react, Node/Express APIs; no new dependency planned.

**Spec:** `docs/superpowers/specs/2026-11-12-socflow-ui-ux-redesign-design.md`

## Global Constraints

- Keep Manager and Analyst roles and the existing backend authorization model.
- Do not alter schemas, reset or seed data, or change deployment behavior.
- Preserve `backend/server.js`, `views/AlertDetail.tsx`, `views/Rules.tsx`, and `components/AttackKnowledge.tsx` changes that predate this redesign.
- Use the selected light enterprise direction and preserve the existing light/dark switch.
- `projectDocument.md` must distinguish current test results from historical documentation and source-only checks.

## Review Focus

- Manager search/notifications must not route to Analyst-only pages; validate both roles through the browser route matrix.
- Case detail must handle missing/invalid IDs and API errors; validate existing record, empty related data, and 404 paths where services permit.
- Tables, filters, dialogs, and navigation must remain usable at narrow widths and by keyboard; inspect responsive screenshots and tab/focus behavior.
- Loading, error, and empty states must not look like successful empty data; force/inspect each state in UI smoke checks.
- Report screenshots must come from the current build and be identified by route, role, viewport, and fixture/service mode.

---

### Task 1: Shared application shell and global controls

**Files:**
- Modify: `components/Layout.tsx`, `components/Sidebar.tsx`, `constants.tsx`, `index.css`
- Create: `components/CommandPalette.tsx`, `components/NotificationsPanel.tsx`

**Implementation:** Establish consistent spacing, typography, neutral surfaces, status colors, responsive navigation, and accessible focus styles. Implement a `Ctrl/Cmd+K` route/action palette containing only routes allowed for the current role. Use the existing alerts API for a recent-alert panel; direct links are Analyst-only and Manager selections remain on `/overview`.

- [ ] Build after the shell changes: `npm run build`; expected: exit 0.
- [ ] Browser smoke: both roles can navigate their allowed destinations; command palette opens/closes by keyboard and click; notifications show API data or honest loading/error/empty states.
- [ ] Capture desktop and narrow-width shell screenshots for each role for `projectDocument.md`.

### Task 2: Analyst triage and case workflows

**Files:**
- Modify: `views/AnalystDashboard.tsx`, `views/Alerts.tsx`, `views/AlertDetail.tsx`, `views/Cases.tsx`, `views/LogExplorer.tsx`
- Replace: `views/CaseDetail.tsx`
- Keep: `components/AttackKnowledge.tsx`

**Implementation:** Apply the shared system to the analyst overview, alert queue/detail, cases, and log search. Complete `/cases/:id` using `GET /api/cases/:id`, status update, and note APIs; expose linked alerts and ATT&CK knowledge where available. Reuse existing case behavior instead of creating another data path.

- [ ] Build after the route/UI changes: `npm run build`; expected: exit 0.
- [ ] Browser/API smoke: open an alert, view ATT&CK information, acknowledge it, open a case URL directly, add a note, and change case status; verify errors and empty related-alert states.
- [ ] Capture screenshots for alert list/detail and case list/detail at desktop, plus one narrow-width analyst screen.

### Task 3: Manager administration and reporting screens

**Files:**
- Modify: `views/ManagerDashboard.tsx`, `views/Hosts.tsx`, `views/Users.tsx`, `views/Rules.tsx`, `views/Audit.tsx`, `views/Reports.tsx`, `views/UserProfile.tsx`

**Implementation:** Apply shared typography, navigation, table controls, status feedback, and responsive layouts while keeping current APIs and role gates. Make Reports accurately describe its current summary and CSV export behavior.

- [ ] Build after the manager screens: `npm run build`; expected: exit 0.
- [ ] Browser/API smoke: inspect host/agent tabs, toggle a rule and restore its original value, list users/audit/reports, and export a CSV if the backend is available. Do not mutate persistent data beyond reversible UI state.
- [ ] Capture manager overview, hosts, rules, and reports screenshots at desktop and one narrow width.

### Task 4: Verification and `projectDocument.md`

**Files:**
- Create: `projectDocument.md`
- Create: `docs/screenshots/*` for current screenshots that can be reproduced
- Modify only if needed: the UI files above

- [ ] Run `npx tsc --noEmit` and `npm run build`; record exact command, date, and exit status.
- [ ] Run the available role-based UI/API smoke checks; record each pass/fail/block and its evidence. Do not claim database, backend, or production behavior if those services are unavailable.
- [ ] Capture current screenshots from the implemented build, with route/role/viewport captions; add them to the report.
- [ ] Write `projectDocument.md` with application purpose, source-verified feature map, roles, feature explanations, test methods/commands, current results, screenshot index, and limitations.
- [ ] Run `git diff --check`; expected: no whitespace errors, and confirm the prior ATT&CK edits remain in the diff.

## Execution notes

- The available computer-use browser host was unavailable during discovery. Retry after implementation; if it remains unavailable, use an installed local headless browser if present. Otherwise document the screenshot blocker instead of substituting fabricated or historical images.
- Existing project documentation reports an older QA campaign and `/tmp` screenshots; use it to find test ideas, not as current evidence.
