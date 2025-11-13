// File: backend/server.js

const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const cron = require('node-cron'); 
const fs = require('fs').promises;

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

// --- Serve Static Files ---
const buildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(buildPath, { index: false })); 

// ============================================================
// 🔥 NEW: MAGIC ROUTE FOR SOCIAL SHARING (WhatsApp/FB)
// ============================================================
const Article = require('./models/Article'); 

app.get('/news/:slug', async (req, res) => {
    try {
        // 1. Database se Article nikalo
        const article = await Article.findOne({ slug: req.params.slug });

        // 2. Data prepare karo (Fallback ke sath)
        const title = article ? (article.title_hi || article.longHeadline) : 'India Jagran News';
        let description = article ? (article.summary_hi || article.summary_en) : 'Latest News from India Jagran';
        if(description && description.length > 150) description = description.substring(0, 150) + '...';
        
        let image = 'https://indiajagran.com/logo.jpg'; // Default Logo
        if (article && article.featuredImage) {
            image = article.featuredImage.startsWith('http') 
                ? article.featuredImage 
                : `https://indiajagran.com${article.featuredImage}`;
        }

        // 3. Asli React Page ka URL (Jahan user ko bhejna hai)
        const frontendUrl = `https://indiajagran.com/article/${req.params.slug}`;

        // 4. HTML Generate karo (Dynamic Meta Tags + Redirect Script)
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

// --------------------------------------------------------------
// --- OLD LOGIC: SSR FOR LOCALHOST/BUILD (Existing Code) ---
// --------------------------------------------------------------

app.get('/article/:slug', async (req, res) => {
    const filePath = path.resolve(buildPath, 'index.html');

    try {
        const article = await Article.findOne({ slug: req.params.slug });
        
        // Note: Agar build folder nahi hai (Render par), toh ye fail hoga, 
        // lekin humare naye '/news/' route ko iski zaroorat nahi hai.
        let htmlData = await fs.readFile(filePath, 'utf8');

        if (!article) {
            return res.send(htmlData);
        }

        const title = article.title_hi || article.longHeadline || 'India Jagran';
        let description = article.summary_hi || article.summary_en || 'Latest News from India Jagran';
        if(description.length > 150) description = description.substring(0, 150) + '...';

        let image = article.featuredImage || 'https://indiajagran.com/logo.jpg';
        if (image && !image.startsWith('http')) {
            image = `https://indiajagran.com${image}`;
        }
        
        const url = `https://indiajagran.com/article/${article.slug}`;

        htmlData = htmlData
            .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
            .replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${description}" />`)
            .replace(/<meta property="og:title" content=".*?"\s*\/?>/, `<meta property="og:title" content="${title}" />`)
            .replace(/<meta property="og:description" content=".*?"\s*\/?>/, `<meta property="og:description" content="${description}" />`)
            .replace(/<meta property="og:image" content=".*?"\s*\/?>/, `<meta property="og:image" content="${image}" />`)
            .replace(/<meta property="og:url" content=".*?"\s*\/?>/, `<meta property="og:url" content="${url}" />`)
            .replace(/<meta name="twitter:title" content=".*?"\s*\/?>/, `<meta name="twitter:title" content="${title}" />`)
            .replace(/<meta name="twitter:description" content=".*?"\s*\/?>/, `<meta name="twitter:description" content="${description}" />`)
            .replace(/<meta name="twitter:image" content=".*?"\s*\/?>/, `<meta name="twitter:image" content="${image}" />`);

        res.send(htmlData);

    } catch (error) {
        console.error('Error in SSR Meta Injection:', error);
        try { res.sendFile(filePath); } catch (err) { 
            // Agar build file na mile, tab bhi hum server crash nahi hone denge
            res.status(404).send('Page not found (Build missing on server)'); 
        }
    }
});

// --- Catch All Route ---
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.resolve(buildPath, 'index.html'));
});

// --- Start Server ---
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));