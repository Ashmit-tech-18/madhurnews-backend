// File: backend/routes/articles.js (UPDATED: With Auth & Admin Middleware)

const express = require('express');
const router = express.Router();

// --- IMPORT MIDDLEWARE (Security Guards) ---
const auth = require('../middleware/auth');   // Checks if user is logged in
const admin = require('../middleware/admin'); // Checks if user is Admin
// -------------------------------------------

// Controller functions ko import karein
const {
    createArticle,
    getAllArticles,
    getArticleById,
    getArticleBySlug,
    getArticlesByCategory,
    getRelatedArticles, 
    getTopNews, 
    searchArticles,
    updateArticle,
    deleteArticle,
    generateSitemap
} = require('../controllers/articleController'); 

// --- Article Routes ---

// 1. CREATE ARTICLE (Protected: Logged in users only)
// Editor bhi likh sakta hai, isliye sirf 'auth' lagaya hai
router.post('/', auth, createArticle);

// 2. UPDATE ARTICLE (Protected: Admin Only)
// Editor update nahi kar payega
router.put('/:id', auth, admin, updateArticle);

// 3. DELETE ARTICLE (Protected: Admin Only)
// Editor delete nahi kar payega
router.delete('/:id', auth, admin, deleteArticle);


// --- PUBLIC ROUTES (Open for everyone) ---

// @route   GET /api/articles
// @desc    Get all articles
router.get('/', getAllArticles);

// @route   GET /api/articles/search
// @desc    Search articles by query (q)
router.get('/search', searchArticles);

// @route   GET /api/articles/sitemap
// @desc    Generate sitemap (Placed before dynamic ID routes)
router.get('/sitemap', generateSitemap);

// @route   GET /api/articles/id/:id
// @desc    Get article by ID
router.get('/id/:id', getArticleById);

// @route   GET /api/articles/slug/:slug
// @desc    Get article by slug
router.get('/slug/:slug', getArticleBySlug);

// --- CATEGORY ROUTES (UPDATED) ---

// Level 1: Category only (e.g., /category/national)
router.get('/category/:category', getArticlesByCategory);

// Level 2: Category + Subcategory (e.g., /category/national/uttar-pradesh)
router.get('/category/:category/:subcategory', getArticlesByCategory);

// Level 3: Category + Subcategory + District (e.g., /category/national/uttar-pradesh/lucknow)
router.get('/category/:category/:subcategory/:district', getArticlesByCategory);
// ---------------------------------------


// @route   GET /api/articles/related
// @desc    Get related articles (Supports limit)
router.get('/related', getRelatedArticles);

// @route   GET /api/articles/top-news
// @desc    Get top news articles (for sidebar)
router.get('/top-news', getTopNews);

module.exports = router;