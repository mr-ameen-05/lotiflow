# SOCflow Architecture

The SOCflow architecture is strictly segmented into four primary components running in a bare-metal environment.

## 1. The Logs Puller (Endpoint Agent)
- **Role**: Collects telemetry.
- **Tech**: Python (`pywin32`, `requests`).
- **Functionality**: Subscribes to `Microsoft-Windows-Sysmon/Operational` (Event ID 1), batches events, encrypts payloads via TLS 1.2+, and forwards them to the central manager.

## 2. The Ingestion API (Node.js)
- **Role**: API Gateway and Auth Management.
- **Tech**: Node.js, Express, `mysql2`, `redis`.
- **Functionality**: Receives agent payloads, verifies authentication, persists raw telemetry to MySQL, and publishes events to the Redis queue (`socflow_events_queue`) for real-time analysis.

## 3. The Detection Engine (Python)
- **Role**: Analytics and Alerting.
- **Tech**: Python (`redis`, `mysql-connector-python`).
- **Functionality**: Consumes events from Redis using blocking pops (`BLPOP`), evaluates command lines against 14 regex/keyword-based LOLBin rules, calculates confidence scores, and inserts alerts back into MySQL. Automatically suppresses alerts scoring < 40.

## 4. The UI/UX Dashboard (React)
- **Role**: SOC Operations Interface.
- **Tech**: React, Vite, Tailwind CSS, Recharts.
- **Functionality**: Provides a role-based Single Page Application (SPA) for Managers to administer the system and Analysts to triage cases and explore logs.
