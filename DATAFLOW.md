# SOCflow Data Flow Diagram

The following represents the lifecycle of a single process creation event within the SOCflow ecosystem.

1. **Event Generation (Endpoint)**
   - A user or script executes a command on the Windows host (e.g., `certutil -urlcache`).
   - Sysmon captures this as Event ID 1 (Process Create).

2. **Log Extraction (Endpoint Agent)**
   - `agent_core.py` reads the event via Windows Event Log APIs.
   - The event is buffered. Once 50 events accumulate or 10 seconds pass, the batch is serialized to JSON.

3. **Secure Transport**
   - The agent POSTs the JSON payload over HTTPS to `/api/logs` on the Node.js API, authenticated via an Enrollment Secret.

4. **Ingestion & Queuing (Manager Server)**
   - Node.js receives the batch and bulk-inserts the raw `soc_process_event` rows into MySQL.
   - Node.js immediately executes `LPUSH` to insert the new Event IDs into the `socflow_events_queue` in Redis.

5. **Real-Time Analysis (Detection Engine)**
   - `analyzer.py`, idling on a `BLPOP` command, instantly receives the Event ID from Redis.
   - It fetches the full event from MySQL and scans the `command_line` against all enabled rules.

6. **Alert Generation**
   - If a rule matches, a Confidence Score is computed.
   - If `score >= 40`, an Alert is written to `soc_alert_reference` with status `new`.
   - If `score < 40`, the alert is written but suppressed (status `closed`).

7. **SOC Operations (Frontend)**
   - A SOC Analyst views the `/alerts` dashboard (polling the API).
   - They acknowledge the alert (`new` -> `open`) and associate it with a Case for forensic review.
