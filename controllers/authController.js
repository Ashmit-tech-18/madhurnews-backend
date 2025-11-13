const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Register (Existing)
exports.registerUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }
        user = new User({ email, password });
        await user.save();
        res.status(201).json({ msg: 'User registered successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// 2. Login (Existing)
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        
        const payload = { user: { id: user.id } };
        
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                res.json({ 
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        role: user.role || 'editor'
                    }
                });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- NEW: Get All Users (For Admin Dashboard) ---
exports.getAllEditors = async (req, res) => {
    try {
        // Password mat bhejo security ke liye (.select('-password'))
        const users = await User.find({ role: 'editor' }).select('-password').sort({ date: -1 });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- NEW: Delete User (For Admin Dashboard) ---
exports.deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ msg: 'User deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- NEW FUNCTION: Update User (Email/Password) ---
exports.updateUser = async (req, res) => {
    const { email, newPassword } = req.body;

    try {
        // 1. User find karo
        let user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // 2. Agar email update karna hai
        if (email) {
            user.email = email;
        }

        // 3. Agar password update karna hai
        // Note: User model me 'pre-save' hook password ko hash kar dega, 
        // isliye hum yahan seedha assign kar rahe hain.
        if (newPassword && newPassword.trim() !== "") {
            user.password = newPassword;
        }

        // 4. Save changes
        await user.save();

        res.json({ msg: 'User updated successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};