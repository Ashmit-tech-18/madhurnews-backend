const Article = require('../models/Article');
const axios = require('axios'); // Axios ko import karein

// Helper function to create a URL-friendly slug from a title
const createSlug = (title) => {
    if (!title) return '';
    return title.toString().toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
};

// Helper to format title case
const formatTitle = (text = '') => {
    return text.replace(/\b\w/g, char => char.toUpperCase());
};

// @desc    Create a new article
exports.createArticle = async (req, res) => {
    
    // --- FIX: 'tags' ko req.body se nikaalein ---
    const { 
        title_en, title_hi, 
        summary_en, summary_hi, 
        content_en, content_hi, 
        category, subcategory, featuredImage, galleryImages,
        tags // Naya field
    } = req.body;

    const slugTitle = title_en || title_hi;
    if (!slugTitle || slugTitle.trim() === '') {
         return res.status(400).json({ msg: 'At least one title (EN or HI) is required to create a slug.' });
    }
    
    let slug = createSlug(slugTitle);

    try {
        const articleExists = await Article.findOne({ slug });
        if (articleExists) {
            slug = `${slug}-${Date.now()}`;
        }

        const newArticle = new Article({
            title_en: title_en || '',
            title_hi: title_hi || '',
            summary_en: summary_en || '',
            summary_hi: summary_hi || '',
            content_en: content_en || '',
            content_hi: content_hi || '',
            slug: slug,
            category,
            subcategory,
            featuredImage,
            galleryImages: galleryImages || [],
            tags: tags || [] // --- FIX: 'tags' ko yahan add karein ---
        });

        const savedArticle = await newArticle.save();
        res.status(201).json(savedArticle);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get all articles
exports.getAllArticles = async (req, res) => {
    try {
        const articles = await Article.find().sort({ createdAt: -1 });
        res.json(articles);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get single article by ID
exports.getArticleById = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) {
            return res.status(404).json({ msg: 'Article not found' });
        }
        res.json(article);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get single article by slug
exports.getArticleBySlug = async (req, res) => {
    try {
        const article = await Article.findOne({ slug: req.params.slug });
        if (!article) {
            return res.status(404).json({ msg: 'Article not found' });
        }
        res.json(article);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET ARTICLES BY CATEGORY ---
exports.getArticlesByCategory = async (req, res) => {
    let query = {};
    try {
        const { category, subcategory } = req.params;
        const categoryForQuery = category.toLowerCase();

        query = { category: new RegExp(`^${categoryForQuery}$`, 'i') };
        if (subcategory) {
            const formattedSub = subcategory.replace(/-/g, ' ');
            query.subcategory = new RegExp(`^${formattedSub}$`, 'i');
        }

        let articles = await Article.find(query).sort({ createdAt: -1 }).limit(20);

        if (articles.length === 0 && process.env.GNEWS_API_KEY) {
            console.log(`No articles in DB for ${category}, performing initial fetch...`);
            await fetchAndStoreNewsForCategory(category); 
            articles = await Article.find(query).sort({ createdAt: -1 }).limit(20);
        }
        
        res.json(articles);

    } catch (err) {
        console.error("Error in getArticlesByCategory:", err.message);
        if (err.response) {
            console.error("GNews API Error:", err.response.data);
        }
        if (!res.headersSent) {
            const articlesFromDb = await Article.find(query).sort({ createdAt: -1 }).limit(20);
            res.json(articlesFromDb);
        }
    }
};

// --- SEARCH FUNCTION ---
exports.searchArticles = async (req, res) => {
    try {
        const searchQuery = req.query.q;
        if (!searchQuery) {
            return res.status(400).json({ msg: 'Search query is required' });
        }
        
        const searchRegex = new RegExp(searchQuery, 'i');
        
        const articles = await Article.find({
            $or: [
                { title_en: { $regex: searchRegex } },
                { title_hi: { $regex: searchRegex } },
                { summary_en: { $regex: searchRegex } },
                { summary_hi: { $regex: searchRegex } },
                { content_en: { $regex: searchRegex } },
                { content_hi: { $regex: searchRegex } },
                { title: { $regex: searchRegex } },
                { tags: { $regex: searchRegex } } // --- FIX: Search me 'tags' ko add karein ---
            ]
        })
        .sort({ createdAt: -1 })
        .limit(20);
        
        res.status(200).json(articles); 

    } catch (err) {
        console.error("Search API Error:", err.message);
        res.status(200).json([]); 
    }
};

// --- UPDATE ARTICLE ---
exports.updateArticle = async (req, res) => {
    
    // --- FIX: 'tags' ko req.body se nikaalein ---
    const { 
        title_en, title_hi, 
        summary_en, summary_hi, 
        content_en, content_hi, 
        category, subcategory, featuredImage, galleryImages,
        tags // Naya field
    } = req.body;
    
    const articleFields = {};

    if (title_en || title_hi) {
        const newSlugTitle = title_en || title_hi;
        if (newSlugTitle) {
            const newSlug = createSlug(newSlugTitle);
            const existingArticle = await Article.findOne({ slug: newSlug, _id: { $ne: req.params.id } });
            if (existingArticle) {
                return res.status(400).json({ msg: 'An article with this title (slug) already exists. Please choose a different title.' });
            }
            articleFields.slug = newSlug;
        }
        if (title_en !== undefined) articleFields.title_en = title_en;
        if (title_hi !== undefined) articleFields.title_hi = title_hi;
    }

    if (summary_en !== undefined) articleFields.summary_en = summary_en;
    if (summary_hi !== undefined) articleFields.summary_hi = summary_hi;
    if (content_en !== undefined) articleFields.content_en = content_en;
    if (content_hi !== undefined) articleFields.content_hi = content_hi;
    if (category) articleFields.category = category;
    if (subcategory !== undefined) articleFields.subcategory = subcategory;
    if (featuredImage !== undefined) articleFields.featuredImage = featuredImage;
    if (galleryImages !== undefined) articleFields.galleryImages = galleryImages;

    // --- FIX: 'tags' ko update object me add karein ---
    if (tags !== undefined) {
        articleFields.tags = tags;
    }

    try {
        let article = await Article.findById(req.params.id);
        if (!article) {
            return res.status(404).json({ msg: 'Article not found' });
        }
        article = await Article.findByIdAndUpdate(
            req.params.id,
            { $set: articleFields },
            { new: true }
        );
        res.json(article);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- DELETE ARTICLE ---
exports.deleteArticle = async (req, res) => {
    try {
        const article = await Article.findByIdAndDelete(req.params.id);
        if (!article) {
          return res.status(404).json({ msg: 'Article not found' });
        }
        res.json({ msg: 'Article removed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};


// -----------------------------------------------------------------
// --- AUTO-FETCH LOGIC (GNEWS) ---
// -----------------------------------------------------------------
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
            token: process.env.GNEWS_API_KEY,
        };

        const newsApiResponse = await axios.get(`https://gnews.io/api/v4/top-headlines`, { params: apiParams });
        const fetchedArticles = newsApiResponse.data.articles;

        for (const articleData of fetchedArticles) {
            const existingArticle = await Article.findOne({ title_en: articleData.title });
            
            if (!existingArticle && articleData.image && articleData.description) {
                
                const newArticle = new Article({
                    title_en: articleData.title,
                    slug: createSlug(articleData.title),
                    summary_en: articleData.description,
                    content_en: articleData.description + ` <br><br><a href="${articleData.url}" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: underline;">Read full story...</a>`,
                    
                    title_hi: '',
                    summary_hi: '',
                    content_hi: '',
                    
                    category: formatTitle(category),
                    featuredImage: articleData.image,
                    author: articleData.source.name || 'Madhur News',
                    createdAt: new Date(articleData.publishedAt),
                    sourceUrl: articleData.url,
                    tags: [] // --- FIX: 'tags' ko khaali array se initialize karein ---
                });
                await newArticle.save();
                newArticlesCount++;
            }
        }
        
        if (newArticlesCount > 0) {
            console.log(`[Auto-Fetch] Successfully saved ${newArticlesCount} new articles for ${category}.`);
        }

    } catch (err) {
        console.error(`[Auto-Fetch] Error fetching news for ${category}:`, err.message);
        if (err.response) {
            console.error("GNews API Error:", err.response.data);
        }
    }
};

exports.runGNewsAutoFetch = async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled GNews auto-fetch job...`);
    const categoriesToFetch = ['National', 'Business', 'Entertainment', 'Sports', 'World', 'Tech', 'Health', 'Science'];
    for (const category of categoriesToFetch) {
        await fetchAndStoreNewsForCategory(category);
    }
    console.log(`[${new Date().toISOString()}] GNews fetch job complete.`);
};


// -----------------------------------------------------------------
// --- SITEMAP GENERATOR FUNCTION ---
// -----------------------------------------------------------------
const staticCategories = [
    'national', 'business', 'entertainment', 'sports', 'world', 'tech', 'religion', 'health', 'science'
];
const staticPages = [
    '', 'about', 'contact', 'privacy-policy', 'terms-condition', 'subscribe'
];

exports.generateSitemap = async (req, res) => {
    try {
        const baseUrl = process.env.FRONTEND_URL;
        if (!baseUrl) {
            return res.status(500).send('Server Error: FRONTEND_URL is not defined in .env');
        }

        let xml = '<?xml version="1.0" encoding="UTF-8"?>';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        
        const today = new Date().toISOString();

        staticPages.forEach(page => {
            xml += '<url>';
            xml += `<loc>${baseUrl}/${page}</loc>`;
            xml += `<lastmod>${today}</lastmod>`;
            xml += `<priority>${page === '' ? '1.0' : '0.8'}</priority>`;
            xml += '</url>';
        });
        
        staticCategories.forEach(category => {
            xml += '<url>';
            xml += `<loc>${baseUrl}/category/${category}</loc>`;
            xml += `<lastmod>${today}</lastmod>`;
            xml += '<priority>0.9</priority>';
            xml += '</url>';
        });

        const articles = await Article.find().select('slug createdAt').sort({ createdAt: -1 });

        articles.forEach(article => {
            xml += '<url>';
            xml += `<loc>${baseUrl}/article/${article.slug}</loc>`;
            xml += `<lastmod>${article.createdAt.toISOString()}</lastmod>`;
            xml += '<priority>0.7</priority>';
            xml += '</url>';
        });

        xml += '</urlset>';
        
        res.header('Content-Type', 'application/xml');
        res.send(xml);

    } catch (err) {
        console.error('Error generating sitemap:', err.message);
        res.status(500).send('Server Error');
    }
};