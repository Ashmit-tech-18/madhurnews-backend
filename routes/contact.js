// File: backend/routes/contact.js

const express = require('express');
const router = express.Router();
// Controller ko require karein (CommonJS syntax)
const { sendContactMessage } = require('../controllers/contactController');

// @route   POST /api/contact/send
// @desc    Send a contact form message
// @access  Public
router.post('/send', sendContactMessage);

// module.exports (CommonJS syntax)
module.exports = router;