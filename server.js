// File: backend/server.js (FIXED: CORS Error for netlify.app)

const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const cron = require('node-cron'); 

dotenv.config();

const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const uploadRoutes = require('./routes/upload');
const subscriberRoutes = require('./routes/subscribers');
const contactRoutes = require('./routes/contact');

const { runGNewsAutoFetch } = require('./controllers/articleController');

const app = express();

// -----------------------------------------------------------------
// --- !!! FIX: CORS ko "newschakra.netlify.app" ke liye update kiya gaya hai !!! ---
// -----------------------------------------------------------------
const allowedOrigins = [
    'https://newschakra.live',       // Aapka custom domain
    'https://newschakra.netlify.app', // Aapka Netlify domain (Yeh naya hai)
    'http://localhost:3000'         // Aapki local frontend site
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// -----------------------------------------------------------------
// --- FIX KHATM HUA ---
// -----------------------------------------------------------------

// Middleware
app.use(express.json());

// --- Sabhi routes ko yahan use karein ---
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/contact', contactRoutes);

// PORT
const PORT = process.env.PORT || 5000;

// Connect to MongoDB and then start the server
console.log('Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log('MongoDB Connected successfully!');
    
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
    
    console.log('Setting up GNews auto-fetch job...');
    
    cron.schedule('0 * * * *', () => {
        runGNewsAutoFetch();
    });

    // (Initial fetch abhi bhi disabled hai taki 502 error na aaye)
    // console.log('Running initial GNews fetch on server start...');
    // runGNewsAutoFetch(); 

})
.catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
});