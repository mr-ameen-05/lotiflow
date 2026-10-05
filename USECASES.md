# SOCflow Use Cases & Workflows

SOCflow distinguishes system operations strictly by Role-Based Access Control (RBAC).

## 1. SOC Analyst Workflows
**Objective:** Threat hunting, triage, and incident response.

- **Triage an Alert:** 
  The Analyst monitors the `/alerts` feed. Upon spotting a Critical alert (e.g., PowerShell Download Cradle), they click "Investigate", review the exact command line, and "Acknowledge" the alert.
- **Case Management:** 
  The Analyst creates a new Case, links the acknowledged alert, and begins appending forensic notes tracking their investigation timeline.
- **Log Exploration:** 
  If an alert triggers on a suspicious child process, the Analyst navigates to `/explorer` to query all historical Sysmon events for that specific `host_id` and `user_name` to map out the full attack chain.

## 2. SOC Manager Workflows
**Objective:** System administration, compliance, and infrastructure health.

- **Agent Provisioning:** 
  The Manager navigates to `/hosts`, downloads the Agent Bundle, and generates an enrollment secret to onboard a new Finance Server.
- **Rule Tuning:** 
  If a development team legitimately uses `certutil` heavily, generating false positives, the Manager navigates to `/rules` and safely disables Rule #2 for the environment.
- **Personnel Management:** 
  A new analyst joins the team. The Manager navigates to `/users` and provisions a new account restricted to the Analyst role.
- **Audit Review:** 
  During a compliance check, the Manager reviews the immutable `/audit` log to verify who modified a Case status or disabled a detection rule.
