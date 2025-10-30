const express = require('express');
const router = express.Router();
const { addSubscriber } = require('../controllers/subscriberController');

// @route   POST api/subscribers
// @desc    Add a new subscriber
router.post('/', addSubscriber);

module.exports = router;