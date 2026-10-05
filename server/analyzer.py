"""
SOCflow LotL Detection Engine
Polls soc_process_event for new entries and applies 14 LOLBin detection rules.
No external AI dependency — pure Python logical reasoning with threat scoring.
"""

import os
import time
import json
import redis
import mysql.connector
from datetime import datetime

DB_HOST = os.environ.get('DB_HOST', '127.0.0.1')
DB_USER = os.environ.get('DB_USER', 'root')
DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
DB_NAME = os.environ.get('DB_NAME', 'socflow')
REDIS_URL = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379')

LOLBIN_RULES = [
    {
        'binary':     'certutil',
        'rule_name':  'CertUtil File Download',
        'technique':  'T1105',
        'base_score': 55,
        'indicators': ['urlcache', '-urlcache', 'split'],
        'template': (
            'CertUtil is a legitimate Windows certificate utility being abused as a LOLBin '
            'to download remote files (T1105 - Ingress Tool Transfer). '
            'The -urlcache/-split flags signal a file transfer via HTTP/FTP, '
            'a well-documented Living off the Land download technique used to stage payloads '
            'without triggering conventional malware download alerts.'
        )
    },
    {
        'binary':     'certutil',
        'rule_name':  'CertUtil Decode',
        'technique':  'T1140',
        'base_score': 45,
        'indicators': ['-decode', '/decode'],
        'template': (
            'CertUtil is being used to decode a Base64-encoded payload (T1140 - Deobfuscate/Decode Files). '
            'Attackers encode malicious scripts or executables to bypass string-based security controls, '
            'then use certutil to decode them before execution — a classic two-stage evasion pattern.'
        )
    },
    {
        'binary':     'powershell',
        'rule_name':  'PowerShell Encoded Command',
        'technique':  'T1059.001',
        'base_score': 60,
        'indicators': ['-enc', '-encodedcommand'],
        'template': (
            'PowerShell is executing a Base64-encoded command (T1059.001 - PowerShell). '
            'Encoding is the primary obfuscation method used by attackers to conceal malicious '
            'script content from simple string-based detections and security logging tools. '
            'Legitimate administrative scripts rarely require encoded command execution.'
        )
    },
    {
        'binary':     'powershell',
        'rule_name':  'PowerShell Download Cradle',
        'technique':  'T1059.001',
        'base_score': 70,
        'indicators': ['downloadstring', 'downloadfile', 'webclient', 'invoke-webrequest', 'iwr ', 'net.webclient'],
        'template': (
            'PowerShell is making a network request to download and execute remote code in-memory '
            '(T1059.001 - PowerShell fileless delivery). '
            'Download cradles using Net.WebClient or Invoke-WebRequest are a core LOLBin technique '
            'that deliver malicious scripts directly into the PowerShell process, '
            'leaving no file artefact on disk for forensic recovery.'
        )
    },
    {
        'binary':     'powershell',
        'rule_name':  'PowerShell Execution Bypass',
        'technique':  'T1059.001',
        'base_score': 50,
        'indicators': ['-executionpolicy bypass', 'bypass', '-nop ', '-noprofile', '-windowstyle hidden', '-noninteractive'],
        'template': (
            'PowerShell is invoked with security bypass and stealth flags (T1059.001). '
            'Suppressing the execution policy, hiding the window, and disabling the profile '
            'are standard attacker tradecraft to evade user awareness and endpoint security controls. '
            'This pattern is strongly associated with malicious script execution frameworks.'
        )
    },
    {
        'binary':     'mshta',
        'rule_name':  'MSHTA Remote Execution',
        'technique':  'T1218.005',
        'base_score': 70,
        'indicators': ['http://', 'https://', 'javascript:', 'vbscript:'],
        'template': (
            'MSHTA (Microsoft HTML Application Host) is loading a remote script or executing '
            'inline script code (T1218.005 - Signed Binary Proxy Execution: Mshta). '
            'MSHTA is a signed Windows binary that can execute HTA files containing VBScript or JScript, '
            'allowing attackers to run arbitrary code while bypassing application whitelisting policies '
            'that trust Microsoft-signed executables.'
        )
    },
    {
        'binary':     'regsvr32',
        'rule_name':  'Regsvr32 COM Scriptlet (Squiblydoo)',
        'technique':  'T1218.010',
        'base_score': 75,
        'indicators': ['scrobj.dll', 'http://', 'https://', '/s /u ', '/i:http', '/i:ftp'],
        'template': (
            'Regsvr32 is being used to register and execute a remote COM scriptlet '
            '(T1218.010 - Squiblydoo technique). '
            'This signed Windows binary can silently (/s) load arbitrary COM objects — '
            'including remote SCT files via HTTP — completely bypassing AppLocker and '
            'Software Restriction Policies that whitelist regsvr32.exe. '
            'This is one of the oldest and most documented LOLBin bypass techniques.'
        )
    },
    {
        'binary':     'wmic',
        'rule_name':  'WMIC Process Creation',
        'technique':  'T1047',
        'base_score': 65,
        'indicators': ['process call create', '/node:', 'shadowcopy', '/format:'],
        'template': (
            'WMIC (Windows Management Instrumentation Command-line) is being used to create processes '
            'or query sensitive system objects (T1047 - Windows Management Instrumentation). '
            'Attackers abuse WMI for remote code execution, lateral movement, and shadow copy deletion '
            '(a common ransomware pre-step). The /node: flag indicates remote targeting of another host.'
        )
    },
    {
        'binary':     'msiexec',
        'rule_name':  'Msiexec Remote Package Install',
        'technique':  'T1218.007',
        'base_score': 65,
        'indicators': ['http://', 'https://', '/q ', '/quiet', '/i '],
        'template': (
            'Msiexec (Windows Installer) is silently installing a package from a remote URL '
            '(T1218.007 - Signed Binary Proxy Execution: Msiexec). '
            'Attackers host malicious MSI payloads on attacker-controlled infrastructure and use '
            'the /q (quiet) flag to suppress all user interaction, '
            'executing the payload with installer privileges while evading detection.'
        )
    },
    {
        'binary':     'rundll32',
        'rule_name':  'Rundll32 Script Execution',
        'technique':  'T1218.011',
        'base_score': 70,
        'indicators': ['javascript:', 'http://', 'shell32', 'advpack', 'ieadvpack', 'url.dll', 'pcwutl'],
        'template': (
            'Rundll32 is executing embedded script code or loading DLLs from unusual sources '
            '(T1218.011 - Signed Binary Proxy Execution: Rundll32). '
            'This signed Windows binary is routinely abused to execute JavaScript, VBScript, '
            'or load malicious DLLs while disguising execution as legitimate system DLL loading. '
            'The javascript: URI scheme passed to rundll32 is a strong indicator of malicious intent.'
        )
    },
    {
        'binary':     'bitsadmin',
        'rule_name':  'BITSAdmin File Transfer',
        'technique':  'T1197',
        'base_score': 60,
        'indicators': ['/transfer', '/addfile', '/download', '/upload'],
        'template': (
            'BITSAdmin is being used to transfer files via Background Intelligent Transfer Service '
            '(T1197 - BITS Jobs). '
            'Attackers use BITS jobs to download malicious payloads asynchronously in the background — '
            'transfers survive system reboots, run under the BITS service account, '
            'and are often excluded from network security monitoring, making them ideal for stealthy staging.'
        )
    },
    {
        'binary':     'schtasks',
        'rule_name':  'Scheduled Task Persistence',
        'technique':  'T1053.005',
        'base_score': 55,
        'indicators': ['/create', '/sc ', '/tr ', '/ru '],
        'template': (
            'Schtasks is being used to create a scheduled task (T1053.005 - Scheduled Task). '
            'Creating scheduled tasks is a primary persistence mechanism, ensuring attacker payloads '
            'execute automatically on login, system start, or a timed schedule. '
            'The /ru (run as user) flag, particularly with SYSTEM, indicates privilege escalation intent.'
        )
    },
    {
        'binary':     'net',
        'rule_name':  'Net User Account Manipulation',
        'technique':  'T1136',
        'base_score': 65,
        'indicators': ['user /add', ' /add', 'localgroup administrators', 'localgroup "administrators"'],
        'template': (
            'Net.exe is being used to create user accounts or modify local administrator group membership '
            '(T1136 - Create Account / T1087 - Account Discovery). '
            'Adding accounts to the local administrators group is a standard post-exploitation step '
            'for establishing persistent privileged access following initial compromise. '
            'Legitimate administrative changes are rarely made via command-line net.exe on production hosts.'
        )
    },
    {
        'binary':     'wscript',
        'rule_name':  'WScript Remote Script Execution',
        'technique':  'T1059.005',
        'base_score': 65,
        'indicators': ['http://', 'https://', '.vbs', '/e:vbscript', '/e:javascript', 'cscript'],
        'template': (
            'WScript or CScript is executing a script from a remote location or with an explicit '
            'scripting engine override (T1059.005 - Visual Basic Script). '
            'Windows Script Host binaries are abused to run VBScript or JScript payloads '
            'delivered via phishing or web downloads, often evading PowerShell-focused detection '
            'rules that do not monitor legacy script interpreters.'
        )
    },
]


def calculate_score(base_score: int, cmd_lower: str) -> int:
    score = base_score
    if any(x in cmd_lower for x in ['http://', 'https://', 'ftp://']):
        score += 20
    if any(x in cmd_lower for x in ['base64', '-enc', '-encodedcommand', 'frombase64string', 'fromb64']):
        score += 15
    if any(x in cmd_lower for x in ['system', 'localgroup admin', 'nt authority']):
        score += 10
    if any(x in cmd_lower for x in [' | ', 'iex(', 'invoke-expression', '&&', 'cmd /c']):
        score += 10
    return min(score, 100)


def score_to_severity(score: int) -> str:
    if score >= 80: return 'critical'
    if score >= 60: return 'high'
    if score >= 40: return 'medium'
    return 'low'


def generate_explanation(rule: dict, original_cmd: str) -> str:
    technique = rule['technique']
    template = rule['template']
    cmd_preview = original_cmd[:400] if original_cmd else 'N/A'
    return (
        f"{template}\n\n"
        f"MITRE ATT&CK: {technique}\n"
        f"Detected command: {cmd_preview}"
    )


class LogAnalyzer:
    def __init__(self):
        self.db_conn = None
        self._connect()

    def _connect(self):
        try:
            self.db_conn = mysql.connector.connect(
                host=DB_HOST,
                user=DB_USER,
                password=DB_PASSWORD,
                database=DB_NAME
            )
            print(f'SOCflow Engine: connected to MySQL {DB_HOST}')
        except Exception as e:
            print(f'DB connection failed: {e}')
            self.db_conn = None

    def get_or_create_host(self, hostname: str):
        if not self.db_conn:
            return None
        try:
            cursor = self.db_conn.cursor(dictionary=True)
            cursor.execute('SELECT host_id FROM soc_host WHERE hostname = %s', (hostname,))
            row = cursor.fetchone()
            if row:
                cursor.close()
                return row['host_id']
            cursor.execute(
                "INSERT INTO soc_host (hostname, environment, criticality, status) VALUES (%s, 'lab', 'medium', 'active')",
                (hostname,)
            )
            self.db_conn.commit()
            last_id = cursor.lastrowid
            cursor.close()
            return last_id
        except Exception as e:
            print(f'get_or_create_host error: {e}')
            return None

    def get_or_create_rule(self, rule_name: str, technique: str, severity: str):
        if not self.db_conn:
            return None
        try:
            cursor = self.db_conn.cursor(dictionary=True)
            cursor.execute('SELECT rule_id FROM soc_detection_rule WHERE rule_name = %s', (rule_name,))
            row = cursor.fetchone()
            if row:
                cursor.close()
                return row['rule_id']
            cursor.execute(
                "INSERT INTO soc_detection_rule (rule_name, technique, severity_default, logic_type, rule_content) "
                "VALUES (%s, %s, %s, 'keyword', 'auto-generated')",
                (rule_name, technique, severity)
            )
            self.db_conn.commit()
            last_id = cursor.lastrowid
            cursor.close()
            return last_id
        except Exception as e:
            print(f'get_or_create_rule error: {e}')
            return None

    def save_alert(self, hostname, rule_name, technique, severity, description,
                   explanation, event_id=None, confidence_score=None):
        if not self.db_conn:
            return

        host_id  = self.get_or_create_host(hostname)
        rule_id  = self.get_or_create_rule(rule_name, technique, severity)
        if not host_id or not rule_id:
            print(f'Could not resolve host/rule IDs for {hostname}/{rule_name}')
            return

        status_val = 'new'
        if confidence_score is not None and float(confidence_score) < 40:
            status_val = 'closed'

        full_desc = f"{description}\n\n--- Detection Analysis ---\n{explanation}"
        try:
            cursor = self.db_conn.cursor()
            cursor.execute(
                "INSERT INTO soc_alert_reference "
                "(host_id, rule_id, event_ref_id, severity, description, timestamp, status, confidence_score, detection_source) "
                "VALUES (%s, %s, %s, %s, %s, NOW(), %s, %s, 'rule')",
                (host_id, rule_id, event_id, severity.lower(), full_desc, status_val,
                 float(confidence_score) if confidence_score is not None else None)
            )
            self.db_conn.commit()
            cursor.close()
            print(f'  → Alert saved: [{severity.upper()}] {rule_name} on {hostname} (score={confidence_score})')
        except Exception as e:
            print(f'save_alert error: {e}')

    def get_max_event_id(self) -> int:
        if not self.db_conn:
            return 0
        try:
            cursor = self.db_conn.cursor(dictionary=True)
            cursor.execute('SELECT MAX(event_id) as max_id FROM soc_process_event')
            row = cursor.fetchone()
            cursor.close()
            return row['max_id'] if row and row['max_id'] else 0
        except Exception as e:
            print(f'get_max_event_id error: {e}')
            return 0

    def fetch_new_events(self, last_id: int):
        if not self.db_conn:
            return []
        try:
            cursor = self.db_conn.cursor(dictionary=True)
            cursor.execute(
                'SELECT e.*, h.hostname FROM soc_process_event e '
                'LEFT JOIN soc_host h ON e.host_id = h.host_id '
                'WHERE e.event_id > %s ORDER BY e.event_id ASC LIMIT 50',
                (last_id,)
            )
            rows = cursor.fetchall()
            cursor.close()
            return rows
        except Exception as e:
            print(f'fetch_new_events error: {e}')
            return []

    def analyze_event(self, event: dict):
        process   = (event.get('process_name') or '').lower()
        cmd       = (event.get('command_line') or '')
        cmd_lower = cmd.lower()
        hostname  = event.get('hostname') or 'unknown-host'
        event_id  = event.get('event_id')

        triggered = False
        for rule in LOLBIN_RULES:
            if rule['binary'] not in process:
                continue
            if not any(ind in cmd_lower for ind in rule['indicators']):
                continue

            score    = calculate_score(rule['base_score'], cmd_lower)
            severity = score_to_severity(score)
            explanation = generate_explanation(rule, cmd)

            print(f'[DETECTION] {rule["rule_name"]} on {hostname} | {severity.upper()} | score={score}')
            self.save_alert(
                hostname=hostname,
                rule_name=rule['rule_name'],
                technique=rule['technique'],
                severity=severity,
                description=cmd[:500],
                explanation=explanation,
                event_id=event_id,
                confidence_score=score
            )
            triggered = True

        return triggered


def main():
    print('SOCflow LotL Detection Engine starting...')
    print(f'Monitoring {len(LOLBIN_RULES)} LOLBin rules | DB: MySQL | Redis: {REDIS_URL}')

    analyzer = LogAnalyzer()
    
    redis_client = None
    try:
        redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
        redis_client.ping()
        print('Connected to Redis.')
    except Exception as e:
        print(f'Redis connection failed: {e}')

    while True:
        try:
            if redis_client:
                item = redis_client.blpop('socflow_events_queue', timeout=5)
                if item:
                    _, event_json = item
                    event = json.loads(event_json)
                    analyzer.analyze_event(event)
            else:
                time.sleep(5)
        except KeyboardInterrupt:
            print('Engine stopped.')
            break
        except Exception as e:
            print(f'Loop error: {e}')
            time.sleep(5)


if __name__ == '__main__':
    main()
