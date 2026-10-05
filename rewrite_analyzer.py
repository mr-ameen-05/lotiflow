import re

with open('server/analyzer.py', 'r') as f:
    content = f.read()

# Replace sqlite3 with mysql.connector
content = content.replace('import sqlite3', 'import mysql.connector')

# DB configuration
db_config = """
DB_HOST = os.environ.get('DB_HOST', '127.0.0.1')
DB_USER = os.environ.get('DB_USER', 'root')
DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
DB_NAME = os.environ.get('DB_NAME', 'socflow')
"""
content = re.sub(r"DB_PATH = os.environ.get\('DB_PATH'.*?\n", db_config, content)

# _connect method
connect_new = """    def _connect(self):
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
            self.db_conn = None"""
content = re.sub(r'    def _connect\(self\):.*?self\.db_conn = None', connect_new, content, flags=re.DOTALL)

# get_max_event_id: replace fetchone()[0] handling, but with dictionary cursor it returns dict if we use dict. Actually we can just get cursor and fetchone.
# In mysql.connector, cursor = self.db_conn.cursor(dictionary=True).
# Let's replace all `self.db_conn.execute(...)` with `cursor = self.db_conn.cursor(dictionary=True); cursor.execute(...)`

# Wait, `get_max_event_id`:
get_max = """    def get_max_event_id(self) -> int:
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
            return 0"""
content = re.sub(r'    def get_max_event_id\(self\) -> int:.*?return 0', get_max, content, flags=re.DOTALL)

# get_or_create_host
host_fn = """    def get_or_create_host(self, hostname: str):
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
            return None"""
content = re.sub(r'    def get_or_create_host\(self, hostname: str\):.*?return None', host_fn, content, flags=re.DOTALL)

# get_or_create_rule
rule_fn = """    def get_or_create_rule(self, rule_name: str, technique: str, severity: str):
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
            return None"""
content = re.sub(r'    def get_or_create_rule\(self, rule_name: str, technique: str, severity: str\):.*?return None', rule_fn, content, flags=re.DOTALL)

# save_alert
alert_fn = """    def save_alert(self, hostname, rule_name, technique, severity, description,
                   explanation, event_id=None, confidence_score=None):
        if not self.db_conn:
            return

        host_id  = self.get_or_create_host(hostname)
        rule_id  = self.get_or_create_rule(rule_name, technique, severity)
        if not host_id or not rule_id:
            print(f'Could not resolve host/rule IDs for {hostname}/{rule_name}')
            return

        full_desc = f"{description}\\n\\n--- Detection Analysis ---\\n{explanation}"
        try:
            cursor = self.db_conn.cursor()
            cursor.execute(
                "INSERT INTO soc_alert_reference "
                "(host_id, rule_id, event_ref_id, severity, description, timestamp, status, confidence_score, detection_source) "
                "VALUES (%s, %s, %s, %s, %s, NOW(), 'new', %s, 'rule')",
                (host_id, rule_id, event_id, severity.lower(), full_desc,
                 float(confidence_score) if confidence_score is not None else None)
            )
            self.db_conn.commit()
            cursor.close()
            print(f'  → Alert saved: [{severity.upper()}] {rule_name} on {hostname} (score={confidence_score})')
        except Exception as e:
            print(f'save_alert error: {e}')"""
content = re.sub(r'    def save_alert\(self.*?except Exception as e:\n            print\(f\'save_alert error: \{e\}\'\)', alert_fn, content, flags=re.DOTALL)

# fetch_new_events
fetch_fn = """    def fetch_new_events(self, last_id: int):
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
            return []"""
content = re.sub(r'    def fetch_new_events\(self, last_id: int\):.*?return \[\]', fetch_fn, content, flags=re.DOTALL)

content = content.replace('DB: {DB_PATH}', 'DB: MySQL')
content = content.replace('self.db_path', 'DB_HOST')

with open('server/analyzer.py', 'w') as f:
    f.write(content)

