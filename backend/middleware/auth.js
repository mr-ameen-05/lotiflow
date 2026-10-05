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
    if (!roles.includes(req.session.user.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
};

module.exports = { requireAuth, requireRole };
