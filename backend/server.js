const express = require('express');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const session = require('express-session');
const redis = require('redis');
require('dotenv').config();

const { requireAuth, requireRole } = require('./middleware/auth');
const audit = require('./middleware/audit');

const ENROLLMENT_SECRET = process.env.ENROLLMENT_SECRET || 'SOCflow-Enroll-2026!';
const PORT = process.env.PORT || 5001;

let pool = null;
let redisClient = null;

async function initRedis() {
    if (!process.env.REDIS_URL) return;
    try {
        redisClient = redis.createClient({ url: process.env.REDIS_URL });
        redisClient.on('error', (err) => console.error('Redis error:', err));
        await redisClient.connect();
        console.log('Connected to Redis.');
    } catch (err) {
        console.error('Failed to connect to Redis:', err.message);
    }
}

async function dbRun(sql, params = []) {
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
}





async function rehashSeededPasswords() {
    const SEED_PASSWORD = 'SOCflow2026!';
    try {
        const users = await dbAll('SELECT login_id, password_hash FROM soc_login');
        for (const user of users) {
            const isReal = user.password_hash &&
                user.password_hash.startsWith('$2b$') &&
                user.password_hash.length === 60;
            if (!isReal) {
                const hash = await bcrypt.hash(SEED_PASSWORD, 10);
                await dbRun('UPDATE soc_login SET password_hash = ? WHERE login_id = ?', [hash, user.login_id]);
                console.log(`Rehashed password for user_id=${user.login_id}`);
            }
        }
    } catch (err) {
        console.error('Password rehash error:', err.message);
    }
}

async function initDB() {
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
}

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'socflow-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    }
}));

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    try {
        const user = await dbGet(
            'SELECT l.*, r.role_name FROM soc_login l JOIN soc_role r ON l.role_id = r.role_id WHERE l.email = ?',
            [email]
        );
        if (!user) {
            await audit.logAuditAction(null, 'failed_login', 'USER', null, { email }, ip);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Account disabled' });
        }
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            await audit.logAuditAction(user.login_id, 'failed_login', 'USER', user.login_id, { email }, ip);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        await dbRun('UPDATE soc_login SET last_login = NOW() WHERE login_id = ?', [user.login_id]);
        req.session.user = {
            id: user.login_id,
            name: user.full_name,
            email: user.email,
            role: user.role_name
        };
        await audit.logAuditAction(user.login_id, 'login', 'USER', user.login_id, { email }, ip);
        return res.json({
            success: true,
            role: user.role_name.toLowerCase(),
            user: { id: user.login_id, name: user.full_name, email: user.email }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/logout', requireAuth, async (req, res) => {
    const userId = req.session.user.id;
    const ip = req.ip || req.connection.remoteAddress;
    await audit.logAuditAction(userId, 'logout', 'USER', userId, {}, ip);
    req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/me', requireAuth, async (req, res) => {
    res.json({ user: req.session.user });
});

app.get('/api/alerts', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT a.alert_id, a.timestamp, a.severity, a.description, a.status,
                   a.confidence_score, h.hostname as host, r.rule_name, r.technique
            FROM soc_alert_reference a
            LEFT JOIN soc_host h ON a.host_id = h.host_id
            LEFT JOIN soc_detection_rule r ON a.rule_id = r.rule_id
            ORDER BY a.timestamp DESC LIMIT 50
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats', requireAuth, async (req, res) => {
    try {
        const alerts = await dbAll('SELECT severity, COUNT(*) as count FROM soc_alert_reference GROUP BY severity');
        const hosts = await dbGet('SELECT COUNT(*) as count FROM soc_host WHERE status = ?', ['active']);
        const newAlerts = await dbGet('SELECT COUNT(*) as count FROM soc_alert_reference WHERE status = ?', ['new']);
        res.json({ alerts, hosts: hosts ? hosts.count : 0, new_alerts: newAlerts ? newAlerts.count : 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/alerts/:id/ack', requireAuth, requireRole('Analyst'), async (req, res) => {
    try {
        await dbRun('UPDATE soc_alert_reference SET status = ? WHERE alert_id = ?', ['open', req.params.id]);
        audit.logAuditAction(req.session.user.id, 'ACK_ALERT', 'ALERT', req.params.id, {}, req.ip);
        res.json({ message: 'Alert acknowledged' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/cases', requireAuth, async (req, res) => {
    try {
        const { status, priority } = req.query;
        let sql = 'SELECT * FROM soc_case';
        const params = [];
        const conds = [];
        if (status)   { conds.push('status = ?');   params.push(status); }
        if (priority) { conds.push('priority = ?'); params.push(priority); }
        if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
        sql += ' ORDER BY created_at DESC';
        const rows = await dbAll(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/cases/:id', requireAuth, async (req, res) => {
    try {
        const caseId = req.params.id;
        const caseData = await dbGet('SELECT * FROM soc_case WHERE case_id = ?', [caseId]);
        if (!caseData) return res.status(404).json({ error: 'Case not found' });

        const alerts = await dbAll(`
            SELECT a.*, r.rule_name, h.hostname
            FROM soc_alert_reference a
            JOIN soc_case_alerts ca ON a.alert_id = ca.alert_id
            JOIN soc_detection_rule r ON a.rule_id = r.rule_id
            JOIN soc_host h ON a.host_id = h.host_id
            WHERE ca.case_id = ?
        `, [caseId]);

        const notes = await dbAll(`
            SELECT n.*, l.full_name as analyst_name
            FROM soc_case_note n
            LEFT JOIN soc_login l ON n.author_id = l.login_id
            WHERE n.case_id = ?
            ORDER BY n.created_at ASC
        `, [caseId]);

        res.json({ ...caseData, alerts, notes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/cases', requireAuth, async (req, res) => {
    const { title, description, priority } = req.body;
    try {
        await dbRun(
            "INSERT INTO soc_case (title, description, priority, status, created_by) VALUES (?, ?, ?, 'open', ?)",
            [title, description, priority || 'medium', req.session.user.id]
        );
        audit.logAuditAction(req.session.user.id, 'CREATE_CASE', 'CASE', null, { title }, req.ip);
        res.json({ message: 'Case created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/cases/:id', requireAuth, async (req, res) => {
    const { status, priority, description } = req.body;
    try {
        const updates = [];
        const params = [];
        if (status)      { updates.push('status = ?');      params.push(status); }
        if (priority)    { updates.push('priority = ?');    params.push(priority); }
        if (description) { updates.push('description = ?'); params.push(description); }
        if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
        params.push(req.params.id);
        await dbRun(`UPDATE soc_case SET ${updates.join(', ')} WHERE case_id = ?`, params);
        res.json({ message: 'Case updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/cases/:id/notes', requireAuth, async (req, res) => {
    const { note_text } = req.body;
    try {
        await dbRun(
            'INSERT INTO soc_case_note (case_id, author_id, note_text) VALUES (?, ?, ?)',
            [req.params.id, req.session.user.id, note_text]
        );
        res.json({ message: 'Note added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/cases/:id/alerts', requireAuth, async (req, res) => {
    const { alert_id } = req.body;
    try {
        const existing = await dbGet(
            'SELECT id FROM soc_case_alerts WHERE case_id = ? AND alert_id = ?',
            [req.params.id, alert_id]
        );
        if (existing) return res.status(409).json({ error: 'Alert already linked' });
        await dbRun('INSERT INTO soc_case_alerts (case_id, alert_id) VALUES (?, ?)', [req.params.id, alert_id]);
        res.json({ message: 'Alert linked to case' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/hosts', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT h.*,
                CASE WHEN h.last_seen > NOW() - INTERVAL 60 SECOND
                     THEN 'online' ELSE 'offline' END AS connectivity_status
            FROM soc_host h ORDER BY h.last_seen DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/hosts/add', requireAuth, requireRole('Manager'), async (req, res) => {
    const { hostname, ip_address } = req.body;
    try {
        await dbRun(
            "INSERT INTO soc_host (hostname, ip_address, status, environment, criticality) VALUES (?, ?, 'active', 'prod', 'medium')",
            [hostname, ip_address]
        );
        const host = await dbGet('SELECT host_id FROM soc_host WHERE hostname = ?', [hostname]);
        if (host) {
            await dbRun(
                "INSERT INTO soc_user_host (user_id, host_id, access_level) VALUES (?, ?, 'owner')",
                [req.session.user.id, host.host_id]
            );
        }
        audit.logAuditAction(req.session.user.id, 'ADD_HOST', 'HOST', host ? host.host_id : null, { hostname }, req.ip);
        res.json({ message: 'Host added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/agents', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT a.agent_id, a.agent_uuid, a.agent_name, a.agent_version, a.status, a.last_seen,
                   h.hostname, h.ip_address, h.os_name,
                   CASE WHEN a.last_seen > NOW() - INTERVAL 60 SECOND
                        THEN 'online' ELSE 'offline' END AS connectivity_status
            FROM soc_agent a
            JOIN soc_host h ON a.host_id = h.host_id
            ORDER BY a.last_seen DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/rules', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM soc_detection_rule ORDER BY severity_default DESC, rule_name');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/rules/:id', requireAuth, requireRole('Manager'), async (req, res) => {
    const { enabled } = req.body;
    try {
        await dbRun("UPDATE soc_detection_rule SET enabled = ?, updated_at = NOW() WHERE rule_id = ?",
            [enabled ? 1 : 0, req.params.id]);
        audit.logAuditAction(req.session.user.id, 'UPDATE_RULE', 'RULE', req.params.id, { enabled }, req.ip);
        res.json({ message: 'Rule updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users', requireAuth, requireRole('Manager'), async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT l.login_id as id, l.full_name as name, l.email,
                   r.role_name as role, l.status, l.last_login,
                   UPPER(SUBSTR(l.full_name, 1, 2)) as initials
            FROM soc_login l JOIN soc_role r ON l.role_id = r.role_id
            ORDER BY l.created_at DESC
        `);
        const mapped = rows.map(u => ({
            ...u,
            role: u.role.toUpperCase(),
            status: u.status.toUpperCase()
        }));
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/audit-logs', requireAuth, requireRole('Manager'), async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT a.*, l.full_name as user_name, l.email as user_email
            FROM soc_audit_log a
            LEFT JOIN soc_login l ON a.user_id = l.login_id
            ORDER BY a.timestamp DESC LIMIT 100
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/logs/all', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT e.event_id, e.timestamp, e.process_name, e.command_line,
                   e.user_name, e.pid, e.ppid, h.hostname
            FROM soc_process_event e
            JOIN soc_host h ON e.host_id = h.host_id
            ORDER BY e.timestamp DESC LIMIT 100
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/logs/search', requireAuth, async (req, res) => {
    const { query, host, user, process } = req.body;
    try {
        let sql = `
            SELECT e.event_id, e.timestamp, e.process_name, e.command_line, e.user_name, h.hostname
            FROM soc_process_event e JOIN soc_host h ON e.host_id = h.host_id
            WHERE 1=1
        `;
        const params = [];
        if (host)    { sql += ' AND h.hostname LIKE ?';                              params.push(`%${host}%`); }
        if (user)    { sql += ' AND e.user_name LIKE ?';                             params.push(`%${user}%`); }
        if (process) { sql += ' AND e.process_name LIKE ?';                          params.push(`%${process}%`); }
        if (query)   { sql += ' AND (e.command_line LIKE ? OR e.process_name LIKE ?)'; params.push(`%${query}%`, `%${query}%`); }
        sql += ' ORDER BY e.timestamp DESC LIMIT 100';
        const rows = await dbAll(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/connection/verify', async (req, res) => {
    res.json({ status: 'ok', server: 'SOCflow', timestamp: new Date().toISOString() });
});

app.post('/api/enroll', async (req, res) => {
    const { hostname, password, os_info } = req.body;
    if (password !== ENROLLMENT_SECRET) {
        return res.status(403).json({ error: 'Invalid enrollment password' });
    }
    try {
        let hostId;
        const host = await dbGet('SELECT host_id FROM soc_host WHERE hostname = ?', [hostname]);
        if (host) {
            hostId = host.host_id;
            await dbRun("UPDATE soc_host SET last_seen = NOW(), status = 'active' WHERE host_id = ?", [hostId]);
        } else {
            await dbRun(
                "INSERT INTO soc_host (hostname, environment, criticality, status, os_name) VALUES (?, 'prod', 'medium', 'active', ?)",
                [hostname, os_info || 'Unknown']
            );
            const newHost = await dbGet('SELECT host_id FROM soc_host WHERE hostname = ?', [hostname]);
            hostId = newHost ? newHost.host_id : null;
        }
        const agentUuid = crypto.randomUUID();
        const agentKey = crypto.randomBytes(32).toString('hex');
        await dbRun(
            "INSERT INTO soc_agent (host_id, agent_uuid, agent_name, agent_version, status, last_seen) VALUES (?, ?, 'SOCflow-Agent', '2.0.0', 'active', NOW())",
            [hostId, agentUuid]
        );
        console.log(`Agent enrolled: ${hostname} (${agentUuid})`);
        res.json({ status: 'success', agent_id: agentUuid, agent_key: agentKey });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/telemetry', async (req, res) => {
    const { agent_id } = req.body;
    try {
        const agent = await dbGet('SELECT agent_id FROM soc_agent WHERE agent_uuid = ?', [agent_id]);
        if (!agent) return res.status(404).json({ error: 'Agent not found' });
        await dbRun("UPDATE soc_agent SET last_seen = NOW() WHERE agent_uuid = ?", [agent_id]);
        await dbRun("UPDATE soc_host SET last_seen = NOW() WHERE host_id = (SELECT host_id FROM soc_agent WHERE agent_uuid = ?)", [agent_id]);
        res.json({ status: 'processed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/logs', async (req, res) => {
    const { agent_id, logs } = req.body;
    if (!logs || !Array.isArray(logs)) return res.status(400).json({ error: 'Invalid logs format' });

    try {
        const agent = await dbGet('SELECT agent_id, host_id FROM soc_agent WHERE agent_uuid = ?', [agent_id]);
        if (!agent) return res.status(404).json({ error: 'Agent not found' });

        for (const log of logs) {
            const result = await dbRun(`
                INSERT INTO soc_process_event
                    (host_id, agent_id, provider, event_type, timestamp, process_name, command_line, user_name)
                    VALUES (?, ?, 'Sysmon', 'ProcessCreate', NOW(), ?, ?, ?)
            `, [agent.host_id, agent.agent_id, log.process_name, log.command_line, log.user || 'SYSTEM']);
            
            if (redisClient) {
                const eventObj = {
                    event_id: result.lastID,
                    host_id: agent.host_id,
                    agent_id: agent.agent_id,
                    provider: 'Sysmon',
                    event_type: 'ProcessCreate',
                    process_name: log.process_name,
                    command_line: log.command_line,
                    user_name: log.user || 'SYSTEM',
                    timestamp: new Date().toISOString()
                };
                await redisClient.lPush('socflow_events_queue', JSON.stringify(eventObj));
            }
        }

        res.json({ status: 'processed', count: logs.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/agent/download', requireAuth, requireRole('Manager'), async (req, res) => {
    try {
        const zip = new AdmZip();
        const agentFolder = path.join(__dirname, '../agent');
        const files = ['agent_core.py', 'connect.py', 'install.ps1', 'install.py',
                       'requirements.txt', 'simulate_attack.ps1', 'simulate_attack.py'];
        for (const f of files) {
            try { zip.addLocalFile(path.join(agentFolder, f)); } catch (_) {}
        }
        const data = zip.toBuffer();
        res.set('Content-Type', 'application/octet-stream');
        res.set('Content-Disposition', 'attachment; filename=SOCflow_Agent_Installer.zip');
        res.set('Content-Length', data.length);
        res.send(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create agent bundle' });
    }
});

app.get('/api/vulnerabilities', requireAuth, async (req, res) => {
    res.json([
        { id: 1, cve: 'CVE-2024-38063', severity: 'critical', host: 'FIN-SRV-01', description: 'Windows TCP/IP Remote Code Execution', status: 'pending' },
        { id: 2, cve: 'CVE-2023-34362', severity: 'high',     host: 'DEV-WKST-04', description: 'MOVEit Transfer SQL Injection', status: 'mitigated' },
        { id: 3, cve: 'CVE-2024-21412', severity: 'medium',   host: 'FIN-SRV-01', description: 'Internet Shortcut Security Bypass', status: 'open' },
        { id: 4, cve: 'CVE-2024-30044', severity: 'critical', host: 'DEV-WKST-04', description: 'SharePoint Server RCE', status: 'pending' }
    ]);
});

app.get('/api/threat-map', requireAuth, async (req, res) => {
    res.json({
        globalThreatLevel: 'MODERATE',
        lastUpdate: new Date().toISOString(),
        nodes: [
            { id: 1, lat: 40.7128,  lng: -74.0060,  city: 'New York',   hostCount: 12, threatLevel: 'low' },
            { id: 2, lat: 51.5074,  lng: -0.1278,   city: 'London',     hostCount: 8,  threatLevel: 'medium' },
            { id: 3, lat: 35.6762,  lng: 139.6503,  city: 'Tokyo',      hostCount: 15, threatLevel: 'high' },
            { id: 4, lat: -33.8688, lng: 151.2093,  city: 'Sydney',     hostCount: 5,  threatLevel: 'low' },
            { id: 5, lat: 1.3521,   lng: 103.8198,  city: 'Singapore',  hostCount: 22, threatLevel: 'critical' }
        ]
    });
});

async function startup() {
    await initDB();
    await initRedis();
    audit.init(pool, dbRun);
    rehashSeededPasswords();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`SOCflow backend running on port ${PORT}`);
    });
}

startup();
