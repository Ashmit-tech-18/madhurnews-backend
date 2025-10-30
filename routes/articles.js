const express = require('express');
const router = express.Router();
const {
    createArticle,
    getAllArticles,
    getArticleBySlug,
    updateArticle,
    deleteArticle,
    getArticlesByCategory,
    searchArticles,
    getArticleById,
    generateSitemap // --- FIX 1: Sitemap function ko import karein ---
} = require('../controllers/articleController');
const auth = require('../middleware/authMiddleware');

// --- Public Routes ---
router.get('/', getAllArticles);
router.get('/search', searchArticles);

// --- FIX 2: Naya sitemap route add karein ---
// (Yeh route /:slug se pehle hona zaroori hai)
router.get('/sitemap', generateSitemap); 

// Category routes ko generic /:slug se pehle rakha gaya hai
router.get('/category/:category', getArticlesByCategory);
router.get('/category/:category/:subcategory', getArticlesByCategory);

// --- Protected Admin Routes ---
router.post('/', auth, createArticle);
router.put('/:id', auth, updateArticle);
router.delete('/:id', auth, deleteArticle);

router.get('/id/:id', getArticleById);

// Yeh route hamesha AAKHIR me hona chahiye
router.get('/:slug', getArticleBySlug); 

module.exports = router;