const requireAuth = (req, res, next) => {
    if (!req.session?.user) {
        return res.status(401).json({ error: 'Unauthorized: No active session' });
    }
    next();
};

const requireRole = (...roles) => (req, res, next) => {
    if (!req.session?.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userRole = (req.session.user.role || '').toUpperCase();
    const allowed = roles.map(r => r.toUpperCase());
    if (!allowed.includes(userRole)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
};

module.exports = { requireAuth, requireRole };
