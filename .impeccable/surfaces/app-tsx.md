---
version: 1
slug: "app-tsx"
primary_target: "App.tsx"
related_targets: []
---

# SOCflow application-wide surface brief

## Scope and mode

Application-wide responsive web console for SOC operations.

## Audience and task

Analysts triage alerts, inspect process evidence, and progress investigations. Managers monitor fleet coverage and administer hosts, accounts, detection rules, audit history, and summary reports. Users should reach the next permitted task quickly and understand what evidence or action is available.

## Content and evidence

Use the current application API and database records. Keep severity, alert/case status, host, process command line, ATT&CK mapping, case notes, and audit facts visible where they support decisions. Never turn sample or placeholder data into a live claim.

## Constraints

Retain the SOCflow name, Manager/Analyst role boundaries, API/database contracts, and persisted light/dark preference. Default new sessions to the selected light enterprise direction. Do not change stored customer data.

## Direction contract

THESIS: SOCflow is an annotated incident ledger: investigation evidence and next actions are the reading order; generic KPI dashboards are not the center of every screen.

OWN-WORLD: Light neutral surfaces, white evidence sheets, dark readable ink, a restrained green accent, consistent severity colors, thin neutral dividers, and compact tabular data. The dark theme keeps the same hierarchy and status meaning.

STORY: Analysts move from a prioritized alert to command evidence, ATT&CK context, and a case timeline. Managers move from fleet posture to the control or report they need.

FIRST VIEWPORT: A fixed-width desktop navigation rail sits beside a compact task header. The content column begins with a clear page title and one primary action, then a narrow status summary and the first useful evidence table or investigation detail. At narrow widths the rail becomes a labeled menu and tables retain readable columns with horizontal overflow only where needed.

FORM: Annotated incident ledger, ranked fifth among seven grounded product forms: mission control console, observatory instrument panel, forensic evidence board, flight dispatch strip, annotated incident ledger, transit operations board, and broadcast index. Seed key: `1ce83ca0`. Teletext is a competitive challenger for compact indexing; retain its strict indexability without its retro palette. Decline the video-feed and microfiche forms because they obscure evidence-first work; retain their single-task focus and consistent system-wide treatment.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
