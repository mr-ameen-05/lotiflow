import re

with open('database/schema.sql', 'r') as f:
    sql = f.read()

# Remove PRAGMA
sql = re.sub(r'PRAGMA foreign_keys = ON;\n+', '', sql)

# AUTOINCREMENT -> AUTO_INCREMENT
sql = re.sub(r'\bAUTOINCREMENT\b', 'AUTO_INCREMENT', sql)

# datetime('now') -> CURRENT_TIMESTAMP
sql = re.sub(r"datetime\('now'\)", 'CURRENT_TIMESTAMP', sql)

# INSERT OR IGNORE -> INSERT IGNORE
sql = re.sub(r'INSERT OR IGNORE', 'INSERT IGNORE', sql)

# TEXT UNIQUE -> VARCHAR(255) UNIQUE
sql = re.sub(r'\bTEXT UNIQUE\b', 'VARCHAR(255) UNIQUE', sql)

def fix_references(create_table_match):
    table_name = create_table_match.group(1)
    table_body = create_table_match.group(2)
    
    ref_pattern = re.compile(r'^(\s+)(\w+)\s+(.*?)\s+REFERENCES\s+(\w+\([^)]+\))(\s+ON DELETE \w+(?:\s+\w+)?)?(,?)$', re.MULTILINE | re.IGNORECASE)
    
    fks = []
    
    def ref_replacer(match):
        indent = match.group(1)
        col_name = match.group(2)
        rest_of_def = match.group(3)
        ref_target = match.group(4)
        on_delete = match.group(5) or ''
        comma = match.group(6)
        
        new_col_def = f"{indent}{col_name} {rest_of_def}{comma}"
        fk = f"FOREIGN KEY ({col_name}) REFERENCES {ref_target}{on_delete}"
        fks.append(fk)
        
        return new_col_def

    new_body = ref_pattern.sub(ref_replacer, table_body)
    
    if fks:
        lines = new_body.rstrip().split('\n')
        if lines[-1].strip() and not lines[-1].strip().endswith(','):
            lines[-1] += ','
            
        for fk in fks:
            lines.append(f"    {fk},")
            
        lines[-1] = lines[-1].rstrip(',')
        new_body = '\n'.join(lines) + '\n'

    return f"CREATE TABLE IF NOT EXISTS {table_name} ({new_body})"

sql = re.sub(r'CREATE TABLE IF NOT EXISTS (\w+)\s*\((.*?)\);', lambda m: fix_references(m), sql, flags=re.DOTALL)

with open('database/mysql_schema.sql', 'w') as f:
    f.write(sql)
