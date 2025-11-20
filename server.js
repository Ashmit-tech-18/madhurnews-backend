const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const path = require('path');

// --- Controllers & Models ---
const { generateSitemap } = require('./controllers/articleController'); 
const Article = require('./models/Article'); 

// --- Optimization & Logging ---
const compression = require('compression');
const morgan = require('morgan');
const logger = require('./utils/logger');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// =======================================================================
// 🔥 FINAL FIX: SITEMAP ROUTE (Route Match + Safe Logic) 🔥
// =======================================================================
// ✅ Note: Vercel से आने वाला ट्रैफिक '/api/articles/sitemap' पर ही आएगा।
app.get('/api/articles/sitemap', async (req, res) => {
    logger.info("Sitemap generation request received.");
    
    try {
        // Articles fetch, सिर्फ़ ज़रूरी फ़ील्ड्स
        const articles = await Article.find({}, 'slug updatedAt createdAt');
        
        // Environment Variable का उपयोग करें
        const baseUrl = process.env.FRONTEND_URL || 'https://www.indiajagran.com';
        
        let sitemap = '<?xml version="1.0" encoding="UTF-8"?>';
        sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

        // Static URLs
        sitemap += `
            <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
            <url><loc>${baseUrl}/about</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
            <url><loc>${baseUrl}/contact</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
        `;

        // Dynamic URLs
        articles.forEach(article => {
            // UpdatedAt को प्रेफ़रेंस, अगर नहीं तो current time
            let dateString = article.updatedAt ? new Date(article.updatedAt).toISOString() : new Date().toISOString(); 
            
            if (article.slug) {
                sitemap += `
                <url>
                    <loc>${baseUrl}/article/${article.slug}</loc>
                    <lastmod>${dateString}</lastmod>
                    <changefreq>weekly</changefreq>
                    <priority>0.8</priority>
                </url>`;
            }
        });

        sitemap += '</urlset>';
        logger.info("Sitemap generated successfully.");
        
        res.header('Content-Type', 'application/xml');
        res.send(sitemap);

    } catch (e) {
        logger.error("SITEMAP ROUTE CRASH:", e);
        // अगर क्रैश हुआ तो logs में स्पष्ट Error आएगा
        res.status(500).send("Sitemap generation failed due to server error.");
    }
});
// =======================================================================


// --- Middleware ---
app.use(compression());
app.use(
    morgan('dev', {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    }
    )
);

// --- CORS Configuration ---
const allowedOrigins = [
    'https://indiajagran.com',
    'https://www.indiajagran.com',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    // ✅ Render Backend भी अलाउ है (पुराना फ़िक्स)
    'https://indiajagran-backend.onrender.com' 
];

const corsOptions = {
    origin: function (origin, callback) {
        // Agar origin undefined (jaise server-to-server request) ya allowed list mein hai
        if (!origin || allowedOrigins.indexOf(origin) !== -1) { 
            callback(null, true);
        } else {
            // Agar origin allowed nahi hai toh CORS error throw hoga
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Static Files ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===========================================================================
// 🔥 MAGIC ROUTE: WhatsApp/Facebook Preview Fix (UNCHANGED) 🔥
// ===========================================================================
app.get('/article/:slug', async (req, res, next) => {
    // ... [No changes made to this route] ...
    const userAgent = req.headers['user-agent'] || '';
    const { slug } = req.params;
    
    // Bots Detection (WhatsApp, FB, Twitter, etc.)
    const isBot = /facebookexternalhit|twitterbot|whatsapp|linkedinbot|telegrambot/i.test(userAgent);

    try {
        const article = await Article.findOne({ slug });

        if (!article) {
            // Agar bot hai to 404, insaan hai to Home Page
            return isBot ? res.status(404).send('Article not found') : res.redirect('https://indiajagran.com');
        }

        // Data Prepare
        const title = article.longHeadline || article.title || 'India Jagran';
        const summary = (article.summary || article.content || '').replace(/<[^>]*>?/gm, '').substring(0, 160) + '...';
        
        let image = article.featuredImage || 'https://indiajagran.com/logo192.png';
        if (image && !image.startsWith('http')) {
            image = `https://indiajagran.com${image.startsWith('/') ? '' : '/'}${image}`;
        }

        const frontendUrl = `https://indiajagran.com/article/${slug}`;

        // Agar Bot hai -> HTML bhejo (Preview ke liye)
        if (isBot) {
            const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta property="og:type" content="article" />
                    <meta property="og:title" content="${title}" />
                    <meta property="og:description" content="${summary}" />
                    <meta property="og:image" content="${image}" />
                    <meta property="og:url" content="${frontendUrl}" />
                    <meta property="og:site_name" content="India Jagran" />
                    <meta name="twitter:card" content="summary_large_image" />
                    <meta name="twitter:title" content="${title}" />
                    <meta name="twitter:image" content="${image}" />
                </head>
                <body><h1>${title}</h1><img src="${image}" /><p>${summary}</p></body>
                </html>
            `;
            return res.send(html);
        }

        // Agar Insaan hai -> React App par bhejo
        return res.redirect(frontendUrl);

    } catch (error) {
        console.error('Magic Route Error:', error);
        return res.redirect('https://indiajagran.com');
    }
});


// --- API Routes (FIXED: Removed '/v1' to match Frontend) ---
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const contactRoutes = require('./routes/contact');
const analyticsRoutes = require('./routes/analytics');
const subscriberRoutes = require('./routes/subscribers');

// Yahan Maine '/api/v1/...' ko hata kar '/api/...' kar diya hai (UNCHANGED)
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subscriber', subscriberRoutes);


// --- Error Handling ---
app.use((err, req, res, next) => {
    logger.error(err.message);
    console.error(err);
    res.status(500).json({ message: 'Server Error', error: err.message });
});

// --- Database Connection (Safe Check) ---
const dbModule = require('./config/db');
let connectDB;
if (typeof dbModule === 'function') connectDB = dbModule;
else if (dbModule && typeof dbModule.connectDB === 'function') connectDB = dbModule.connectDB;

if (connectDB) connectDB();

// --- Cron Jobs ---
cron.schedule('*/1 * * * *', async () => {
    try {
        const now = new Date();
        const result = await Article.updateMany(
            { status: 'scheduled', publishedAt: { $lte: now } },
            { $set: { status: 'published', updatedAt: now } }
        );
        if (result.modifiedCount > 0) logger.info(`Published ${result.modifiedCount} scheduled articles.`);
    } catch (error) {
        logger.error('Error publishing scheduled articles:', error);
    }
});

app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});