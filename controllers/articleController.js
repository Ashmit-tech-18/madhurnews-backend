// File: backend/controllers/articleController.js

const Article = require('../models/Article');
const axios = require('axios');

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
    // Special characters ko escape karein
    const escapedText = text.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^\\s*${escapedText}\\s*$`, 'i');
};

// 🔥 BULLETPROOF HINDI REGEX GENERATOR
const getHindiRegex = () => {
    const startChar = String.fromCharCode(0x0900); // Devanagari Start
    const endChar = String.fromCharCode(0x097F);   // Devanagari End
    return new RegExp(`[${startChar}-${endChar}]`);
};

// --- Category Mapping ---
const categoryEquivalents = {
    national: ['National', 'राष्ट्रीय', 'India', 'भारत', 'Nation'], 
    world: ['World', 'विश्व', 'International'], 
    politics: ['Politics', 'राजनीति'],
    business: ['Business', 'व्यापार', 'Finance', 'वित्त'], 
    entertainment: ['Entertainment', 'मनोरंजन', 'Bollywood', 'Cinema'],
    sports: ['Sports', 'खेल', 'Cricket'], 
    education: ['Education', 'शिक्षा', 'Career'], 
    health: ['Health', 'स्वास्थ्य', 'Lifestyle'],
    tech: ['Tech', 'टेक', 'Technology', 'Gadgets'], 
    religion: ['Religion', 'धर्म', 'Astrology'], 
    environment: ['Environment', 'पर्यावरण'],
    crime: ['Crime', 'क्राइम'], 
    opinion: ['Opinion', 'विचार', 'Editorial'], 
    'uttar-pradesh': ['Uttar Pradesh', 'उत्तर प्रदेश', 'UP']
};

// ---------------------------------------------------------
// 1. CREATE ARTICLE
// ---------------------------------------------------------
const createArticle = async (req, res) => {
    try {
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
        let finalFeaturedImage = featuredImage;
        if (req.file && req.file.path) {
            finalFeaturedImage = req.file.path;
        }

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
            featuredImage: finalFeaturedImage,
            galleryImages: galleryImages || [],
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
        console.error("Create Article Error:", err.message);
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------
// 2. GET ARTICLES (🔥 RESTORED: NO LIMIT, ONLY OPTIMIZATION)
// ---------------------------------------------------------
const getArticles = async (req, res) => {
    try {
        // 🚨 CRITICAL RESTORE: Removing 'limit' and 'skip'
        // Frontend needs ALL articles to filter categories locally.
        
        const articles = await Article.find({ 
            $or: [{ status: 'published' }, { status: { $exists: false } }] 
        })
        .sort({ createdAt: -1 })
        // ✅ Optimization Kept: We exclude the HEAVY content body.
        // This reduces size from 1MB -> ~50KB without breaking layout.
        .select('-content_en -content_hi'); 

        res.json(articles);
    } catch (err) { 
        console.error("Get Articles Error:", err);
        res.status(500).send('Server Error'); 
    }
};

// ---------------------------------------------------------
// SMART HOME FEED
// ---------------------------------------------------------
const getHomeFeed = async (req, res) => {
    try {
        const categoriesToFetch = [
            'Sports', 'Business', 'Tech', 'Education', 
            'Health', 'Environment', 'Opinion', 'National', 'World'
        ];
        
        const { lang } = req.query; 
        const hindiRegex = getHindiRegex();
        let langQuery = {};

        if (lang === 'hi') {
            langQuery.$or = [
                { longHeadline: { $regex: hindiRegex } },
                { title_en: { $regex: hindiRegex } },
                { shortHeadline: { $regex: hindiRegex } },
                { title: { $regex: hindiRegex } }
            ];
        } else {
            langQuery.$and = [
                { longHeadline: { $not: { $regex: hindiRegex } } },
                { title_en: { $not: { $regex: hindiRegex } } },
                { shortHeadline: { $not: { $regex: hindiRegex } } },
                { title: { $not: { $regex: hindiRegex } } } 
            ];
        }

        const queries = [];
        const baseStatusQuery = { $or: [{ status: 'published' }, { status: { $exists: false } }] };

        // 1. MAIN STORY (Content Allowed)
        queries.push(
             Article.find({ 
                 $and: [ baseStatusQuery, langQuery ] 
             })
            .sort({ createdAt: -1 })
            .limit(1)
            .select('-keywords')
            .lean()
        );

        // 2. REMAINING LATEST (Content Excluded)
        queries.push(
             Article.find({ 
                 $and: [ baseStatusQuery, langQuery ] 
             })
            .sort({ createdAt: -1 })
            .skip(1)
            .limit(19)
            .select('-content_en -content_hi -keywords') 
            .lean()
        );

        // 3. Category Specific
        categoriesToFetch.forEach(cat => {
            let catQuery = {};
            const key = Object.keys(categoryEquivalents).find(k => 
                categoryEquivalents[k].some(c => c.toLowerCase() === cat.toLowerCase())
            );

            if (key) {
                const names = categoryEquivalents[key];
                catQuery = { category: { $in: names.map(name => createSmartRegex(name)) } };
            } else {
                catQuery = { category: createSmartRegex(cat) };
            }

            queries.push(
                Article.find({ 
                    $and: [ baseStatusQuery, catQuery, langQuery ] 
                })
                .sort({ createdAt: -1 })
                .limit(6)
                .select('-content_en -content_hi -keywords') 
                .lean()
            );
        });

        const results = await Promise.all(queries);
        let allFetchedArticles = results.flat();
        
        const uniqueArticlesMap = new Map();
        allFetchedArticles.forEach(article => uniqueArticlesMap.set(article._id.toString(), article));
        
        res.json(Array.from(uniqueArticlesMap.values()));

    } catch (err) {
        console.error("Home Feed Error:", err);
        res.status(500).send('Server Error');
    }
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
        const { lang } = req.query;

        let categoryKey = null;
        for (const key in categoryEquivalents) {
            if (categoryEquivalents[key].map(c => c.toLowerCase()).includes(category.toLowerCase())) {
                categoryKey = key; break;
            }
        }

        let baseQuery = { $or: [{ status: 'published' }, { status: { $exists: false } }] }; 
        let catFilter = {};

        if (categoryKey === 'world' && subcategory && subcategory.toLowerCase() === 'environment') {
            catFilter.$or = [
                { category: 'World', subcategory: createSmartRegex('Environment') },
                { category: createSmartRegex('Environment') },
                { category: createSmartRegex('पर्यावरण') }
            ];
        } else if (categoryKey === 'world' && subcategory && subcategory.toLowerCase() === 'tech') {
            catFilter.$or = [
                { category: 'World', subcategory: createSmartRegex('Tech') },
                { category: createSmartRegex('Tech') },
                { category: createSmartRegex('टेक') }
            ];
        } else {
            if (categoryKey) {
                const names = categoryEquivalents[categoryKey];
                catFilter.category = { $in: names.map(name => createSmartRegex(name)) };
            } else {
                catFilter.category = createSmartRegex(category);
            }
            if (subcategory) catFilter.subcategory = createSmartRegex(subcategory.replace(/-/g, ' '));
            if (district) catFilter.district = createSmartRegex(district.replace(/-/g, ' '));
        }

        const hindiRegex = getHindiRegex();
        let langQuery = {};
        if (lang === 'hi') {
            langQuery.$or = [
                { longHeadline: { $regex: hindiRegex } },
                { title_en: { $regex: hindiRegex } },
                { shortHeadline: { $regex: hindiRegex } },
                { category: { $regex: hindiRegex } }
            ];
        } else {
            langQuery.$and = [
                { longHeadline: { $not: { $regex: hindiRegex } } },
                { title_en: { $not: { $regex: hindiRegex } } },
                { shortHeadline: { $not: { $regex: hindiRegex } } }
            ];
        }

        const finalQuery = {
            $and: [
                baseQuery,
                catFilter,
                ...(Object.keys(langQuery).length > 0 ? [langQuery] : [])
            ]
        };


        let articles = await Article.find(finalQuery)
        .sort({ createdAt: -1 })
        .limit(300)
        .select('-content_en -content_hi'); 

        if (articles.length === 0 && !subcategory && !district && process.env.GNEWS_API_KEY) {
            res.json([]); 
            fetchAndStoreNewsForCategory(category);
        } else {
            res.json(articles);
        }
    } catch (err) { 
        console.error("Category Error:", err);
        res.json([]); 
    }
};

const getRelatedArticles = async (req, res) => {
    try {
        const { category, slug, lang, limit } = req.query;
        const limitNum = limit ? parseInt(limit) : 6; 
        
        const hindiRegex = getHindiRegex();
        
        let queryCriteria = [
             { category: createSmartRegex(category) },
             { slug: { $ne: slug } },
             { status: 'published' }
        ];

        if (lang === 'hi') {
            queryCriteria.push({
                $or: [
                    { longHeadline: { $regex: hindiRegex } },
                    { title_en: { $regex: hindiRegex } },
                    { shortHeadline: { $regex: hindiRegex } }
                ]
            });
        } else {
             queryCriteria.push({
                $and: [
                    { longHeadline: { $not: { $regex: hindiRegex } } },
                    { title_en: { $not: { $regex: hindiRegex } } },
                    { shortHeadline: { $not: { $regex: hindiRegex } } }
                ]
            });
        }
        
        const articles = await Article.find({ $and: queryCriteria })
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .select('-content_en -content_hi');
        res.json(articles);
    } catch (error) { 
        console.error("Related Articles Error:", error);
        res.status(500).json({ message: 'Server Error' }); 
    }
};

const getTopNews = async (req, res) => {
    try {
        const { lang, exclude } = req.query; 
        
        let queryCriteria = [{ status: 'published' }];
        
        if (exclude) {
            queryCriteria.push({ slug: { $ne: exclude } });
        }
        
        const hindiRegex = getHindiRegex();

        if (lang === 'hi') {
            queryCriteria.push({
                $or: [
                    { longHeadline: { $regex: hindiRegex } },
                    { title_en: { $regex: hindiRegex } },
                    { shortHeadline: { $regex: hindiRegex } }
                ]
            });
        } else {
             queryCriteria.push({
                $and: [
                    { longHeadline: { $not: { $regex: hindiRegex } } },
                    { title_en: { $not: { $regex: hindiRegex } } },
                    { shortHeadline: { $not: { $regex: hindiRegex } } }
                ]
            });
        }

        const articles = await Article.find({ $and: queryCriteria })
        .sort({ createdAt: -1 })
        .limit(6)
        .select('-content_en -content_hi');
        res.status(200).json(articles);
    } catch (error) { 
        console.error("Top News Error:", error);
        res.status(500).json({ message: "Failed" }); 
    }
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
        })
            .sort({ createdAt: -1 })
            .limit(20)
            .select('-content_en -content_hi');
        res.status(200).json(articles); 
    } catch (err) { res.status(200).json([]); }
};

const uploadImage = async (req, res) => { if (!req.file) return res.status(400).send('No file uploaded.'); res.status(200).json({ filePath: req.file.path }); };

const getAdminArticles = async (req, res) => {
    try {
        const articles = await Article.find()
            .sort({ createdAt: -1 })
            .select('-content_en -content_hi -summary_en -summary_hi -keywords -galleryImages'); 
        res.json(articles);
    } catch (err) {
        console.error("Admin Fetch Error:", err);
        res.status(500).send('Server Error');
    }
};

const updateArticleStatus = async (req, res) => { try { const { status } = req.body; const article = await Article.findByIdAndUpdate(req.params.id, { status: status }, { new: true }); if (!article) return res.status(404).json({ msg: 'Article not found' }); res.json(article); } catch (err) { res.status(500).send('Server Error'); } };
const updateArticle = async (req, res) => { try { let updateData = { ...req.body }; if (req.file && req.file.path) { updateData.featuredImage = req.file.path; } let article = await Article.findById(req.params.id); if (!article) return res.status(404).json({ msg: 'Article not found' }); article = await Article.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true }); res.json(article); } catch (err) { res.status(500).send('Server Error'); } };
const deleteArticle = async (req, res) => { try { await Article.findByIdAndDelete(req.params.id); res.json({ msg: 'Article removed' }); } catch (err) { res.status(500).send('Server Error'); } };

const fetchAndStoreNewsForCategory = async (category) => {
    let newArticlesCount = 0;
    try {
        const categoryForQuery = category.toLowerCase();
        let apiTopic = categoryForQuery;
        const validTopics = ['world', 'nation', 'business', 'technology', 'entertainment', 'sports', 'science', 'health'];
        if (['national', 'politics'].includes(apiTopic)) {
            apiTopic = 'nation';
        } else if (!validTopics.includes(apiTopic)) {
            return; 
        }

        const apiParams = {
            lang: 'en',
            country: 'in',
            topic: apiTopic,
            token: process.env.GNEWS_API_KEY 
        };

        const newsApiResponse = await axios.get(`https://gnews.io/api/v4/top-headlines`, { params: apiParams });
        const fetchedArticles = newsApiResponse.data.articles;

        for (const articleData of fetchedArticles) {
            const newSlug = createSlug(articleData.title);
            const existingArticle = await Article.findOne({ slug: newSlug });

            if (!existingArticle && articleData.image && articleData.description) {
                const newArticle = new Article({
                    title_en: articleData.title, 
                    content_en: articleData.description,
                    urlHeadline: newSlug, 
                    slug: newSlug,
                    category: formatTitle(category),
                    author: articleData.source.name || 'GNews',
                    sourceUrl: articleData.url,
                    featuredImage: articleData.image,
                    thumbnailCaption: '',
                    galleryImages: [],
                    status: 'published', 
                    createdAt: new Date(articleData.publishedAt),
                });

                await newArticle.save();
                newArticlesCount++;
            }
        }
        if (newArticlesCount > 0) {
            console.log(`[Auto-Fetch] Saved ${newArticlesCount} new articles for ${category}`);
        }

    } catch (err) {
        console.error(`[Auto-Fetch] Error fetching for ${category}:`, err.message);
    }
};

const runGNewsAutoFetch = async () => {
    console.log(`[${new Date().toISOString()}] Running GNews fetch job...`);
    const categoriesToFetch = [
        'National', 'World', 'Politics', 'Business', 
        'Entertainment', 'Sports', 'Education', 'Health', 
        'Tech', 'Religion', 'Environment','Crime', 'Opinion'
    ];
    for (const category of categoriesToFetch) {
        await fetchAndStoreNewsForCategory(category);
    }
    console.log(`Job complete.`);
};

const generateSitemap = async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/xml');
        const baseUrl = "https://www.indiajagran.com";
        const today = new Date().toISOString();
        let xmlUrls = [];
        const staticPages = ["", "about", "contact", "privacy-policy", "terms-condition", "subscribe"];
        staticPages.forEach(page => {
            xmlUrls.push(`<url><loc>${baseUrl}/${page}</loc><lastmod>${today}</lastmod><priority>${page === "" ? "1.0" : "0.8"}</priority></url>`);
        });
        const categories = ["national","politics","business","entertainment","sports","world","education","health","religion","crime","poetry-corner"];
        categories.forEach(cat => {
            xmlUrls.push(`<url><loc>${baseUrl}/category/${cat}</loc><lastmod>${today}</lastmod><priority>0.9</priority></url>`);
        });
        const articles = await Article.find({ status: "published" })
            .select("slug createdAt updatedAt")
            .sort({ createdAt: -1 })
            .lean() 
            .exec();
        if (!articles) { throw new Error("Database Query Failed (No articles returned)"); }
        articles.forEach(art => {
            if (art.slug) {
                let dateStr = today;
                try {
                    if (art.updatedAt) dateStr = new Date(art.updatedAt).toISOString();
                    else if (art.createdAt) dateStr = new Date(art.createdAt).toISOString();
                } catch (e) { dateStr = today; }
                xmlUrls.push(`<url><loc>${baseUrl}/article/${art.slug}</loc><lastmod>${dateStr}</lastmod><priority>0.7</priority></url>`);
            }
        });
        const finalXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls.join('\n')}
</urlset>`;
        res.send(finalXml);
    } catch (error) {
        console.error("Sitemap Crash:", error);
        res.header('Content-Type', 'text/plain'); 
        res.status(500).send(`SITEMAP GENERATION FAILED.\nREASON: ${error.message}\n\nSTACK: ${error.stack}`);
    }
};

module.exports = {
    createArticle, getArticles, getArticleById, getArticleBySlug,
    getArticlesByCategory, getRelatedArticles, getTopNews, searchArticles,
    updateArticle, deleteArticle, runGNewsAutoFetch, generateSitemap,
    getAdminArticles, updateArticleStatus, uploadImage, getHomeFeed 
};