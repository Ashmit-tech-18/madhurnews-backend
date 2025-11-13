// File: backend/server.js

const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron'); 
// const path = require('path'); // Ab iski zaroorat nahi
// const fs = require('fs').promises; // Iski bhi zaroorat nahi

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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

// --- Database Connection ---
console.log('Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected!'))
    .catch(err => console.error('DB Connect Error:', err));

// --- Load Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/articles', require('./routes/articles'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/subscribers', require('./routes/subscribers'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/analytics', require('./routes/analytics')); 

// --- Auto Fetch Cron Job ---
const { runGNewsAutoFetch } = require('./controllers/articleController');
cron.schedule('0 * * * *', () => {
    console.log('Running Auto Fetch Job...');
    runGNewsAutoFetch();
});

// ============================================================
// 🔥 MAGIC ROUTE FOR SOCIAL SHARING (WhatsApp/FB)
// ============================================================
// Ye bina kisi file ke HTML generate karega, isliye ye CRASH NAHI HOGA.
const Article = require('./models/Article'); 

app.get('/news/:slug', async (req, res) => {
    try {
        const article = await Article.findOne({ slug: req.params.slug });

        const title = article ? (article.title_hi || article.longHeadline) : 'India Jagran News';
        let description = article ? (article.summary_hi || article.summary_en) : 'Latest News from India Jagran';
        if(description && description.length > 150) description = description.substring(0, 150) + '...';
        
        let image = 'https://indiajagran.com/logo.jpg'; 
        if (article && article.featuredImage) {
            image = article.featuredImage.startsWith('http') 
                ? article.featuredImage 
                : `https://indiajagran.com${article.featuredImage}`;
        }

        const frontendUrl = `https://indiajagran.com/article/${req.params.slug}`;

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
                <meta property="og:title" content="${title}" />
                <meta property="og:description" content="${description}" />
                <meta property="og:image" content="${image}" />
                <meta property="og:url" content="${frontendUrl}" />
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
                <p>Opening Article... <a href="${frontendUrl}">Click here</a></p>
            </body>
            </html>
        `;
        res.send(html);

    } catch (error) {
        console.error('Error in Magic Route:', error);
        res.status(500).send('Server Error');
    }
});

// --- ROOT ROUTE (Error se bachne ke liye) ---
app.get('/', (req, res) => {
    res.send('India Jagran Backend is Running Successfully! 🚀 (Use Frontend for UI)');
});

// --- Start Server ---
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));