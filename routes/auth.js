const express = require('express');
const router = express.Router();
// Import updateUser function here
const { registerUser, loginUser, getAllEditors, deleteUser, updateUser } = require('../controllers/authController');
const auth = require('../middleware/auth'); // Token check karne ke liye
const admin = require('../middleware/admin'); // Admin check karne ke liye

// @route   POST api/auth/register
router.post('/register', registerUser);

// @route   POST api/auth/login
router.post('/login', loginUser);

// --- NEW ROUTES ---

// @route   GET api/auth/editors
// @desc    Get all editors (Admin Only)
router.get('/editors', auth, admin, getAllEditors);

// @route   DELETE api/auth/users/:id
// @desc    Delete a user (Admin Only)
router.delete('/users/:id', auth, admin, deleteUser);

// --- NEW ROUTE: Update User ---
// @route   PUT api/auth/users/:id
// @desc    Update email or password (Admin Only)
router.put('/users/:id', auth, admin, updateUser); // <--- YE ADD KIYA HAI

module.exports = router;