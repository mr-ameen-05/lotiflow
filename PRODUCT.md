# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

SOC analysts review alerts, investigate process activity, and manage incident cases. SOC managers oversee endpoints, users, detection rules, audit history, and reports. These user groups and workflows are reflected in the current routes and were retained as a constraint for the redesign.

## Product Purpose

SOCflow is a self-hosted security operations application for collecting Windows process telemetry and helping a small SOC detect and investigate Living-off-the-Land activity.

## Positioning

The project combines a Windows Sysmon agent, a rule-based Python detection engine, and a role-based React console focused on LOLBin behavior and investigation workflows.

## Operating Context

- Managers administer hosts, users, rules, audit records, and summary reports.
- Analysts triage alerts, open cases, record notes, link alerts, and search process logs.
- The application runs as a web frontend backed by a Node/Express API, MySQL, an optional Redis queue, a Python analyzer, and Windows endpoint agents.

## Capabilities and Constraints

- Preserve the existing Manager and Analyst roles, API contracts, database shape, and data.
- Existing UI routes include overview dashboards, alerts and alert details, cases and case details, log explorer, hosts, users, detection rules, audit, reports, and profile.
- ATT&CK knowledge is fetched server-side from MITRE's official Enterprise STIX dataset and displayed alongside mapped detection rules and alerts.
- The current Reports interface provides a summary and CSV export. No claim is made here that it generates a PDF or scheduled report.
- Deployment and production behavior must be described only when verified in the current environment.

## Brand Commitments

- Keep the existing product name, SOCflow.
- Keep the existing Manager and Analyst role names.

## Evidence on Hand

- Source: `App.tsx`, `constants.tsx`, `views/`, `backend/server.js`, `server/analyzer.py`, `database/mysql_schema.sql`, and agent files.
- Project documentation is present but includes QA dates and screenshots from an older environment; treat it as historical context, not current test evidence.
- No customer testimonials, product performance benchmarks, or production deployment evidence are present in this working session.

## Product Principles

- Put alert triage and active investigations first for analysts.
- Make fleet health and access administration easy to scan for managers.
- Keep detection evidence and ATT&CK context close to the alert and rule that use it.
- Show loading, empty, error, and restricted-access states clearly.
- Preserve role boundaries and existing stored data.
