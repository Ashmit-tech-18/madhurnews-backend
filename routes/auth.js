// File: backend/routes/auth.js

const express = require('express');
const router = express.Router();
const User = require('../models/User'); 

// Import Controllers
const { 
    registerUser, 
    loginUser, 
    getMe,
    updateDetails, 
    getEditors,     
    deleteUser,     
    updateUser,     
    subscribeUser,   
    getSubscribers   
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

// Helper Middleware for Admin
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

// --- Public Auth Routes ---
router.post('/register', registerUser);
router.post('/login', loginUser);

// --- Private User Routes ---
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails); // Update Self Password/Name

// --- Admin Team Management Routes ---
router.get('/editors', protect, adminOnly, getEditors); 
router.delete('/users/:id', protect, adminOnly, deleteUser);
router.put('/users/:id', protect, adminOnly, updateUser);

// --- Subscriber Routes ---
router.post('/subscribe', subscribeUser); // Public
router.get('/subscribers', protect, adminOnly, getSubscribers); // Admin Only

module.exports = router;