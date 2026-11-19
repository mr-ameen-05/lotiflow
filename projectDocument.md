# SOCflow — Product and Validation Report

**Report date:** 12 November 2026  
**Application:** SOCflow, a web console for living-off-the-land (LotL) detection and SOC incident operations.  
**Source scope:** Current repository source and the UI revision in this checkout. This report describes code-level capabilities; it does not certify a live installation.

## Purpose

SOCflow brings endpoint telemetry, detection alerts, investigation cases, MITRE ATT&CK technique context, fleet administration, and audit/report views into a role-based console. The frontend is a React/TypeScript single-page application built with Vite. The Express API and database provide persistent operations; a simulated in-browser service also exists for local telemetry/demo behavior.

## Roles and navigation

| Role | Screens | Capabilities represented in the application |
|---|---|---|
| Manager | Overview, Hosts, Users, Detection Rules, Audit Log, Reports, Profile | Fleet posture, agent enrollment/download, host registry, user lifecycle, detection rule controls, governance audit history, summary CSV export |
| Analyst | Overview, Alerts, Alert detail, Cases, Case detail, Log Explorer, Profile | Triage and acknowledge alerts, inspect process evidence and ATT&CK context, create and update cases, link alerts in the existing case workflow, add notes, search/export telemetry |

Protected routes in `App.tsx` retain the existing role gates. The shell offers responsive navigation, a role-filtered `Ctrl/Cmd+K` route palette, recent-alert panel, theme toggle, profile context, and sign-out.

## Feature inventory

### Shared application

- Cookie-backed login request and role-aware protected routes.
- Light enterprise console as the default; persisted light/dark preference remains available.
- Desktop sidebar and narrow-screen navigation drawer.
- Search palette: current-role destinations, text filtering, keyboard selection, Escape dismissal.
- Recent alerts panel sourced from `/api/alerts`; Analyst can open alert details. Manager alert selections return to overview.
- Keyboard focus indicators and responsive table overflow.

### Analyst workflows

- Overview with alert, severity, case, and host summaries; quick alert acknowledgement and case links.
- Alert queue with status/severity filters, text search, confidence and host context.
- Alert detail with command line, process/user/PID context, detection explanation, status action, and case navigation.
- MITRE ATT&CK Enterprise technique knowledge: backend fetches the official Enterprise STIX 2.1 bundle, filters to configured detection rule technique IDs, caches it in process memory, and returns description, tactics, platforms, source URL and fetch time. The UI offers the official technique link and loading/failure states.
- Cases with create, search, status filtering, detail selection, note entry, and status updates.
- Case detail route now reads case details, linked alerts and notes from existing APIs; it supports adding notes, closing/reopening and navigating to linked alerts.
- Sysmon process event log search with host, user, process and keyword filters; CSV export and event detail inspection.

### Manager workflows

- Governance overview with fleet, rules, alert/case metrics, recent audit context, report shortcut, and agent bundle download.
- Host and agent inventory, connectivity indicators, registration, enrollment instructions, and installer bundle download.
- User provisioning and account active/inactive controls.
- Detection rule search, enable/disable control, and inline ATT&CK technique knowledge.
- Audit log search/action filtering.
- Security report summary and CSV export.

### Operational and persistence notes

- API data is handled through the existing Express routes and database schema; this redesign did not change schema or seed/reset data.
- Theme preference and the pre-existing simulated backend store selected state in browser local storage.
- ATT&CK metadata cache is process-local and expires; if fetching MITRE fails with no cached bundle, the endpoint returns an unavailable response. This is not a durable threat-intelligence cache.
- CSV export is the report delivery mechanism currently present in the application; no PDF or scheduled report generator is represented in the current UI.

## UI/UX update

The approved direction is a light enterprise console with neutral surfaces and a restrained green security accent. The shared shell now provides role context, consistent page framing, responsive sidebar, search and notification controls. Login uses labeled, autocomplete-aware fields and no longer displays hardcoded demo credentials. Existing role flows and route boundaries remain in place. Case detail was completed against existing case APIs rather than adding another data path.

## Test methods and current results

Run from the repository root:

| Method | Command / approach | Result on 12 Nov 2026 | What it proves |
|---|---|---|---|
| TypeScript check | `npx tsc --noEmit` | Pass (exit 0) | Source type-checks under the configured TypeScript project |
| Navigation unit check | `npm test` | Pass (1 suite, 2 assertions) | Shared navigation filtering matches role and query behavior |
| Production bundle | `BUILD_OUT_DIR=/tmp/lotiflow-build npm run build` | Pass (exit 0); Vite reports a >500 kB minified JS chunk | Current frontend source bundles without touching the protected existing `dist/` output |
| Whitespace/diff validation | `git diff --check` | Pass (exit 0) | Detects whitespace errors in tracked changes |
| Local browser smoke and screenshots | Start Vite and use installed browser | Blocked: sandbox denied binding to `127.0.0.1:3001` with `listen EPERM`; browser cannot reach a local build | No current visual/runtime or screenshot claim is made |
| API/database integration | Existing API against configured backend/database | Not run: local service access is unavailable in this environment | Does not establish live API, authentication, database, MITRE network or persistent mutation behavior |

The first default `npm run build` attempt targeted the existing `dist/` and failed while Vite tried to remove a protected old CSS asset (`EACCES`). The temporary output directory build passed. No files in `dist/` were intentionally removed or overwritten. `impeccable detect --json components views index.css` returned no findings; the existing Inter font is recorded as a deliberate detector exception pending browser visual review.

## Screenshots

No screenshots are attached. The available browser host could not access the local app because the sandbox rejected the Vite listening socket. Historical screenshots or generated mockups are not presented as evidence of this implementation. To capture current screenshots, start the app in an environment that permits local browser networking and use the route/role/viewport matrix below.

| Route | Role | Suggested viewport | Evidence to capture |
|---|---|---:|---|
| `/login` | Signed out | 1440×900 and 390×844 | Light login form and mobile fit |
| `/overview` | Analyst | 1440×900 and 390×844 | Triage overview, responsive cards and nav |
| `/alerts`, `/alerts/:id` | Analyst | 1440×900 | Filters, evidence panel, ATT&CK source context |
| `/cases`, `/cases/:id` | Analyst | 1440×900 | Case workflow, linked alerts, notes and status |
| `/explorer` | Analyst | 1440×900 and 390×844 | Query controls and result overflow |
| `/overview` | Manager | 1440×900 | Governance metrics and role-specific shell |
| `/hosts`, `/rules`, `/reports` | Manager | 1440×900 and 390×844 | Fleet, rule controls and report summary |

## Manual test plan

1. Sign in as an Analyst and a Manager; verify each role sees only its established destinations and direct unauthorized routes remain blocked.
2. Use click and `Ctrl/Cmd+K` to open search; query, arrow through results, select with Enter, close with Escape; verify role-specific route results.
3. Open notifications for both roles; verify loading, populated, empty and unavailable states. Confirm Analyst alert navigation and Manager-safe destination.
4. With an available database fixture, acknowledge a new alert and inspect its detail and ATT&CK technique source link.
5. Open a valid case and a nonexistent case ID. Add a note, close/reopen the case, and follow a linked alert. Check the no-linked-alerts state.
6. As Manager, inspect hosts/users/rules/audit/reports. Toggle a rule only in a disposable test database and restore its original value; export report CSV.
7. At desktop and mobile widths, check navigation, filter controls, dialogs, tables, keyboard focus, empty states and horizontal overflow.
8. Capture screenshots only from the implementation under test and record role, route, viewport, and whether API/database data or fixtures supplied the screen.

## Known gaps and limits

- Browser visual validation and screenshots remain outstanding because local socket binding was denied by the execution environment.
- Live login, RBAC enforcement, API/database operations, ATT&CK network fetch, alert acknowledgement, and report content have not been integration-tested in this run.
- The existing frontend includes simulated telemetry behavior; it should not be mistaken for live endpoint collection.
- The ATT&CK server cache is in memory only; persistent snapshots/offline sync would need a separate product decision and storage design.
- The production bundle currently includes a large JavaScript chunk. Build passes, but code splitting/performance profiling was not part of this focused redesign.
