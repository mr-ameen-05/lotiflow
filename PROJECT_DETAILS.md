# SOCflow — Project Documentation
**Security Operations Center | LotL Attack Detection Platform**
Version 2.0.0 | Updated: June 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Software & Tools Used](#3-software--tools-used)
4. [System Architecture](#4-system-architecture)
5. [DFD — Level 0 (Context Diagram)](#5-dfd--level-0-context-diagram)
6. [DFD — Level 1 (System Decomposition)](#6-dfd--level-1-system-decomposition)
7. [Entity Relationship Diagram](#7-entity-relationship-diagram)
8. [Database Schema Reference](#8-database-schema-reference)
9. [API Reference](#9-api-reference)
10. [Detection Engine — LOLBin Rules](#10-detection-engine--lolbin-rules)
11. [User Roles & Access Control](#11-user-roles--access-control)
12. [Complete Working Flow](#12-complete-working-flow)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Security Design](#14-security-design)

---

## 1. Project Overview

SOCflow is a Security Operations Center (SOC) monitoring platform that automates the detection of **Living off the Land (LotL) attacks** — a class of attack where adversaries abuse legitimate, pre-installed Windows binaries (called **LOLBins**) instead of deploying custom malware, allowing them to blend into normal system activity.

### Core Problem
Traditional signature-based AV and SIEM tools miss LotL attacks because the processes involved (`certutil.exe`, `powershell.exe`, `mshta.exe`, etc.) are not malware — they are trusted Windows tools. SOCflow detects the *behaviour* of these tools in context.

### Core Solution
- A Python detection engine continuously polls process telemetry from enrolled Windows endpoints
- 14 hand-crafted LOLBin detection rules apply **weighted threat scoring** against process name + command line combinations
- Alerts are automatically generated, ranked by severity, and fed into a case management workflow for analyst investigation
- No external AI API, no local LLM model — pure Python logical reasoning

### Two-Role Workflow

| Role | Responsibilities |
|------|-----------------|
| **Manager** | Enroll endpoints, manage users, configure detection rules, view audit logs, download agent installer |
| **SOC Analyst** | Investigate alerts, manage cases, run log queries, add forensic notes, view vulnerability reports |

---

## 2. Tech Stack

### Frontend
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| UI Framework | React | 18.x | Component-based SPA |
| Build Tool | Vite | 5.x | Fast dev server and production bundler |
| Language | TypeScript | 5.x | Type-safe frontend code |
| Routing | React Router DOM | 6.x | Client-side role-based routing |
| Charts | Recharts | 2.x | Alert velocity, threat vector, policy charts |
| Icons | Lucide React | latest | UI icon set |
| Syntax Highlight | react-syntax-highlighter | 15.x | Log Explorer code view |
| CSS | Tailwind CSS + Custom CSS variables | 3.x | Dark SOC-themed UI |

### Backend
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | 18.x LTS | Server-side JavaScript runtime |
| Framework | Express.js | 4.18 | REST API server |
| Authentication | express-session | 1.19 | Session-based auth (HTTP-only cookies) |
| Password Hashing | bcrypt | 5.1.1 | Secure password storage (cost=10) |
| Database Client | mysql2 | 3.6.5 | MySQL connection pooling |
| Archive | adm-zip | 0.5.16 | Agent installer ZIP packaging |
| Environment | dotenv | 16.3 | Runtime configuration |
| Dev Server | nodemon | 3.0.2 | Auto-restart during development |

### Detection Engine
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Language | Python | 3.11 | Detection engine runtime |
| DB Connector | mysql-connector-python | 8.x | Direct MySQL access from engine |
| Logic | Pure Python | — | 14-rule LOLBin detection, threat scoring |

### Database
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| RDBMS | MySQL | 5.7 | Primary data store |
| DB Name | soc_dfms | — | 15 tables, all `soc_` prefixed |
| Admin UI | phpMyAdmin | latest | Database management GUI |

### Infrastructure
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Reverse Proxy | Vite (dev) / Nginx (prod) | — | Unified entry point (port 8082), request routing |

---

## 3. Software & Tools Used

### Development Environment
| Tool | Purpose |
|------|---------|
| Visual Studio Code | Primary IDE |
| Node.js 18 LTS | Backend and build toolchain |
| Python 3.11 | Detection engine development |
| Git | Source control |

### Runtime Services
| Service | Port | Role |
|---------|------|------|
| Frontend (Vite dev server) | 3001 | React SPA |
| Backend (Node.js/Express) | 5001 | REST API |
| Detection Engine (Python) | — | LotL detection, no HTTP port |
| MySQL 5.7 | 3306 | Database |
| phpMyAdmin (optional) | 8083 | DB admin panel |

### Key Libraries — Frontend (`package.json`)
```
react, react-dom, react-router-dom
recharts
lucide-react
react-syntax-highlighter
tailwindcss
typescript, vite
```

### Key Libraries — Backend (`backend/package.json`)
```
express
express-session
bcrypt
mysql2
adm-zip
cors
dotenv
nodemon (dev)
```

### Key Libraries — Engine (`server/requirements.txt`)
```
mysql-connector-python
```

### Agent Bundle (Windows Endpoint)
| File | Language | Purpose |
|------|----------|---------|
| `agent_core.py` | Python | Continuous process telemetry loop |
| `connect.py` | Python | Connection validation + enrollment |
| `install.py` | Python | Cross-platform installer |
| `install.ps1` | PowerShell | Windows-native installer |
| `simulate_attack.py` | Python | LOLBin attack simulation (demo) |
| `simulate_attack.ps1` | PowerShell | LOLBin attack simulation (demo) |

### MITRE ATT&CK Coverage
The detection engine maps every alert to a MITRE ATT&CK technique ID. Covered techniques:

| Technique ID | Name |
|-------------|------|
| T1105 | Ingress Tool Transfer |
| T1140 | Deobfuscate/Decode Files or Information |
| T1059.001 | Command and Scripting Interpreter: PowerShell |
| T1218.005 | Signed Binary Proxy Execution: Mshta |
| T1218.010 | Signed Binary Proxy Execution: Regsvr32 |
| T1047 | Windows Management Instrumentation |
| T1218.007 | Signed Binary Proxy Execution: Msiexec |
| T1218.011 | Signed Binary Proxy Execution: Rundll32 |
| T1197 | BITS Jobs |
| T1053.005 | Scheduled Task/Job: Scheduled Task |
| T1136 | Create Account |
| T1087 | Account Discovery |
| T1059.005 | Command and Scripting Interpreter: Visual Basic |

---

## 4. System Architecture

```
 ┌─────────────────────────────────────────────────────────────┐
 │                    EXTERNAL USERS                           │
 │   [Manager Browser]          [SOC Analyst Browser]          │
 └───────────────────┬──────────────────────┬──────────────────┘
                     │                      │
                     ▼                      ▼
 ┌─────────────────────────────────────────────────────────────┐
 │              Vite Proxy / Nginx  :8082                      │
 │  /api/*  →  backend:5001                                   │
 │  /*      →  frontend:3001                                  │
 └───────────────────┬──────────────────────┬──────────────────┘
                     │                      │
         ┌───────────▼──────────┐  ┌────────▼────────────────┐
         │  React SPA (Vite/TS) │  │  Node.js/Express API    │
         │  :3001               │  │  :5001                  │
         │  Role-based routing  │  │  bcrypt auth            │
         │  Manager nav items   │  │  session management     │
         │  Analyst nav items   │  │  REST endpoints         │
         └──────────────────────┘  └────────┬────────────────┘
                                            │
                              ┌─────────────▼──────────────┐
                              │     MySQL 5.7 :3306        │
                              │     DB: soc_dfms           │
                              │     15 tables              │
                              └─────────────┬──────────────┘
                                            │
                              ┌─────────────▼──────────────┐
                              │  Python Detection Engine   │
                              │  (No HTTP — polls DB)      │
                              │  14 LOLBin rules           │
                              │  Threat scoring engine     │
                              └────────────────────────────┘
                                            ▲
 ┌──────────────────────────────────────────┘
 │           WINDOWS ENDPOINTS (enrolled)
 │  ┌────────────────────────────────────┐
 │  │   SOCflow Agent (Python)           │
 │  │   - Collects running processes     │
 │  │   - Sends to /api/logs             │
 │  │   - Sends to /api/telemetry        │
 │  └──────────── POST every 10s ───────►│
 └────────────────────────────────────────┘
```

---

## 5. DFD — Level 0 (Context Diagram)

The Level 0 DFD shows the entire SOCflow system as a single process, with the external entities that interact with it.

```
                    ┌─────────────┐
                    │   MANAGER   │
                    │  (Browser)  │
                    └──────┬──────┘
                           │ Login / Manage Users
                           │ View Audit Logs
                           │ Configure Rules
                           │ Enroll Endpoints
                           ▼
  ┌──────────────┐   ┌─────────────────────────────┐   ┌──────────────────┐
  │  WINDOWS     │   │                             │   │   SOC ANALYST    │
  │  ENDPOINT    │──►│       SOCflow System        │◄──│   (Browser)      │
  │  (Agent)     │   │                             │   │                  │
  └──────────────┘   └─────────────────────────────┘   └──────────────────┘
   Process telemetry       Central Platform             Alert Investigation
   Enrollment request                                   Case Management
                                    │                   Log Queries
                                    │
                                    ▼
                        ┌─────────────────────┐
                        │    MySQL Database   │
                        │     (soc_dfms)      │
                        └─────────────────────┘

External Entities:
  [1] Manager       — Administers the platform, manages users and rules
  [2] SOC Analyst   — Investigates alerts and manages incident cases
  [3] Windows Agent — Installed on monitored endpoints, sends telemetry
  [4] MySQL DB      — Persistent data store (external to application logic)
```

**Data Flows (Level 0):**

| From | To | Data |
|------|-----|------|
| Manager | SOCflow | Login credentials, user management commands, rule configs |
| SOCflow | Manager | Dashboard stats, user list, audit logs, agent installer ZIP |
| SOC Analyst | SOCflow | Login credentials, alert acknowledgements, case notes |
| SOCflow | SOC Analyst | Alerts feed, case details, log stream, vulnerability data |
| Windows Agent | SOCflow | Enrollment request, process events (logs), CPU/RAM/disk telemetry |
| SOCflow | Windows Agent | Agent UUID (on enrollment), enrollment confirmation |
| SOCflow | MySQL DB | INSERT events, alerts, cases, notes; UPDATE alert status |
| MySQL DB | SOCflow | Process events (for engine polling), stored alerts, users |

---

## 6. DFD — Level 1 (System Decomposition)

The Level 1 DFD decomposes SOCflow into its 5 major internal subsystems.

```
 ┌──────────┐    login/pwd     ┌─────────────────────────────┐
 │ Manager  │─────────────────►│  P1: AUTH SUBSYSTEM         │
 │ Analyst  │◄─────────────────│  - POST /api/login          │
 └──────────┘  session token   │  - POST /api/logout         │
                               │  - bcrypt.compare()         │
                               │  - express-session          │
                               │  - requireAuth middleware   │
                               │  - requireRole middleware   │
                               └─────────────┬───────────────┘
                                             │ session user object
                                             ▼
 ┌──────────┐   process events  ┌─────────────────────────────┐   INSERT alerts
 │ Windows  │──────────────────►│  P2: INGESTION SUBSYSTEM    │──────────────────►┐
 │ Endpoint │◄──────────────────│  - POST /api/enroll         │                   │
 │ (Agent)  │  agent_uuid       │  - POST /api/logs           │                   │
 └──────────┘                   │  - POST /api/telemetry      │                   │
                                │  - Validates ENROLLMENT_SEC │                   │
                                │  - Writes soc_process_event │                   │
                                │  - Updates soc_agent        │                   │
                                └─────────────────────────────┘                   │
                                                                                   │
                                ┌─────────────────────────────┐◄──────────────────┘
                                │  P3: DETECTION ENGINE       │   poll soc_process_event
                                │  (Python — polls DB loop)   │──────────────────►┐
                                │  - 14 LOLBIN_RULES          │                   │
                                │  - process_name matching    │ INSERT            │
                                │  - command_line indicators  │ soc_alert_ref     │
                                │  - calculate_score()        │                   │
                                │  - score_to_severity()      │                   │
                                │  - Template explanations    │                   │
                                │  - MITRE ATT&CK tagging     │                   ▼
                                └─────────────────────────────┘   ┌──────────────────────┐
                                                                   │   MySQL: soc_dfms    │
 ┌──────────┐  GET alerts/cases  ┌─────────────────────────────┐  │  soc_process_event   │
 │  SOC     │───────────────────►│  P4: ANALYST SUBSYSTEM      │  │  soc_alert_reference │
 │ Analyst  │◄───────────────────│  - GET /api/alerts          │◄─│  soc_case            │
 └──────────┘   alert data,      │  - POST /api/alerts/:id/ack │  │  soc_case_note       │
                case details     │  - CRUD /api/cases          │  │  soc_case_alerts     │
                                 │  - POST /api/cases/:id/notes│  │  soc_acknowledgement │
                                 │  - GET /api/logs/all        │  │  soc_forensic_artifact│
                                 │  - GET /api/stats           │  │  soc_report          │
                                 └─────────────────────────────┘  │  soc_audit_log       │
                                                                   │  soc_login           │
 ┌──────────┐  GET users/rules   ┌─────────────────────────────┐  │  soc_role            │
 │ Manager  │───────────────────►│  P5: ADMIN SUBSYSTEM        │  │  soc_host            │
 └──────────┘◄───────────────────│  - GET /api/users           │  │  soc_agent           │
              audit logs,        │  - GET /api/audit-logs      │◄─│  soc_user_host       │
              user list,         │  - PUT /api/rules/:id       │  │  soc_detection_rule  │
              rules list         │  - GET /api/hosts           │  └──────────────────────┘
                                 │  - GET /api/agent/download  │
                                 │  - requireRole('Manager')   │
                                 └─────────────────────────────┘
```

### Subsystem Descriptions

**P1 — Auth Subsystem**
Manages login/logout lifecycle. On login: queries `soc_login` JOIN `soc_role`, runs `bcrypt.compare()`, creates an `express-session` with the user object `{id, name, email, role}`. All downstream requests carry this session. `requireAuth` verifies session exists. `requireRole('Manager'|'Analyst')` verifies the role claim. Failed logins are written to `soc_audit_log`.

**P2 — Ingestion Subsystem**
Accepts data from deployed Windows agents over HTTP. `/api/enroll` validates the `ENROLLMENT_SECRET`, creates or updates records in `soc_host` and `soc_agent`, returns `agent_uuid`. `/api/logs` receives batches of process events and writes them to `soc_process_event`. `/api/telemetry` receives CPU/RAM/disk metrics and updates `soc_agent.last_seen`.

**P3 — Detection Engine (Python)**
Runs as a standalone Python process with direct MySQL access — no HTTP server. Polls `soc_process_event` every 10 seconds for rows with `event_id > last_processed_id`. For each event, loops all 14 `LOLBIN_RULES`: checks if `rule['binary']` appears in `process_name` (lowercase), then checks if any `rule['indicators']` appear in `command_line` (lowercase). On match, calls `calculate_score()` (base + network/obfuscation/privilege/chaining bonuses), `score_to_severity()`, generates a template explanation, then writes to `soc_alert_reference`.

**P4 — Analyst Subsystem**
SOC Analyst-accessible endpoints. Returns alert feed with host, rule, technique enrichment. Supports alert acknowledgement (transitions status `new → open`). Full CRUD for cases: create, update status/priority, add notes, link alerts. Log Explorer queries `soc_process_event` with optional host/time filters.

**P5 — Admin Subsystem**
Manager-only endpoints (`requireRole('Manager')`). Lists all users with their roles. Returns paginated audit log from `soc_audit_log` (JOIN `soc_login` for email). Enables/disables detection rules via `PUT /api/rules/:id`. Streams the agent installer ZIP bundle (`SOCflow_Agent_Installer.zip`) for download.

---

## 7. Entity Relationship Diagram

```
 ┌─────────────────┐         ┌─────────────────────────┐
 │   soc_role      │         │      soc_login          │
 ├─────────────────┤         ├─────────────────────────┤
 │ PK role_id      │◄────────│ PK login_id             │
 │    role_name    │  1    N │ FK role_id              │
 │    description  │         │    full_name            │
 └─────────────────┘         │    email (UNIQUE)       │
                             │    phone                │
                             │    password_hash        │
                             │    status               │
                             │    created_at           │
                             │    last_login           │
                             └──────┬──────────────────┘
                                    │ 1
                          ┌─────────┘ N
                          │
              ┌───────────▼──────────────┐
              │    soc_user_host         │  (Junction)
              ├──────────────────────────┤
              │ PK id                    │
              │ FK user_id ──────────────────────────────────────────┐
              │ FK host_id ──────────►┐                              │
              │    access_level       │                              │
              └───────────────────────┼──────────────────────────────┘
                                      │
                          ┌───────────▼──────────────────────────────┐
                          │          soc_host                        │
                          ├──────────────────────────────────────────┤
                          │ PK host_id                               │
                          │    asset_name                            │
                          │    hostname (UNIQUE)                     │
                          │    ip_address                            │
                          │    os_name, os_version                   │
                          │    environment (lab|prod)                │
                          │    criticality (low|medium|high)         │
                          │    status (active|inactive|isolated)     │
                          │    created_at, last_seen                 │
                          └──┬───────────────────┬──────────────────┘
                             │ 1                 │ 1
                           N │                 N │
              ┌──────────────▼──────┐  ┌─────────▼──────────────────────┐
              │    soc_agent        │  │      soc_process_event         │
              ├─────────────────────┤  ├────────────────────────────────┤
              │ PK agent_id         │  │ PK event_id                    │
              │ FK host_id          │  │ FK host_id                     │
              │    agent_uuid (UUID)│◄─┤ FK agent_id (nullable)         │
              │    agent_name       │  │    provider (Sysmon|Security)  │
              │    agent_version    │  │    event_type                  │
              │    status           │  │    timestamp                   │
              │    last_seen        │  │    user_name                   │
              │    install_time     │  │    image_path                  │
              └────────┬────────────┘  │    process_name  ◄── ENGINE   │
                       │               │    command_line  ◄── SCANS    │
                       │               │    pid, ppid                  │
                       │               │    parent_image               │
                       │               │    hash_sha256                │
                       │               │    raw_event (JSON)           │
                       │               └────────────┬───────────────────┘
                       │                            │ 1
                       │                          N │
                       │               ┌────────────▼───────────────────┐
                       │               │    soc_alert_reference         │
                       │               ├────────────────────────────────┤
                       │               │ PK alert_id                    │
                       └───────────────┤ FK host_id                     │
                                       │ FK agent_id (nullable)         │
                                       │ FK event_ref_id (nullable)     │
                        ┌──────────────┤ FK rule_id                     │
                        │              │    severity                    │
                        │              │    description (explanation)   │
                        │              │    timestamp                   │
                        │              │    status (new|open|closed)    │
                        │              │    confidence_score (0-100)    │
                        │              │    detection_source            │
                        │              └──┬──────────────┬──────────────┘
                        │                 │ 1            │ 1
                        │               N │            N │
                        │  ┌──────────────▼──┐  ┌───────▼─────────────────┐
                        │  │ soc_case_alerts │  │  soc_acknowledgement    │
                        │  │ (Junction)      │  ├─────────────────────────┤
                        │  ├─────────────────┤  │ PK ack_id               │
                        │  │ PK id           │  │ FK alert_id             │
                        │  │ FK case_id ─────┼─►│ FK user_id              │
                        │  │ FK alert_id     │  │    ack_status           │
                        │  │    added_at     │  │    note                 │
                        │  └─────────────────┘  │    created_at           │
                        │           │            └─────────────────────────┘
                        │           ▼ N
                        │  ┌────────────────────────────────┐
                        │  │          soc_case              │
                        │  ├────────────────────────────────┤
                        │  │ PK case_id                     │
                        │  │    title, description          │
                        │  │    priority                    │
                        │  │    status (open|in_progress    │
                        │  │           |closed)             │
                        │  │ FK created_by → soc_login      │
                        │  │ FK assigned_to → soc_login     │
                        │  │    created_at, closed_at       │
                        │  └──┬─────────────┬───────────────┘
                        │     │ 1           │ 1
                        │   N │           N │
                        │  ┌──▼──────────┐ ┌▼──────────────────────────┐
                        │  │ soc_case_   │ │   soc_case_note            │
                        │  │ note        │ ├────────────────────────────┤
                        │  └─────────────┘ │ PK note_id                │
                        │                  │ FK case_id                │
                        │                  │ FK author_id → soc_login  │
                        │                  │    note_text              │
                        │                  │    created_at             │
                        │                  └────────────────────────────┘
                        │
               ┌────────▼───────────────────────┐
               │   soc_detection_rule            │
               ├────────────────────────────────┤
               │ PK rule_id                      │
               │    rule_name (UNIQUE)           │
               │    description                  │
               │    technique (MITRE ATT&CK ID)  │
               │    severity_default             │
               │    enabled (BOOLEAN)            │
               │    logic_type (keyword)         │
               │    rule_content                 │
               │    created_at, updated_at       │
               └────────────────────────────────┘

Additional standalone tables:

 soc_forensic_artifact     soc_report              soc_audit_log
 ─────────────────────     ──────────────          ─────────────────
 PK artifact_id            PK report_id            PK audit_id
 FK case_id (nullable)     FK generated_by         FK user_id (nullable)
 FK alert_id (nullable)       report_type             action_type
 FK host_id                   period_start/end        object_type
 FK collected_by              file_path               object_id
    artifact_type             created_at              timestamp
    file_path                                         ip_address
    hash_sha256                                       details (JSON)
    collected_at
    notes
```

---

## 8. Database Schema Reference

**Database:** `soc_dfms` | **Engine:** InnoDB | **Charset:** UTF-8

| Table | Rows (seed) | Purpose |
|-------|------------|---------|
| `soc_role` | 2 | Defines Manager and Analyst roles |
| `soc_login` | 2 | User accounts with bcrypt password hashes |
| `soc_host` | 2 | Enrolled endpoint machines |
| `soc_agent` | 2 | Agent software instances on each host |
| `soc_user_host` | 2 | Many-to-many: user ↔ host access permissions |
| `soc_detection_rule` | 14 | LOLBin detection rule definitions |
| `soc_process_event` | 2 | Process telemetry from agents (grows continuously) |
| `soc_alert_reference` | auto | Alerts generated by detection engine |
| `soc_case` | 0 | Analyst-created investigation cases |
| `soc_case_alerts` | 0 | Links alerts to cases (junction) |
| `soc_case_note` | 0 | Analyst notes per case |
| `soc_acknowledgement` | 0 | Alert acknowledgement records |
| `soc_forensic_artifact` | 0 | File hashes and artifact references |
| `soc_report` | 0 | Generated report metadata |
| `soc_audit_log` | 1 | All system actions log (init entry seeded) |

**Key Indexes:**
```sql
idx_process_host_time   ON soc_process_event(host_id, timestamp)
idx_alert_status_time   ON soc_alert_reference(status, timestamp)
idx_case_status_created ON soc_case(status, created_at)
idx_case_alerts_case    ON soc_case_alerts(case_id)
idx_audit_user_time     ON soc_audit_log(user_id, timestamp)
```

---

## 9. API Reference

**Base URL:** `http://localhost:8082/api`
**Auth:** All protected endpoints require a valid `express-session` cookie (`credentials: 'include'` on fetch calls)

### Authentication
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/login` | Public | Login with email + password. Returns `{role, user}` |
| POST | `/api/logout` | Auth | Destroys session |
| GET | `/api/me` | Auth | Returns current session user |
| GET | `/api/connection/verify` | Public | Health check — agents use this |

### Alerts
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/alerts` | Auth | Last 50 alerts with host + rule enrichment |
| GET | `/api/stats` | Auth | Alert counts by severity, host count, new alert count |
| POST | `/api/alerts/:id/ack` | Analyst | Acknowledge alert (new → open) |

### Cases
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/cases` | Auth | All cases (filterable by status, priority) |
| GET | `/api/cases/:id` | Auth | Case detail with linked alerts and notes |
| POST | `/api/cases` | Auth | Create new case |
| PUT | `/api/cases/:id` | Auth | Update case status/priority/description |
| POST | `/api/cases/:id/notes` | Auth | Add forensic note to case |
| POST | `/api/cases/:id/alerts` | Auth | Link alert to case |

### Hosts & Agents
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/hosts` | Auth | All enrolled hosts with connectivity status |
| GET | `/api/agents` | Auth | All agent records |
| GET | `/api/users/:id/hosts` | Auth | Hosts accessible to a specific user |

### Logs
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/logs/all` | Auth | Process event log with hostname join |

### Manager-Only
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/users` | Manager | All users with roles |
| GET | `/api/audit-logs` | Manager | System audit log (last 100 entries) |
| GET | `/api/rules` | Auth | All detection rules |
| PUT | `/api/rules/:id` | Manager | Enable/disable a detection rule |
| GET | `/api/agent/download` | Manager | Download `SOCflow_Agent_Installer.zip` |
| POST | `/api/hosts/add` | Manager | Manually register a host |

### Agent Endpoints (No Auth — Secret-Verified)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/enroll` | Secret | Agent enrollment — validates `ENROLLMENT_SECRET` |
| POST | `/api/telemetry` | Public | CPU/RAM/disk heartbeat from agent |
| POST | `/api/logs` | Public | Batch process event submission from agent |

---

## 10. Detection Engine — LOLBin Rules

The Python engine (`server/analyzer.py`) runs continuously as a standalone process, polling `soc_process_event` every 10 seconds.

### Detection Logic
```
For each new process event:
  process_name_lower = event.process_name.lower()
  cmd_lower = event.command_line.lower()

  For each rule in LOLBIN_RULES (14 rules):
    if rule['binary'] in process_name_lower:          # e.g. 'certutil'
      if any(indicator in cmd_lower
             for indicator in rule['indicators']):     # e.g. '-urlcache'
        → MATCH

        score = calculate_score(rule['base_score'], cmd_lower)
        severity = score_to_severity(score)
        explanation = template + MITRE technique + detected command
        → INSERT into soc_alert_reference
```

### Threat Scoring
```python
def calculate_score(base_score, cmd_lower):
    score = base_score
    # Network indicator: command contains a URL
    if any(x in cmd_lower for x in ['http://', 'https://', 'ftp://']):
        score += 20
    # Obfuscation indicator: base64 encoding used
    if any(x in cmd_lower for x in ['base64', '-enc', 'frombase64string']):
        score += 15
    # Privilege escalation indicator
    if any(x in cmd_lower for x in ['system', 'localgroup admin', 'nt authority']):
        score += 10
    # Chain execution / pipeline indicator
    if any(x in cmd_lower for x in [' | ', 'iex(', 'invoke-expression', '&&', 'cmd /c']):
        score += 10
    return min(score, 100)

def score_to_severity(score):
    if score >= 80: return 'critical'
    if score >= 60: return 'high'
    if score >= 40: return 'medium'
    return 'low'
```

### 14 LOLBin Rules Summary

| # | Binary | Rule Name | MITRE | Base Score | Max Score |
|---|--------|-----------|-------|-----------|-----------|
| 1 | certutil | CertUtil File Download | T1105 | 55 | 100 |
| 2 | certutil | CertUtil Decode | T1140 | 45 | 85 |
| 3 | powershell | PowerShell Encoded Command | T1059.001 | 60 | 100 |
| 4 | powershell | PowerShell Download Cradle | T1059.001 | 70 | 100 |
| 5 | powershell | PowerShell Execution Bypass | T1059.001 | 50 | 95 |
| 6 | mshta | MSHTA Remote Execution | T1218.005 | 70 | 100 |
| 7 | regsvr32 | Regsvr32 COM Scriptlet (Squiblydoo) | T1218.010 | 75 | 100 |
| 8 | wmic | WMIC Process Creation | T1047 | 65 | 100 |
| 9 | msiexec | Msiexec Remote Package Install | T1218.007 | 65 | 100 |
| 10 | rundll32 | Rundll32 Script Execution | T1218.011 | 70 | 100 |
| 11 | bitsadmin | BITSAdmin File Transfer | T1197 | 60 | 100 |
| 12 | schtasks | Scheduled Task Persistence | T1053.005 | 55 | 90 |
| 13 | net | Net User Account Manipulation | T1136 | 65 | 85 |
| 14 | wscript/cscript | WScript Remote Script Execution | T1059.005 | 65 | 100 |

**Multiple rules can trigger for a single event.** A `powershell -enc ZWNo... http://...` command would trigger both Rule 3 (Encoded Command) and Rule 4 (Download Cradle), generating two separate alerts — each with independent scoring and MITRE tagging.

---

## 11. User Roles & Access Control

### Role Definition
```
soc_role table:
  role_id=1  Manager   — Platform administrator
  role_id=2  Analyst   — SOC analyst / investigator
```

### Middleware Stack
```
HTTP Request
    │
    ├── requireAuth       → checks req.session.user exists → 401 if not
    │
    └── requireRole(...)  → checks req.session.user.role in allowed list → 403 if not
```

### Access Matrix

| Feature | Manager | Analyst |
|---------|---------|---------|
| Login / Logout | ✓ | ✓ |
| Overview Dashboard | ✓ | ✓ |
| Profile Page | ✓ | ✓ |
| View Alerts | ✓ | ✓ |
| Acknowledge Alerts | — | ✓ |
| Create / Update Cases | ✓ | ✓ |
| Add Case Notes | ✓ | ✓ |
| Log Explorer | ✓ | ✓ |
| Systems / Endpoints Tab | ✓ | — |
| Manage Users | ✓ | — |
| View Audit Logs | ✓ | — |
| Configure Detection Rules | ✓ | — |
| Download Agent Installer | ✓ | — |
| Enroll Endpoints | ✓ | — |
| Intelligence / Threat Map | — | ✓ |
| Vulnerabilities | — | ✓ |

### Session Configuration
- **Cookie:** HTTP-only, SameSite=Lax, 30-minute expiry
- **Secret:** `SESSION_SECRET` env var
- **Storage:** In-memory (default `express-session` store)

### Default Credentials
| Email | Password | Role |
|-------|----------|------|
| `manager@socflow.local` | `SOCflow2026!` | Manager |
| `analyst@socflow.local` | `SOCflow2026!` | Analyst |

Passwords are stored as bcrypt hashes (cost=10). The `rehashSeededPasswords()` function runs on every backend startup and replaces the `SEED_PENDING` placeholder set by `init.sql` with real bcrypt hashes.

---

## 12. Complete Working Flow

### Flow A — First-Time Setup

```
1. Start MySQL and create the soc_dfms database
   ├─ Run database/init.sql to create 15 tables
   ├─ Seeds 2 roles, 2 users (SEED_PENDING), 2 hosts, 2 agents
   └─ Seeds 14 LOLBin detection rules + 2 sample events

2. Start Backend → initDB() runs
   ├─ Connects to MySQL
   └─ rehashSeededPasswords() → finds SEED_PENDING users
       → bcrypt.hash('SOCflow2026!', 10) for each
       → UPDATE soc_login SET password_hash = '$2b$10$...'

3. Start Python Engine
   ├─ Connects to MySQL
   └─ Begins polling loop (every 10 seconds)

4. Start Frontend dev server (port 3001)
   └─ Proxies /api/* → backend:5001
```

### Flow B — Manager Login and Endpoint Enrollment

```
Manager opens browser → http://localhost:8082
    │
    ├─ Sees Login.tsx selection page
    ├─ Clicks "Manager Portal" → /login/admin
    ├─ Enters manager@socflow.local / SOCflow2026!
    │
    │  POST /api/login
    │  ├─ Server queries soc_login JOIN soc_role WHERE email=?
    │  ├─ bcrypt.compare(password, password_hash) → match
    │  ├─ UPDATE soc_login SET last_login = NOW()
    │  ├─ req.session.user = {id, name, email, role:'Manager'}
    │  ├─ INSERT soc_audit_log (login event)
    │  └─ Response: {role:'manager', user:{...}}
    │
    ├─ Frontend: localStorage.setItem('token', 'session-active')
    ├─ Frontend: localStorage.setItem('userRole', 'manager')
    └─ navigate('/overview')

Manager navigates to Systems → Endpoints tab
    │
    ├─ Clicks "Download Agent"
    │  GET /api/agent/download (requireRole Manager)
    │  └─ Streams SOCflow_Agent_Installer.zip
    │
Manager copies ZIP to Windows endpoint machine
    ├─ Extracts ZIP
    └─ Runs: .\install.ps1
        ├─ Prompts: "Enter SOCflow Server URL" → http://192.168.1.x:8082
        ├─ Tests TCP connectivity to host:port
        ├─ Saves agent_settings.json {server_url}
        ├─ pip install -r requirements.txt
        └─ python agent_core.py http://...

agent_core.py (first run — no config file)
    └─ register_with_server()
        POST /api/enroll {hostname, password:'SOCflow-Enroll-2026!', os_info}
        ├─ Server validates ENROLLMENT_SECRET
        ├─ INSERT soc_host (hostname, ip, os)
        ├─ INSERT soc_agent (host_id, agent_uuid, 'SOCflow-Agent')
        └─ Returns {agent_id, agent_uuid, api_key}
        → saves agent_config.json
```

### Flow C — Continuous Telemetry and Detection (Normal Operation)

```
agent_core.py main loop (every 10 seconds):
    │
    ├─ psutil.process_iter() → collect up to 5 running processes
    │   {process_name, command_line, user}
    │
    ├─ POST /api/telemetry {agent_id, cpu%, ram%, disk%}
    │   └─ Server: UPDATE soc_agent SET last_seen = NOW()
    │
    └─ POST /api/logs {agent_id, logs:[{process_name, command_line, user}]}
        └─ Server:
            ├─ Resolve host_id from agent_id
            └─ For each log:
                INSERT soc_process_event (host_id, agent_id, process_name,
                                          command_line, user_name, timestamp)

Python engine polling loop (every 10 seconds):
    │
    ├─ SELECT max(event_id) from soc_process_event as last_id
    │
    ├─ SELECT * FROM soc_process_event WHERE event_id > {last_processed}
    │
    └─ For each event:
        process_lower = event.process_name.lower()
        cmd_lower     = event.command_line.lower()

        For each rule in LOLBIN_RULES (14 total):
            if rule['binary'] in process_lower:
                if any(indicator in cmd_lower):
                    → MATCH FOUND

                    score    = calculate_score(rule.base_score, cmd_lower)
                    severity = score_to_severity(score)  # critical/high/medium/low

                    explanation = rule['template'] + MITRE ID + detected command

                    INSERT soc_alert_reference (
                        host_id, agent_id, event_ref_id, rule_id,
                        severity, description=explanation,
                        confidence_score=score, status='new'
                    )
```

### Flow D — Analyst Alert Investigation

```
Analyst logs in → /login/user → verify role === 'analyst' → /overview
    │
    ├─ GET /api/alerts → last 50 alerts (enriched with host + rule + technique)
    ├─ GET /api/stats  → summary counts by severity
    │
Analyst opens Intelligence view → sees alert list
    │
    ├─ Sees: "PowerShell Download Cradle" on FIN-SRV-01 | CRITICAL | T1059.001
    │   confidence: 90% | detected command: powershell.exe -enc ...
    │
    ├─ POST /api/alerts/7/ack (requireRole Analyst)
    │   └─ UPDATE soc_alert_reference SET status='open' WHERE alert_id=7
    │   └─ INSERT soc_audit_log (ACK_ALERT event)
    │
    ├─ POST /api/cases {title:'PS Cradle on FIN-SRV-01', priority:'critical'}
    │   └─ INSERT soc_case (created_by=analyst_id)
    │   └─ Returns {caseId: 3}
    │
    ├─ POST /api/cases/3/alerts {alert_id: 7}
    │   └─ INSERT soc_case_alerts (case_id=3, alert_id=7)
    │
    ├─ GET /api/logs/all → filter by host FIN-SRV-01
    │   └─ Analyst queries soc_process_event for context
    │
    └─ POST /api/cases/3/notes {note_text: 'Confirmed C2 callback pattern...'}
        └─ INSERT soc_case_note (case_id=3, author_id=analyst_id, note_text)
```

### Flow E — Logout

```
User clicks "Sign Out" in sidebar
    │
    ├─ POST /api/logout (requireAuth)
    │   ├─ INSERT soc_audit_log (logout event)
    │   └─ req.session.destroy()
    │
    ├─ Frontend: localStorage.removeItem('token', 'userRole', 'userName', ...)
    └─ navigate('/') → back to role selection screen
```

---

## 13. Deployment Architecture

### Service Overview

```
┌─ Frontend (Vite dev server / Nginx)
│   Port: 3001
│   /api/* proxied → backend:5001
│
├─ Backend (Node.js/Express)
│   Port: 5001
│   Env: PORT, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME,
│         SESSION_SECRET, ENROLLMENT_SECRET
│   Volume: ./agent (for ZIP bundling)
│
├─ Engine (Python)
│   No HTTP port (DB access only)
│   Env: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
│
├─ Database (MySQL 5.7)
│   Port: 3306
│   Init: ./database/init.sql
│
└─ phpMyAdmin (optional)
    Port: 8083
```

### Port Summary

| Port | Service | Access |
|------|---------|--------|
| 3001 | Frontend (Vite/Nginx) | Public |
| 5001 | Backend API | Public (or proxied) |
| 8083 | phpMyAdmin | Admin only |
| 3306 | MySQL | Internal only |

### Startup Commands

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
npm run dev

# Terminal 3 — Engine (optional, if MySQL is running)
cd server && python analyzer.py
```

---

## 14. Security Design

### Authentication
- **No JWT** — session-based auth via `express-session` with HTTP-only cookies prevents XSS token theft
- **bcrypt cost=10** — adequate for login latency (~100ms) while resisting brute force
- **Startup rehash** — `rehashSeededPasswords()` ensures no plaintext passwords ever persist in the DB
- **Audit trail** — every login, logout, and failed login written to `soc_audit_log`

### Authorisation
- **Middleware chain** — `requireAuth` → `requireRole()` — no route can be accessed without both
- **Role stored server-side** — role is never read from the client request body; always from `req.session.user.role`
- **Frontend ProtectedRoute** — client-side guard using localStorage tokens prevents UI access, but backend is the actual enforcement layer

### Agent Security
- **Shared secret** — `ENROLLMENT_SECRET` (`SOCflow-Enroll-2026!`) required for enrollment; set via environment variable
- **No agent auth on telemetry/log routes** — these are rate-limited by network access (agents must be on the same network or VPN as the server)
- **SSL disabled** — `verify=False` in agent `requests` calls — add a certificate and enable `verify=True` for production

### Known Limitations (for production hardening)
1. Session store is in-memory — use `express-mysql-session` or Redis for multi-instance or restart persistence
2. MySQL password is `root/root` — replace with strong credentials and a dedicated non-root DB user
3. HTTP only — add TLS termination at Nginx for any deployment beyond local network
4. No rate limiting on login endpoint — add `express-rate-limit` to prevent brute force
5. CORS is `origin: true` — lock down to specific frontend origin in production
