const express = require('express');
const router = express.Router();
// Dhyan de: Controller ka path sahi hona chahiye
const { getRSSFeed } = require('../controllers/rssController'); 

// Route define karein
// Kyunki server.js me humne ise '/api' se joda hai, yahan sirf '/feed.xml' likhenge.
router.get('/feed.xml', getRSSFeed);

module.exports = router;