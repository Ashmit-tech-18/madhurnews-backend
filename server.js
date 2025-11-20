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

// --- Middleware ---
app.use(compression());
app.use(
    morgan('dev', {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    })
);

// --- CORS Configuration ---
const allowedOrigins = [
    'https://indiajagran.com',
    'https://www.indiajagran.com',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Static Files ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===========================================================================
// 🔥 MAGIC ROUTE: WhatsApp/Facebook Preview Fix 🔥
// ===========================================================================
app.get('/article/:slug', async (req, res, next) => {
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

// Yahan Maine '/api/v1/...' ko hata kar '/api/...' kar diya hai
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subscriber', subscriberRoutes);

// --- Sitemap & Root ---
app.get('/sitemap.xml', generateSitemap);
app.get('/', (req, res) => {
    res.send('India Jagran Backend is Running Successfully! 🚀');
});

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