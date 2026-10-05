import re

with open('database/schema.sql', 'r') as f:
    sql = f.read()

# Remove PRAGMA
sql = re.sub(r'PRAGMA foreign_keys = ON;', '', sql)

# Replace AUTOINCREMENT
sql = re.sub(r'INTEGER PRIMARY KEY AUTOINCREMENT', 'INT AUTO_INCREMENT PRIMARY KEY', sql)

# Replace datetime('now')
sql = re.sub(r"datetime\('now'\)", 'CURRENT_TIMESTAMP', sql)

# Replace TEXT with VARCHAR(255) for common short strings, keep TEXT for descriptions
# We'll just keep TEXT as TEXT for simplicity, MySQL supports TEXT everywhere.
# Except for UNIQUE constraints which require length limit if it's TEXT, but let's change TEXT to VARCHAR(255) generally.
sql = sql.replace('TEXT UNIQUE', 'VARCHAR(255) UNIQUE')

# Let's fix foreign keys and other specific things manually if needed, or just run it through MySQL and see what fails.
with open('database/mysql_schema.sql', 'w') as f:
    f.write(sql)
