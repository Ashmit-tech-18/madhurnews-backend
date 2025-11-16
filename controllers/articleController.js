// File: backend/controllers/articleController.js

const Article = require('../models/Article');
const axios = require('axios');
const multer = require('multer');
const path = require('path');

// --- Helper functions ---
const createSlug = (title) => {
    if (!title) return '';
    return title.toString().toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
};
const formatTitle = (text = '') => {
    return text.replace(/\b\w/g, char => char.toUpperCase());
};
const createSmartRegex = (text) => {
    if (!text) return new RegExp(".*"); 
    const escapedText = text.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^\\s*${escapedText}\\s*$`, 'i');
};

// ---------------------------------------------------------
// 1. CREATE ARTICLE
// ---------------------------------------------------------
const createArticle = async (req, res) => {
    const { 
        title_en, title_hi, summary_en, summary_hi, content_en, content_hi, 
        category, subcategory, district, featuredImage, galleryImages,
        urlHeadline, shortHeadline, longHeadline, kicker, keywords,
        author, sourceUrl, thumbnailCaption
    } = req.body;

    const slugTitle = urlHeadline || longHeadline || title_en || title_hi;
    if (!slugTitle || slugTitle.trim() === '') {
         return res.status(400).json({ msg: 'Title required for slug.' });
    }
    
    let slug = createSlug(slugTitle);

    try {
        const articleExists = await Article.findOne({ slug });
        if (articleExists) slug = `${slug}-${Date.now()}`;

        const userRole = req.user ? req.user.role : 'admin'; 
        const initialStatus = userRole === 'admin' ? 'published' : 'pending';
        const userId = req.user ? req.user.id : null;

        const newArticle = new Article({
            title_en: title_en || '', title_hi: title_hi || '',
            summary_en: summary_en || '', summary_hi: summary_hi || '',
            content_en: content_en || '', content_hi: content_hi || '',
            slug, category, subcategory, district: district || '',
            featuredImage, galleryImages: galleryImages || [],
            urlHeadline: urlHeadline || '', shortHeadline: shortHeadline || '',
            longHeadline: longHeadline || '', kicker: kicker || '',
            keywords: keywords || [], 
            author: author || (req.user ? req.user.name : 'India Jagran'),
            sourceUrl: sourceUrl || '', thumbnailCaption: thumbnailCaption || '',
            user: userId,
            status: initialStatus
        });

        const savedArticle = await newArticle.save();
        res.status(201).json(savedArticle);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------
// 2. GET ARTICLES (Public - Only Published)
// ---------------------------------------------------------
const getArticles = async (req, res) => {
    try {
        const articles = await Article.find({ 
            $or: [{ status: 'published' }, { status: { $exists: false } }] 
        }).sort({ createdAt: -1 });
        
        res.json(articles);
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------
// 🔥 NEW: SMART HOME FEED (Ensures Every Section is Filled)
// ---------------------------------------------------------
const getHomeFeed = async (req, res) => {
    try {
        // Categories for Homepage Sections
        const categoriesToFetch = [
            'Sports', 'Business', 'Tech', 'Education', 
            'Health', 'Environment', 'Opinion', 'National', 'World'
        ];
        
        const queries = [];
        
        // Query A: Get General Latest News (Top 20)
        queries.push(
             Article.find({ 
                 $or: [{ status: 'published' }, { status: { $exists: false } }] 
             })
            .sort({ createdAt: -1 })
            .limit(20)
            .select('-content_en -content_hi -keywords')
            .lean()
        );

        // Query B: Get Top 6 Articles for EACH Category
        categoriesToFetch.forEach(cat => {
            const regex = new RegExp(`^${cat}$`, 'i');
            let catQuery = { category: regex };

            if (cat === 'Tech') {
                catQuery = { $or: [{ category: regex }, { category: /Science/i }, { category: /Tech/i }] };
            } else if (cat === 'Business') {
                catQuery = { $or: [{ category: regex }, { category: /Finance/i }, { category: /Vyapar/i }, { category: /Business/i }] };
            }

            queries.push(
                Article.find({ 
                    $or: [{ status: 'published' }, { status: { $exists: false } }],
                    ...catQuery
                })
                .sort({ createdAt: -1 })
                .limit(6)
                .select('-content_en -content_hi -keywords')
                .lean()
            );
        });

        const results = await Promise.all(queries);
        
        // Merge and Remove Duplicates
        let allFetchedArticles = results.flat();
        const uniqueArticlesMap = new Map();
        allFetchedArticles.forEach(article => {
            uniqueArticlesMap.set(article._id.toString(), article);
        });
        const uniqueArticles = Array.from(uniqueArticlesMap.values());

        res.json(uniqueArticles);

    } catch (err) {
        console.error("Home Feed Error:", err);
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------
// ADMIN FUNCTIONS
// ---------------------------------------------------------

const uploadImage = async (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    res.status(200).json({ filePath: `/uploads/${req.file.filename}` });
};

const getAdminArticles = async (req, res) => {
    try {
        const articles = await Article.find().sort({ createdAt: -1 });
        res.json(articles);
    } catch (err) { res.status(500).send('Server Error'); }
};

const updateArticleStatus = async (req, res) => {
    try {
        const { status } = req.body; 
        const article = await Article.findByIdAndUpdate(
            req.params.id, { status: status }, { new: true }
        );
        if (!article) return res.status(404).json({ msg: 'Article not found' });
        res.json(article);
    } catch (err) { res.status(500).send('Server Error'); }
};

// ---------------------------------------------------------
// READER FUNCTIONS
// ---------------------------------------------------------

const getArticleById = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) return res.status(404).json({ msg: 'Article not found' });
        article.views = (article.views || 0) + 1;
        await article.save({ validateBeforeSave: false });
        res.json(article);
    } catch (err) { res.status(500).send('Server Error'); }
};

const getArticleBySlug = async (req, res) => {
    try {
        const article = await Article.findOne({ slug: req.params.slug });
        if (!article) return res.status(404).json({ msg: 'Article not found' });
        article.views = (article.views || 0) + 1;
        await article.save({ validateBeforeSave: false });
        res.json(article);
    } catch (err) { res.status(500).send('Server Error'); }
};

const getArticlesByCategory = async (req, res) => {
    try {
        const { category, subcategory, district } = req.params;
        const categoryEquivalents = {
            national: ['National', 'राष्ट्रीय'], world: ['World', 'विश्व'], politics: ['Politics', 'राजनीति'],
            business: ['Business', 'व्यापार', 'Finance', 'वित्त'], entertainment: ['Entertainment', 'मनोरंजन'],
            sports: ['Sports', 'खेल'], education: ['Education', 'शिक्षा'], health: ['Health', 'स्वास्थ्य'],
            tech: ['Tech', 'टेक'], religion: ['Religion', 'धर्म'], environment: ['Environment', 'पर्यावरण'],
            crime: ['Crime', 'क्राइम'], opinion: ['Opinion', 'विचार'], 'uttar-pradesh': ['Uttar Pradesh', 'उत्तर प्रदेश']
        };

        let categoryKey = null;
        for (const key in categoryEquivalents) {
            if (categoryEquivalents[key].map(c => c.toLowerCase()).includes(category.toLowerCase())) {
                categoryKey = key; break;
            }
        }

        let query = { $or: [{ status: 'published' }, { status: { $exists: false } }] }; 

        if (categoryKey === 'world' && subcategory && subcategory.toLowerCase() === 'environment') {
            query.$or = [
                { category: 'World', subcategory: createSmartRegex('Environment') },
                { category: createSmartRegex('Environment') },
                { category: createSmartRegex('पर्यावरण') }
            ];
        } else if (categoryKey === 'world' && subcategory && subcategory.toLowerCase() === 'tech') {
            query.$or = [
                { category: 'World', subcategory: createSmartRegex('Tech') },
                { category: createSmartRegex('Tech') },
                { category: createSmartRegex('टेक') }
            ];
        } else {
            if (categoryKey) {
                const names = categoryEquivalents[categoryKey];
                query.category = { $in: names.map(name => createSmartRegex(name)) };
            } else {
                query.category = createSmartRegex(category);
            }
            if (subcategory) query.subcategory = createSmartRegex(subcategory.replace(/-/g, ' '));
            if (district) query.district = createSmartRegex(district.replace(/-/g, ' '));
        }

        let articles = await Article.find(query).sort({ createdAt: -1 }).limit(100);

        // GNews Fallback
        if (articles.length === 0 && !subcategory && !district && process.env.GNEWS_API_KEY) {
            res.json([]); 
            fetchAndStoreNewsForCategory(category);
        } else {
            res.json(articles);
        }
    } catch (err) { res.json([]); }
};

const getRelatedArticles = async (req, res) => {
    try {
        const { category, slug, lang, limit } = req.query;
        const limitNum = limit ? parseInt(limit) : 4; 
        let query = { category: createSmartRegex(category), slug: { $ne: slug }, status: 'published' };
        if (lang === 'hi') query.title_hi = { $ne: null, $ne: "" };
        else query.title_en = { $ne: null, $ne: "" };
        const articles = await Article.find(query).sort({ createdAt: -1 }).limit(limitNum);
        res.json(articles);
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

const getTopNews = async (req, res) => {
    try {
        const { lang } = req.query; 
        let query = { status: 'published' }; 
        if (lang === 'hi') query.title_hi = { $ne: null, $ne: "" };
        else query.title_en = { $ne: null, $ne: "" };
        const articles = await Article.find(query).sort({ createdAt: -1 }).limit(5); 
        res.status(200).json(articles);
    } catch (error) { res.status(500).json({ message: "Failed" }); }
};

const searchArticles = async (req, res) => {
    try {
        const searchQuery = req.query.q;
        if (!searchQuery) return res.status(400).json({ msg: 'Query required' });
        const searchRegex = new RegExp(searchQuery, 'i');
        const articles = await Article.find({
            status: 'published',
            $or: [
                { title_en: { $regex: searchRegex } }, { title_hi: { $regex: searchRegex } },
                { summary_en: { $regex: searchRegex } }, { summary_hi: { $regex: searchRegex } },
                { longHeadline: { $regex: searchRegex } }, { district: { $regex: searchRegex } }
            ]
        }).sort({ createdAt: -1 }).limit(20);
        res.status(200).json(articles); 
    } catch (err) { res.status(200).json([]); }
};

const updateArticle = async (req, res) => {
    try {
        let article = await Article.findById(req.params.id);
        if (!article) return res.status(404).json({ msg: 'Article not found' });
        article = await Article.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        res.json(article);
    } catch (err) { res.status(500).send('Server Error'); }
};

const deleteArticle = async (req, res) => {
    try {
        await Article.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Article removed' });
    } catch (err) { res.status(500).send('Server Error'); }
};

// --- GNEWS & SITEMAP ---

const fetchAndStoreNewsForCategory = async (category) => {
    let newArticlesCount = 0;
    try {
        const categoryForQuery = category.toLowerCase();
        let apiTopic = categoryForQuery;
        const validTopics = ['world', 'nation', 'business', 'technology', 'entertainment', 'sports', 'science', 'health'];
        if (['national', 'politics'].includes(apiTopic)) apiTopic = 'nation';
        else if (!validTopics.includes(apiTopic)) return; 

        const apiParams = { lang: 'en', country: 'in', topic: apiTopic, token: process.env.GNEWS_API_KEY };
        const newsApiResponse = await axios.get(`https://gnews.io/api/v4/top-headlines`, { params: apiParams });
        const fetchedArticles = newsApiResponse.data.articles;

        for (const articleData of fetchedArticles) {
            const newSlug = createSlug(articleData.title);
            const existingArticle = await Article.findOne({ slug: newSlug });
            if (!existingArticle && articleData.image && articleData.description) {
                const newArticle = new Article({
                    title_en: articleData.title, 
                    content_en: articleData.description,
                    urlHeadline: newSlug, slug: newSlug, category: formatTitle(category),
                    author: articleData.source.name || 'GNews', sourceUrl: articleData.url,
                    featuredImage: articleData.image, thumbnailCaption: '', galleryImages: [],
                    status: 'published', 
                    createdAt: new Date(articleData.publishedAt),
                });
                await newArticle.save();
                newArticlesCount++;
            }
        }
        if (newArticlesCount > 0) console.log(`[Auto-Fetch] Saved ${newArticlesCount} for ${category}`);
    } catch (err) { console.error(`[Auto-Fetch] Error:`, err.message); }
};

const runGNewsAutoFetch = async () => {
    console.log(`[${new Date().toISOString()}] Running GNews fetch...`);
    const categoriesToFetch = ['National', 'World', 'Politics', 'Business', 'Entertainment', 'Sports', 'Education', 'Health', 'Tech', 'Religion', 'Environment','Crime', 'Opinion'];
    for (const category of categoriesToFetch) await fetchAndStoreNewsForCategory(category);
    console.log(`Job complete.`);
};

const generateSitemap = async (req, res) => {
    const staticCategories = ['national', 'politics', 'business', 'finance', 'entertainment', 'sports', 'world', 'education', 'health', 'tech', 'religion', 'environment', 'crime', 'opinion'];
    const staticPages = ['', 'about', 'contact', 'privacy-policy', 'terms-condition', 'subscribe'];
    try {
        const baseUrl = process.env.FRONTEND_URL;
        if (!baseUrl) return res.status(500).send('Server Error: FRONTEND_URL missing');
        let xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        const today = new Date().toISOString();
        staticPages.forEach(p => xml += `<url><loc>${baseUrl}/${p}</loc><lastmod>${today}</lastmod><priority>${p===''?1.0:0.8}</priority></url>`);
        staticCategories.forEach(c => xml += `<url><loc>${baseUrl}/category/${c}</loc><lastmod>${today}</lastmod><priority>0.9</priority></url>`);
        const articles = await Article.find({status: 'published'}).select('slug createdAt').sort({ createdAt: -1 });
        articles.forEach(a => xml += `<url><loc>${baseUrl}/article/${a.slug}</loc><lastmod>${a.createdAt.toISOString()}</lastmod><priority>0.7</priority></url>`);
        xml += '</urlset>';
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (err) { res.status(500).send('Server Error'); }
};

// 🔥 EXPORTS
module.exports = {
    createArticle, getArticles, getArticleById, getArticleBySlug,
    getArticlesByCategory, getRelatedArticles, getTopNews, searchArticles,
    updateArticle, deleteArticle, runGNewsAutoFetch, generateSitemap,
    getAdminArticles, updateArticleStatus, uploadImage,
    getHomeFeed 
};