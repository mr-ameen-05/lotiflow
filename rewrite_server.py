import re

with open('backend/server.js', 'r') as f:
    content = f.read()

# Dependencies
content = content.replace("const initSqlJs = require('sql.js');", "const mysql = require('mysql2/promise');")
content = content.replace("const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'socflow.db');", "")
content = content.replace("let db = null;\nlet SQL = null;", "let pool = null;")

# Db functions regex replace
db_funcs = """async function dbRun(sql, params = []) {
    try {
        const [result] = await pool.execute(sql, params);
        return { lastID: result.insertId, changes: result.affectedRows };
    } catch (err) {
        console.error('DB Error:', err.message, sql);
        throw err;
    }
}

async function dbAll(sql, params = []) {
    try {
        const [rows] = await pool.query(sql, params);
        return rows;
    } catch (err) {
        console.error('DB Error:', err.message, sql);
        throw err;
    }
}

async function dbGet(sql, params = []) {
    try {
        const [rows] = await pool.query(sql, params);
        return rows.length > 0 ? rows[0] : null;
    } catch (err) {
        console.error('DB Error:', err.message, sql);
        throw err;
    }
}"""

content = re.sub(r'function dbRun\(sql.*?throw err;\n    }\n}', db_funcs, content, flags=re.DOTALL)

# Rehash passwords
content = content.replace("const users = dbAll('SELECT login_id, password_hash FROM soc_login');", "const users = await dbAll('SELECT login_id, password_hash FROM soc_login');")
content = content.replace("dbRun('UPDATE soc_login SET password_hash = ? WHERE login_id = ?', [hash, user.login_id]);", "await dbRun('UPDATE soc_login SET password_hash = ? WHERE login_id = ?', [hash, user.login_id]);")

# initDB
init_db_new = """async function initDB() {
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'socflow',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        await pool.getConnection(); // test connection
        console.log('Connected to MySQL database.');
    } catch (err) {
        console.error('DB error:', err.message);
        process.exit(1);
    }
}"""
content = re.sub(r'async function initDB\(\) \{.*?\}', init_db_new, content, flags=re.DOTALL)

# Make route handlers async
content = re.sub(r'app\.(get|post|put|delete)\((.*?),\s*(requireAuth,\s*)?(requireRole\([^)]+\),\s*)?\(req, res\) => \{', r'app.\1(\2, \3\4async (req, res) => {', content)
# Fix the cases where requireAuth is without requireRole
# It's handled by the optional groups above.

# Convert dbCalls to await
content = re.sub(r'(?<!await )db(Run|All|Get)\(', r'await db\1(', content)

# Fix MySQL functions
content = content.replace("datetime('now')", "NOW()")
content = content.replace('datetime("now")', "NOW()")
content = content.replace("datetime('now', '-60 seconds')", "NOW() - INTERVAL 60 SECOND")

# Also need to make sure audit module is compatible if it uses db.
# Wait! In startup(): audit.init(db, dbRun); -> we should pass pool instead of db
content = content.replace('audit.init(db, dbRun);', 'audit.init(pool, dbRun);')

with open('backend/server.js', 'w') as f:
    f.write(content)
