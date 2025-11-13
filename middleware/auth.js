const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Header se token nikalein
    const authHeader = req.header('Authorization');

    // Check karein token hai ya nahi
    if (!authHeader) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // Token format: "Bearer <token>"
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ msg: 'Token format is incorrect' });
        }
        
        // Verify karein
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user; // User ID request me add kar di
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};