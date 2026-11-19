# SOCflow UI/UX Redesign — Design

## Intent

Redesign the full SOCflow web interface so analysts can move from alert triage into case investigation quickly, while managers can scan and administer the endpoint fleet. Preserve the two role workflows and current API/database contracts. Report only features and validation evidence present in this checkout.

## Current evidence

- The app has Manager and Analyst routes covering overview, alerts/details, cases/details, log explorer, hosts, users, rules, audit, reports, and profile.
- The global header search and notification buttons have no actions.
- `views/CaseDetail.tsx` is a placeholder, while `views/Cases.tsx` already loads case detail, alerts, notes, and status through existing APIs.
- The repo contains historical QA documentation, but its test harness and screenshots are not present in this checkout. Those historical claims will not be copied as current results.
- `git status` already contains uncommitted ATT&CK integration work (`backend/server.js`, `views/AlertDetail.tsx`, `views/Rules.tsx`, and `components/AttackKnowledge.tsx`); preserve it and include it in validation/documentation.

## Goals

- Establish one responsive, accessible interface system across all current screens and both themes.
- Improve alert and case scanability, navigation, feedback, and empty/loading/error states.
- Make global search useful as a keyboard-accessible route/action switcher, filtered to the current user's allowed routes.
- Make the notification control useful for recent alerts without exposing Analyst-only routes to Managers.
- Implement the case-detail route with the existing case, linked-alert, note, and status APIs.
- Retain the ATT&CK knowledge lookup in rule and alert contexts.
- Create root `projectDocument.md` with a source-grounded feature explanation, testing methods, actual current results, and committed screenshots from this work.

## Non-goals

- No role changes, schema migrations, data resets, new deployment assumptions, or unrelated detection/response services.
- No claims that reports are PDF/scheduled reports, that vulnerabilities are live, or that threat-map data is real unless source behavior changes and is verified.
- No presentation of old `/tmp` screenshots or historical test output as current evidence.

## Approaches

1. **Visual-only restyle.** Lowest implementation risk, but leaves the dead header controls and placeholder case route in place. Rejected because the user requested UX redesign and suitable missing features.
2. **Full visual and interaction redesign with current role flows preserved.** Rework the shared shell and all current route screens, complete the case deep link, and make search/notifications useful while keeping backend and database contracts. **Selected by the user** as the desired scope because it redesigns the whole app without changing the security/permission model.
3. **New information architecture and backend capabilities.** Could reorganize role workflows and add richer APIs, but would widen authorization and regression scope without evidence it is needed. Deferred.

## Approved design direction

Use a light enterprise console with neutral surfaces and a restrained green accent, while retaining the existing light/dark preference. Treat the app as an **annotated incident ledger**: a stable navigation rail, task-focused header, and dense but legible evidence tables with severity, status, and timestamps easy to compare. Keep alerts and active investigations prominent for Analysts; keep fleet posture, users, rule coverage, and audit access prominent for Managers. Use progressive disclosure for command-line evidence, ATT&CK context, and case timelines. Favor clear hierarchy and direct actions over decorative charts.

The user selected the light enterprise direction and code-first implementation. This changes visual treatment only; the product name, role flows, and data contracts stay fixed.

## Feature changes

- Shared shell: responsive navigation, clear active route and page titles, working route/action palette (`Ctrl/Cmd+K`), and recent-alert notification control with role-safe destinations.
- Analyst screens: triage-first overview and alert list; alert detail with command evidence and MITRE context; usable case detail deep links with linked alerts, notes, and status; searchable log workflow.
- Manager screens: fleet, users, rule configuration, audit, report summary/export, and profile redesigned around the existing operations.
- Shared behavior: loading, empty, error, disabled, success, keyboard focus, and narrow-screen states; retain persisted light/dark theme selection.

## Constraints and safety

- Preserve the existing uncommitted ATT&CK changes; do not rewrite or discard them.
- Preserve session authentication and backend role enforcement. Search choices and notification links must be role-filtered.
- Do not alter database schemas or existing customer data.
- Do not add dependencies unless a required capability is absent from the installed stack.
- Capture screenshots only from the actual current app after the documented login/test path; label simulated or unavailable service behavior honestly.

## Validation and report

- Static: TypeScript check and production frontend build.
- UI: render and interaction checks for login, both role shells, role-gated navigation, case detail, search palette, notification control, ATT&CK detail, and responsive layout; capture current screenshots for the report.
- API/data: exercise only routes/services reachable in the current environment; record unavailable dependencies and distinguish source checks from live integration proof.
- `projectDocument.md`: feature inventory and explanations, roles/workflows, test methods and commands, a dated results table, screenshot paths/captions, and limitations. No pass claim without a recorded result.

## Open implementation decisions

- Exact component boundaries, breakpoints, and chart/table treatments are implementation choices within the direction above.
- If the database/API cannot be run in this environment, UI evidence will use safe fixtures or route-level rendering and will be labeled as such; no production behavior will be implied.
