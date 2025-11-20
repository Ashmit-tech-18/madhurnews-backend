const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const path = require('path');

// --- Import Sitemap Controller (Ab Hum Direct Use Karenge, isliye ise hataya ja sakta hai) ---
// const { generateSitemap } = require('./controllers/articleController'); 

// --- Optimization & Logging ---
const compression = require('compression');
const morgan = require('morgan');
const logger = require('./utils/logger');
const Article = require('./models/Article'); // <-- Ye zaroori hai

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Apply Compression (GLOBAL) ---
app.use(compression());

// --- Logging Middleware ---
app.use(
    morgan('dev', {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    })
);

// --- CORS CONFIG ---
const allowedOrigins = [
    'https://indiajagran.com',
    'https://www.indiajagran.com',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// --- Connect to MongoDB ---
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => logger.info('MongoDB Connected Successfully'))
    .catch((err) =>
        logger.error('MongoDB Connection Failed: ' + err.message)
    );

// --- Import Routes ---
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const contactRoutes = require('./routes/contact');

/* ------------------------------------------
   🚀 FIXED SITEMAP ROUTE (DIRECT IN SERVER.JS)
   ------------------------------------------
   Humne controller ko bypass karke seedha yahan logic likha hai
   taki Memory Leak aur Date Errors se bacha ja sake.
*/

app.get('/sitemap.xml', async (req, res) => {
    try {
        // 1. Force XML Headers
        res.header('Content-Type', 'application/xml');
        // Disable compression to prevent buffering issues
        res.header('Content-Encoding', 'identity'); 

        const baseUrl = process.env.FRONTEND_URL || "https://www.indiajagran.com";
        const today = new Date().toISOString();

        let xml = '<?xml version="1.0" encoding="UTF-8"?>';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

        // 2. Static Pages
        const staticPages = ["", "about", "contact", "privacy-policy", "terms-condition", "subscribe"];
        staticPages.forEach(page => {
            xml += `<url><loc>${baseUrl}/${page}</loc><lastmod>${today}</lastmod><priority>${page === "" ? "1.0" : "0.8"}</priority></url>`;
        });

        // 3. Categories
        const categories = ["national","politics","business","entertainment","sports","world","education","health","religion","crime","poetry-corner"];
        categories.forEach(cat => {
            xml += `<url><loc>${baseUrl}/category/${cat}</loc><lastmod>${today}</lastmod><priority>0.9</priority></url>`;
        });

        // 4. Articles (SAFE & OPTIMIZED FETCH)
        // .lean() use karne se memory usage 10x kam ho jata hai
        const articles = await Article.find({ status: 'published' })
            .select('slug createdAt updatedAt')
            .sort({ createdAt: -1 })
            .lean();

        articles.forEach(art => {
            if (art.slug) {
                let dateStr = today;
                // Crash-Proof Date Logic
                try {
                    if (art.updatedAt) dateStr = new Date(art.updatedAt).toISOString();
                    else if (art.createdAt) dateStr = new Date(art.createdAt).toISOString();
                } catch (e) {
                    // Agar date kharab hai toh current date use kare, crash na kare
                    dateStr = today;
                }
                
                xml += `<url><loc>${baseUrl}/article/${art.slug}</loc><lastmod>${dateStr}</lastmod><priority>0.7</priority></url>`;
            }
        });

        xml += '</urlset>';
        res.send(xml);

    } catch (err) {
        console.error("Sitemap Critical Error:", err);
        // Agar error aaye to screen par dikhaye (debugging ke liye)
        res.status(500).send(`SITEMAP FAILED: ${err.message}`);
    }
});

// --- Use API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/contact', contactRoutes);

// --- Magic Route for Social Share Redirects (UNCHANGED) ---
app.get('/news/:slug', async (req, res) => {
    try {
        // Note: Article already imported above, so no need to re-require inside
        const article = await Article.findOne({ slug: req.params.slug });

        const frontendUrl = `${process.env.FRONTEND_URL}/news/${req.params.slug}`;

        if (!article) {
            return res.redirect(process.env.FRONTEND_URL);
        }

        const title =
            article.longHeadline ||
            article.title_en ||
            'India Jagran News';
        const description =
            article.summary_en || 'Latest news updates.';
        const image =
            article.featuredImage ||
            'https://indiajagran.com/logo192.png';

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>${title}</title>
                
                <meta property="og:title" content="${title}" />
                <meta property="og:description" content="${description}" />
                <meta property="og:image" content="${image}" />
                <meta property="og:type" content="article" />
                
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="${title}" />
                <meta name="twitter:description" content="${description}" />
                <meta name="twitter:image" content="${image}" />

                <script>
                    window.location.href = "${frontendUrl}";
                </script>
            </head>
            <body>
                <p>Redirecting to article... <a href="${frontendUrl}">Click here</a></p>
            </body>
            </html>
        `;
        res.send(html);
    } catch (error) {
        logger.error(`Magic Route Error: ${error.message}`);
        res.status(500).send('Server Error');
    }
});

// --- ROOT ROUTE ---
app.get('/', (req, res) => {
    res.send('India Jagran Backend is Running Successfully! 🚀');
});

// --- Global Error Handling ---
app.use((err, req, res, next) => {
    logger.error(err.message);
    console.error(err);
    res.status(500).json({
        message: 'Server Error',
        error: err.message
    });
});

// --- Start Server ---
app.listen(PORT, () =>
    logger.info(`Server running on port ${PORT}`)
);