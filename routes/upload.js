const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// --- NEW IMPORTS FOR CLOUDINARY ---
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// --- NEW: Configure Cloudinary ---
// (Yeh aapke Render environment variables se keys utha lega)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- PURANA CODE (DELETED) ---
// const storage = multer.diskStorage({...});
// Iski zaroorat nahin hai kyunki ab hum Cloudinary par save kar rahe hain.
// ---

// --- NEW: Configure Cloudinary Storage ---
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'madhurnews', // Cloudinary mein 'madhurnews' naam ka folder ban jaayega
    resource_type: 'auto', // Yeh image/video automatically detect kar lega
    allowed_formats: ['jpeg', 'jpg', 'png', 'gif', 'mp4', 'mov', 'avi', 'mkv', 'webm'],
  },
});

// --- PURANA CODE (DELETED) ---
// function checkFileType(file, cb) { ... }
// Iski zaroorat nahin hai, Cloudinary 'allowed_formats' se yeh kaam kar lega.
// ---

// --- UPDATED: Init upload ---
// 'storage' ab Cloudinary waala hai
const upload = multer({
  storage: storage,
  limits: { fileSize: 200000000 }, // 200MB limit (waisi hi hai)
}).single('image'); // 'image' field name waisa hi hai

// --- UPDATED: router.post('/') ---
// Ab yeh Cloudinary URL waapas bhejega
router.post('/', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      // Agar Cloudinary se error aata hai (jaise galat file type)
      return res.status(400).json({ msg: err.message || 'File upload failed' });
    }
    
    if (req.file == undefined) {
      return res.status(400).json({ msg: 'Error: No File Selected!' });
    }

    // --- YEH SABSE IMPORTANT FIX HAI ---
    // Hum ab local path ('uploads/...') ke bajaaye
    // Cloudinary ka poora URL ('https://res.cloudinary.com/...') bhej rahe hain.
    res.status(200).json({
      msg: 'File Uploaded to Cloudinary!',
      filePath: req.file.path, // Yeh Cloudinary ka URL hai
      fileType: req.file.resource_type // Yeh batayega ki file image hai ya video
    });
    
  });
});

module.exports = router;