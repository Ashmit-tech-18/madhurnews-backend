const Article = require('../models/Article');
const axios = require('axios'); // Axios ko import karein

// Helper function to create a URL-friendly slug from a title
const createSlug = (title) => {
    if (!title) return '';
    return title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
};

// Helper to format title case
const formatTitle = (text = '') => {
    return text.replace(/\b\w/g, char => char.toUpperCase());
};

// @desc    Create a new article
exports.createArticle = async (req, res) => {
    // ... (aapka code waisa hi hai) ...
    const { title, content, category, subcategory, featuredImage } = req.body;
    const slug = createSlug(title);

    try {
        let article = await Article.findOne({ slug });
        if (article) {
            return res.status(400).json({ msg: 'Article with this title already exists' });
        }

        const newArticle = new Article({
            title,
            slug,
            content,
            category,
            subcategory,
            featuredImage,
        });

        article = await newArticle.save();
        res.status(201).json(article);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get all articles
exports.getAllArticles = async (req, res) => {
    // ... (aapka code waisa hi hai) ...
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
    // ... (aapka code waisa hi hai) ...
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
    // ... (aapka code waisa hi hai) ...
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

// --- GET ARTICLES BY CATEGORY (UPDATED FOR GNEWS.IO) ---
exports.getArticlesByCategory = async (req, res) => {
    // ... (aapka code waisa hi hai) ...
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

        if (articles.length === 0) {
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
    // ... (aapka code waisa hi hai) ...
    try {
        const searchQuery = req.query.q;
        if (!searchQuery) {
            return res.status(400).json({ msg: 'Search query is required' });
        }
        const searchRegex = new RegExp(searchQuery, 'i');
        const articles = await Article.find({
            $or: [
                { title: { $regex: searchRegex } },
                { content: { $regex: searchRegex } }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(20);
        res.json(articles);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- UPDATE ARTICLE ---
exports.updateArticle = async (req, res) => {
    // ... (aapka code waisa hi hai) ...
    const { title, content, category, subcategory, featuredImage } = req.body;
    const articleFields = {};
    if (title) {
        articleFields.title = title;
        articleFields.slug = createSlug(title);
    }
    if (content) articleFields.content = content;
    if (category) articleFields.category = category;
    articleFields.subcategory = subcategory;
    articleFields.featuredImage = featuredImage;
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
    // ... (aapka code waisa hi hai) ...
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
// --- AUTO-FETCH LOGIC ---
// -----------------------------------------------------------------
const fetchAndStoreNewsForCategory = async (category) => {
    // ... (aapka code waisa hi hai) ...
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
            const existingArticle = await Article.findOne({ title: articleData.title });
            
            if (!existingArticle && articleData.image && articleData.description) {
                const newArticle = new Article({
                    title: articleData.title,
                    slug: createSlug(articleData.title),
                    content: articleData.description + ` <br><br><a href="${articleData.url}" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: underline;">Read full story...</a>`,
                    category: formatTitle(category),
                    featuredImage: articleData.image,
                    author: articleData.source.name || 'Madhur News',
                    createdAt: new Date(articleData.publishedAt),
                    url: articleData.url 
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
    // ... (aapka code waisa hi hai) ...
    console.log(`[${new Date().toISOString()}] Running scheduled GNews auto-fetch job...`);
    
    const categoriesToFetch = [
        'National', 'Business', 'Entertainment', 'Sports', 'World', 'Tech', 'Health', 'Science'
    ];

    let totalFetched = 0;
    for (const category of categoriesToFetch) {
        const count = await fetchAndStoreNewsForCategory(category);
        if(count) totalFetched += count;
    }

    console.log(`[${new Date().toISOString()}] GNews fetch job complete.`);
};


// -----------------------------------------------------------------
// --- FIX: SITEMAP GENERATOR FUNCTION ---
// -----------------------------------------------------------------

// Yeh categories wahi hain jo aap auto-fetch kar rahe hain
const staticCategories = [
    'national', 'business', 'entertainment', 'sports', 'world', 'tech', 'health', 'science'
];
// Yeh aapke static pages hain
const staticPages = [
    '', 'about', 'contact', 'privacy-policy', 'terms-condition', 'subscribe'
];

exports.generateSitemap = async (req, res) => {
    try {
        // --- ZAROORI: .env se apna frontend URL lein ---
        const baseUrl = process.env.FRONTEND_URL;
        if (!baseUrl) {
            return res.status(500).send('Server Error: FRONTEND_URL is not defined in .env');
        }

        let xml = '<?xml version="1.0" encoding="UTF-8"?>';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        
        const today = new Date().toISOString();

        // 1. Static Pages (Home, About, etc.) ko add karein
        staticPages.forEach(page => {
            xml += '<url>';
            xml += `<loc>${baseUrl}/${page}</loc>`;
            xml += `<lastmod>${today}</lastmod>`;
            xml += `<priority>${page === '' ? '1.0' : '0.8'}</priority>`;
            xml += '</url>';
        });
        
        // 2. Category Pages ko add karein
        staticCategories.forEach(category => {
            xml += '<url>';
            xml += `<loc>${baseUrl}/category/${category}</loc>`;
            xml += `<lastmod>${today}</lastmod>`;
            xml += '<priority>0.9</priority>';
            xml += '</url>';
        });

        // 3. Database se sabhi Articles ko add karein
        const articles = await Article.find().select('slug createdAt').sort({ createdAt: -1 });

        articles.forEach(article => {
            xml += '<url>';
            xml += `<loc>${baseUrl}/article/${article.slug}</loc>`;
            xml += `<lastmod>${article.createdAt.toISOString()}</lastmod>`;
            xml += '<priority>0.7</priority>';
            xml += '</url>';
        });

        xml += '</urlset>';
        
        // Header ko XML set karein aur sitemap bhein
        res.header('Content-Type', 'application/xml');
        res.send(xml);

    } catch (err) {
        console.error('Error generating sitemap:', err.message);
        res.status(500).send('Server Error');
    }
};
// --- END OF FIX ---