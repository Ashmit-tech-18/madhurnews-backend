// File: backend/server.js

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron'); 
const path = require('path'); 

// --- 1. Import Optimization & Logging Libraries ---
const compression = require('compression'); 
const morgan = require('morgan');
const logger = require('./utils/logger'); // Winston Logger

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- 2. Apply Compression (Speed Booster 🚀) ---
app.use(compression());

// --- 3. Apply Logging (Debug Booster 🐞) ---
app.use(morgan('dev', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

// --- 4. CORS CONFIG (PRESERVED) ---
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
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(new Error('CORS Error: This origin is not allowed'), false);
        }
        return callback(null, true);
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// --- Static Files ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- 5. Database Connection (PRESERVED) ---
console.log('Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected!');
        logger.info('MongoDB Connected Successfully');
    })
    .catch(err => {
        console.error('DB Connect Error:', err);
        logger.error(`DB Connect Error: ${err.message}`);
    });

// --- 6. Load Routes (ALL PRESERVED) ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/articles', require('./routes/articles'));
app.use('/api/upload', require('./routes/upload'));         
app.use('/api/subscribers', require('./routes/subscribers')); 
app.use('/api/contact', require('./routes/contact'));
app.use('/api/analytics', require('./routes/analytics')); 

// --- 7. Auto Fetch Cron Job (PRESERVED) ---
const { runGNewsAutoFetch } = require('./controllers/articleController');
cron.schedule('0 * * * *', () => {
    const msg = 'Running Auto Fetch Job...';
    console.log(msg);
    logger.info(msg);
    runGNewsAutoFetch();
});

// ============================================================
// 🔥 MAGIC ROUTE FOR SOCIAL SHARING (UPDATED FIX)
// ============================================================
const Article = require('./models/Article'); 

// Helper to strip HTML tags for description
const stripHtml = (html) => {
   return html ? html.replace(/<[^>]*>?/gm, '') : '';
};

app.get('/news/:slug', async (req, res) => {
    logger.info(`[SOCIAL_SHARE] Generating preview for: ${req.params.slug}`);

    try {
        const article = await Article.findOne({ slug: req.params.slug });
        
        if (!article) {
            return res.redirect(`https://indiajagran.com/article/${req.params.slug}`);
        }

        // 1. Title Logic
        const title = article.title_hi || article.longHeadline || article.title_en || 'India Jagran News';
        
        // 2. Description Logic (Strip HTML & Truncate)
        let rawDesc = article.summary_hi || article.summary_en || article.content_hi || article.content_en || '';
        let description = stripHtml(rawDesc).substring(0, 160) + '...';
        
        // 3. Image Logic (Robust)
        const domain = 'https://indiajagran.com';
        let image = `${domain}/logo.jpg`; // Default Fallback
        
        if (article.featuredImage) {
            if (article.featuredImage.startsWith('http')) {
                image = article.featuredImage;
            } else {
                // Ensure slash logic is correct
                const cleanPath = article.featuredImage.startsWith('/') ? article.featuredImage : `/${article.featuredImage}`;
                image = `${domain}${cleanPath}`;
            }
        }

        const frontendUrl = `${domain}/article/${req.params.slug}`;

        // 4. Generate HTML with OG Tags
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                
                <title>${title}</title>
                <meta name="description" content="${description}">
                
                <meta property="og:type" content="article" />
                <meta property="og:site_name" content="India Jagran" />
                <meta property="og:url" content="${frontendUrl}" />
                <meta property="og:title" content="${title}" />
                <meta property="og:description" content="${description}" />
                <meta property="og:image" content="${image}" />
                <meta property="og:image:secure_url" content="${image}" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />

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
        console.error('Error in Magic Route:', error);
        logger.error(`Magic Route Error: ${error.message}`);
        res.status(500).send('Server Error');
    }
});

// --- ROOT ROUTE ---
app.get('/', (req, res) => {
    res.send('India Jagran Backend is Running Successfully! 🚀 (Use Frontend for UI)');
});

// --- 8. Global Error Handling Middleware ---
app.use((err, req, res, next) => {
    logger.error(err.message); 
    console.error(err); 
    res.status(500).json({ message: 'Server Error', error: err.message });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    logger.info(`Server running on port ${PORT}`);
});