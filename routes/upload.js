const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Set storage engine
const storage = multer.diskStorage({
  // --- FIX 1: 'destination' के लिए एक 'absolute' पाथ का इस्तेमाल करें ---
  // यह 'routes' फोल्डर से एक लेवल ऊपर (..) जाकर 'uploads' फोल्डर को ढूँढता है।
  // यह 100% रिलाएबल है।
  destination: path.join(__dirname, '..', 'uploads'),
  
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Check file type
function checkFileType(file, cb) {
  // Allowed extensions - ab video formats bhi shaamil hain
  const filetypes = /jpeg|jpg|png|gif|mp4|mov|avi|mkv|webm/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  
  // Allowed mime types - video ke liye bhi
  const mimetype = /image|video/.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Sirf Images ya Videos hi allow hain!'); // Error message update kiya
  }
}

// Init upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 200000000 }, // Limit badha kar 200MB kar diya hai 
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
}).single('image');

router.post('/', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      res.status(400).json({ msg: err });
    } else {
      if (req.file == undefined) {
        res.status(400).json({ msg: 'Error: No File Selected!' });
      } else {
        
        // --- FIX 2: filePath से शुरूआती स्लैश (/) हटा दें ---
        // अब यह "uploads/image.png" सेव करेगा, जो बिल्कुल सही है।
        res.status(200).json({
          msg: 'File Uploaded!',
          filePath: `uploads/${req.file.filename}`,
        });
        
      }
    }
  });
});

module.exports = router;