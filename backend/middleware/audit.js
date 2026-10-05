let _dbRun = null;

const init = (db, dbRunFn) => { _dbRun = dbRunFn; };

const logAuditAction = async (userId, actionType, objectType, objectId, details, ipAddress) => {
    if (!_dbRun) return;
    try {
        await _dbRun(
            'INSERT INTO soc_audit_log (user_id, action_type, object_type, object_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
            [userId || null, actionType, objectType || null, objectId || null,
             details ? JSON.stringify(details) : null, ipAddress || null]
        );
    } catch (err) {
        console.error('Audit log error:', err.message);
    }
};

module.exports = { init, logAuditAction };
