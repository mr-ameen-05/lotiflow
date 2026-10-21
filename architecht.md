# SOCflow Architecture Documentation

Comprehensive architecture guide for **SOCflow** — a self-hosted Security Operations Center (SOC) platform designed for detecting Living-off-the-Land (LotL) attacks on Windows endpoints.

---

## 1. System Overview & Philosophy

Modern cyber adversaries increasingly avoid deploying obvious malware payloads. Instead, they leverage native, trusted operating system utilities—known as **LOLBins** (Living off the Land Binaries) like `certutil.exe`, `powershell.exe`, `bitsadmin.exe`, and `mshta.exe`—to download scripts, execute in-memory code, evade traditional signatures, and establish persistence.

SOCflow is architected to detect behavioral patterns of LOLBin abuse through four decoupled, bare-metal-ready layers:
1. **Endpoint Agent & GUI Onboarding**: Real-time event log ingestion (Sysmon Event ID 1) with secure token registration.
2. **Backend API Gateway (Node.js)**: REST API handling enrollment, telemetry ingestion, role-based authorization, case lifecycle, and Redis job dispatch.
3. **Detection & Behavioral Engine (Python + Redis)**: Queue consumer that runs multi-factor behavioral analysis against 14 MITRE ATT&CK-mapped LOLBin rules.
4. **Operations Dashboard (React SPA)**: Single-page application offering tailored workflows for SOC Analysts and SOC Managers.

---

## 2. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                            WINDOWS ENDPOINTS                                      |
|                                                                                   |
|  [Sysmon Event ID 1] ---> [ agent_core.py ] <--- [ agent_gui.py ] (Enrollment)   |
+-----------------------------------|-----------------------------------------------+
                                    | HTTPS / JSON (Batch 50 / 10s)
                                    v
+-----------------------------------------------------------------------------------+
|                        CENTRAL MANAGER SERVER                                     |
|                                                                                   |
|  [ Nginx (Port 80) ]                                                              |
|        |                                                                          |
|        +--> / (Static Assets) -------> [ React + Vite SPA Frontend ]              |
|        |                               (Dark/Light, Recharts, RBAC Views)         |
|        |                                                                          |
|        +--> /api/ (Reverse Proxy) ---> [ Node.js Express API (Port 5001) ]       |
|                                              |               |                    |
|                                     Persist  |               |  LPUSH             |
|                                     Raw Logs |               |  Event ID          |
|                                              v               v                    |
|                                      +--------------+  +--------------------+     |
|                                      | MySQL 8.x/5.7|  | Redis Queue (6379) |     |
|                                      | (socflow DB) |  | socflow_events_    |     |
|                                      +--------------+  | queue              |     |
|                                              ^         +--------------------+     |
|                                              |                   |                |
|                                       Read Event &               | BLPOP          |
|                                       Write Alert                v                |
|                                      +------------------------------------+       |
|                                      | Python Detection Engine            |       |
|                                      | (analyzer.py)                      |       |
|                                      | - 14 LOLBin Behavioral Rules       |       |
|                                      | - Confidence Scoring Engine        |       |
|                                      | - Auto-suppression (<40 score)     |       |
|                                      +------------------------------------+       |
+-----------------------------------------------------------------------------------+
```

---

## 3. Core Component Breakdown

### 3.1. Endpoint Telemetry Layer (`agent/`)
* **`agent_gui.py`**: A Tkinter-based desktop interface for onboarding. It prompts the administrator for Server IP and Enrollment Secret, performs handshake validation against `/api/enroll`, saves the configuration to `agent_settings.json` and `agent_config.json`, and launches `agent_core.py` in background daemon mode.
* **`agent_core.py`**:
  * Hooks into Windows Event Logging via `win32evtlog` reading the channel `Microsoft-Windows-Sysmon/Operational` (Event ID 1: Process Creation).
  * Collects command line arguments, parent process details, hashes, user context, and executable paths.
  * Captures CPU, RAM, and Disk health metrics via `psutil`.
  * Batches events up to 50 records or flushes every 10 seconds to avoid network contention.

### 3.2. API Gateway & Management Layer (`backend/`)
* **Technology**: Node.js 18+, Express.js, `mysql2` (pooled connections), `redis`.
* **Primary Endpoints**:
  * `POST /api/enroll`: Validates endpoint tokens, registers hosts, and allocates persistent `agent_id`s.
  * `POST /api/logs`: Ingests endpoint telemetry batches, executes bulk SQL inserts into `soc_process_event`, and issues `LPUSH` commands to `socflow_events_queue`.
  * `POST /api/telemetry`: Updates host status and hardware resource counters in `soc_host_metrics`.
  * `GET/POST /api/alerts`: Fetches, triages, and updates alert statuses (`new`, `open`, `suppressed`, `closed`).
  * `GET/POST /api/cases`: Manages security incident records, forensic evidence links, and analyst case notes.
  * `GET/POST /api/rules`: Enables/disables rules and adjusts threshold scoring.

### 3.3. Detection & Behavioral Engine (`server/`)
* **Technology**: Python 3.9+, `mysql-connector-python`, `redis`.
* **Decoupled Queue Loop**: Replaces legacy polling loops with a non-blocking Redis `BLPOP` consumer.
* **Threat Scoring Algorithm**:
  * Multi-factor scoring combining binary suspicion, parameter keywords, suspicious directories (`\AppData\`, `\Temp\`), network indicators (`http://`, `Invoke-WebRequest`), and encoding signatures (`-enc`, Base64).
  * Automatically categorizes alerts into Severity tiers: Low (<50), Medium (50-69), High (70-84), Critical (85-100).
  * Suppresses alerts scoring below 40 directly into `closed` / `suppressed` state to prevent analyst fatigue.

### 3.4. Frontend Presentation Layer (`views/`, `components/`)
* **Technology**: React 18, Vite, TypeScript, Tailwind CSS with native CSS variables, Recharts, Lucide Icons.
* **Role-Based Access Control (RBAC)**:
  * **Manager**: Overview, Host Management, User Admin, Rules Engine Configuration, Audit Logs, Export Reports.
  * **Analyst**: Alert Triage, Incident Cases, Log Explorer, Host Detail Inspector.
* **Theme System**: Dynamic switching between Dark and Light SOC monitoring modes via CSS variables and Tailwind class toggles.

---

## 4. Hardware & Software Requirements

| Component | Minimum Specification | Recommended Specification |
|---|---|---|
| **OS (Server)** | Ubuntu 22.04 LTS / Debian 12 | Ubuntu 24.04 LTS (Bare-Metal) |
| **CPU / RAM** | 2 vCPU / 4 GB RAM | 4 vCPU / 8 GB RAM |
| **Storage** | 20 GB SSD | 80+ GB NVMe SSD (Log Retention) |
| **Database** | MySQL 5.7 / 8.0+ | MySQL 8.4+ with InnoDB Pool Tuning |
| **Message Queue** | Redis 6.x | Redis 7.x+ (Alpine/Bare-metal) |
| **OS (Endpoint)** | Windows 10 Pro / Enterprise | Windows 10/11 or Windows Server 2019/2022 with Sysmon v14+ |

---

## 5. Network & Port Allocations

| Port | Protocol | Service | Source | Destination | Purpose |
|---|---|---|---|---|---|
| **80 / 443** | TCP | Nginx Reverse Proxy | Web Browser / Agent | Manager Server | Web UI & API Gateway traffic |
| **5001** | TCP | Express.js API | Nginx (Localhost) | Node.js Backend | Internal API handling |
| **6379** | TCP | Redis Server | Node.js / Python | Localhost | Internal Event Queueing |
| **3306** | TCP | MySQL Server | Node.js / Python | Localhost | Relational Database Storage |
