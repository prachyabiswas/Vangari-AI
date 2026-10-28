const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_development');

        const db = require('../db');
        const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [decoded.userId]);

        if (userCheck.rows.length === 0) {
            return res.status(401).json({ error: 'Unauthorized: Stale token, user does not exist in the database' });
        }

        req.user = decoded; // { userId, email, role }
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

module.exports = authMiddleware;
