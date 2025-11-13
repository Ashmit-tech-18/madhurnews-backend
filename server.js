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
    'http://localhost:5000',      // ✅ Added: Local Production Build
    'http://127.0.0.1:5000'       // ✅ Added: Local IP
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

// --- Serve Static Files (Frontend Build) ---
const buildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(buildPath, { index: false })); 

// --------------------------------------------------------------
// --- LOGIC: DYNAMIC META TAGS FOR SOCIAL SHARE (SEO) ---
// --------------------------------------------------------------
const Article = require('./models/Article'); 

app.get('/article/:slug', async (req, res) => {
    const filePath = path.resolve(buildPath, 'index.html');

    try {
        const article = await Article.findOne({ slug: req.params.slug });
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

        // --- SMART REGEX REPLACEMENT (Fixed for Minified HTML) ---
        // \s* ka matlab hai: space ho ya na ho, dono chalega.
        // \/? ka matlab hai: closing slash ho ya na ho.
        
        htmlData = htmlData
            // Title Tags Replace
            .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
            .replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${description}" />`)
            
            // Open Graph Replace
            .replace(/<meta property="og:title" content=".*?"\s*\/?>/, `<meta property="og:title" content="${title}" />`)
            .replace(/<meta property="og:description" content=".*?"\s*\/?>/, `<meta property="og:description" content="${description}" />`)
            .replace(/<meta property="og:image" content=".*?"\s*\/?>/, `<meta property="og:image" content="${image}" />`)
            .replace(/<meta property="og:url" content=".*?"\s*\/?>/, `<meta property="og:url" content="${url}" />`)
            
            // Twitter Replace
            .replace(/<meta name="twitter:title" content=".*?"\s*\/?>/, `<meta name="twitter:title" content="${title}" />`)
            .replace(/<meta name="twitter:description" content=".*?"\s*\/?>/, `<meta name="twitter:description" content="${description}" />`)
            .replace(/<meta name="twitter:image" content=".*?"\s*\/?>/, `<meta name="twitter:image" content="${image}" />`);

        res.send(htmlData);

    } catch (error) {
        console.error('Error in SSR Meta Injection:', error);
        try { res.sendFile(filePath); } catch (err) { res.status(500).send('Server Error: Build not found'); }
    }
});


// --- Catch All Route (FIXED FOR NEW EXPRESS/NODE VERSIONS) ---
// '*' ki jagah hum Regex use karenge taaki crash na ho
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.resolve(buildPath, 'index.html'));
});

// --- Start Server ---
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));