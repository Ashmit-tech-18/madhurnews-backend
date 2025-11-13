const User = require('../models/User');

module.exports = async function (req, res, next) {
    try {
        // auth.js se hume req.user.id mil chuka hai
        const user = await User.findById(req.user.id);
        
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admin rights required.' });
        }
        
        next(); // Agar admin hai to aage badho
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};