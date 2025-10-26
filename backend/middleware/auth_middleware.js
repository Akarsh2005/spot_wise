const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Extract token and trim any extra spaces
    const token = authHeader.split(' ')[1].trim();

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role }
        next();
    } catch (err) {
        console.error('JWT verification error:', err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};