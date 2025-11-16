// File: backend/routes/articles.js

const express = require('express');
const router = express.Router();
const Article = require('../models/Article'); 
const multer = require('multer');
const { protect } = require('../middleware/auth');

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
    getHomeFeed // <--- Imported
} = require('../controllers/articleController');

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => { cb(null, `${Date.now()}-${file.originalname}`); },
});
const upload = multer({ storage });

// Helper Middleware
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') { next(); } 
    else { res.status(403).json({ message: 'Not authorized as an admin' }); }
};



// ==================================================================
// 🔥 PRIORITY 1: SPECIAL & ADMIN ROUTES
// ==================================================================

// Admin Dashboard Route
router.get('/admin/all', protect, adminOnly, getAdminArticles);

// Optimized Home Feed Route
router.get('/feed', getHomeFeed);

// Search & Features
router.get('/search', searchArticles);
router.get('/top-news', getTopNews);
router.get('/related', getRelatedArticles);

// ==================================================================
// 🔥 PRIORITY 2: CATEGORY ROUTES
// ==================================================================
router.get('/category/:category', getArticlesByCategory);
router.get('/category/:category/:subcategory', getArticlesByCategory);
router.get('/category/:category/:subcategory/:district', getArticlesByCategory);

// ==================================================================
// 🔥 PRIORITY 3: GENERAL & DYNAMIC ROUTES
// ==================================================================

// Public Feed
router.get('/', getArticles);

// Get By Slug
router.get('/slug/:slug', getArticleBySlug);

// Get By ID
router.get('/id/:id', getArticleById); 

// ==================================================================
// 🔥 PRIORITY 4: WRITE OPERATIONS (Protected)
// ==================================================================

router.post('/', protect, createArticle);
router.put('/:id', protect, updateArticle);
router.delete('/:id', protect, deleteArticle);
router.post('/upload', protect, upload.single('image'), uploadImage);

// Admin Status Update
router.put('/:id/status', protect, adminOnly, updateArticleStatus);

// ==================================================================
// 🔥 LAST PRIORITY: CATCH-ALL ID ROUTE
// ==================================================================
router.get('/:id', getArticleById);

module.exports = router;