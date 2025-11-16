// File: backend/routes/articles.js

const express = require('express');
const router = express.Router();
const Article = require('../models/Article'); 
const multer = require('multer');
const { protect } = require('../middleware/auth');

// ☁️ RESTORED: Cloudinary Imports & Config
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const { 
    getArticles, 
    getArticleById, 
    createArticle, 
    updateArticle, 
    deleteArticle, 
    uploadImage,
    getAdminArticles,    
    updateArticleStatus,
    getArticlesByCategory,
    getRelatedArticles,
    getTopNews,
    searchArticles,
    getArticleBySlug,
    getHomeFeed 
} = require('../controllers/articleController');

// --- Cloudinary Configuration (UNCHANGED) ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'india_jagran_news', // Folder name in Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});

// Initialize Multer with Cloudinary Storage
const upload = multer({ storage }); 
// -----------------------------------

// Helper Middleware
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') { next(); } 
    else { res.status(403).json({ message: 'Not authorized as an admin' }); }
};

// ==================================================================
// ⚡ PRIORITY 1: SPECIAL & ADMIN ROUTES
// ==================================================================

// Admin Dashboard Route
router.get('/admin/all', protect, adminOnly, getAdminArticles);

// Optimized Home Feed
router.get('/feed', getHomeFeed);

// Search & Features
router.get('/search', searchArticles);
router.get('/top-news', getTopNews);
router.get('/related', getRelatedArticles);

// ==================================================================
// ⚡ PRIORITY 2: CATEGORY ROUTES
// ==================================================================
router.get('/category/:category', getArticlesByCategory);
router.get('/category/:category/:subcategory', getArticlesByCategory);
router.get('/category/:category/:subcategory/:district', getArticlesByCategory);

// ==================================================================
// ⚡ PRIORITY 3: GENERAL & DYNAMIC ROUTES
// ==================================================================

router.get('/', getArticles);
router.get('/slug/:slug', getArticleBySlug);
router.get('/id/:id', getArticleById); 

// ==================================================================
// ⚡ PRIORITY 4: WRITE OPERATIONS (FIXED & PROTECTED)
// ==================================================================

// 1. Create Article (Added Image Support)
// Note: Frontend se formData me 'featuredImage' key bhejna zaroori hai
router.post('/', protect, upload.single('featuredImage'), createArticle);

// 2. Update Article (🔥 CRITICAL FIX: Added Image Support)
// Ab jab aap edit karke nayi photo daalenge, ye middleware use pakad lega
router.put('/:id', protect, upload.single('featuredImage'), updateArticle);

// 3. Delete Article (Unchanged)
router.delete('/:id', protect, deleteArticle);

// 4. Direct Image Upload (For Rich Text Editor)
// Note: Standard field name usually 'file' hota hai editors me
router.post('/upload', protect, upload.single('image'), uploadImage);

// 5. Admin Status Update
router.put('/:id/status', protect, adminOnly, updateArticleStatus);

// ==================================================================
// ⚡ LAST PRIORITY: CATCH-ALL ID ROUTE
// ==================================================================
router.get('/:id', getArticleById);

module.exports = router;