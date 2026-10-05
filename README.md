# SOCflow - Living-off-the-Land (LotL) Detection Platform

SOCflow is a self-hosted Security Operations Centre (SOC) platform designed specifically to detect Living-off-the-Land (LotL) attacks on Windows endpoints. It monitors process-creation events in real-time, applying behavioral detection rules to identify malicious abuse of legitimate system binaries (LOLBins).

## Key Features
- **Endpoint Agent**: Lightweight Python-based agent utilizing Windows Event Logs (Sysmon Event ID 1) to collect process creation telemetry.
- **Real-Time Analysis**: High-performance log ingestion pipeline backed by Redis queues.
- **Detection Engine**: Python-based analytics engine with 14 customized rules mapped to the MITRE ATT&CK framework.
- **SOC Dashboard**: A strictly controlled, Role-Based Access Control (RBAC) React interface for Managers and Analysts.
- **Bare-Metal Ready**: Designed to run natively on host systems utilizing Node.js, Python, and MySQL.

## Documentation
- [Deployment Guide](./DEPLOYMENT.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Data Flow Diagram](./DATAFLOW.md)
- [Use Cases & Workflows](./USECASES.md)
