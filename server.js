// File: backend/server.js

const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// --- FIX: node-cron ko require karein ---
const cron = require('node-cron'); 

// Load env variables sabse pehle
dotenv.config();

// --- Routes ko require karein ---
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const uploadRoutes = require('./routes/upload');
const subscriberRoutes = require('./routes/subscribers');
const contactRoutes = require('./routes/contact');

// --- FIX: Auto-fetch function ko controller se import karein ---
const { runGNewsAutoFetch } = require('./controllers/articleController');

const app = express();

// -----------------------------------------------------------------
// --- YAHAN PAR NAYA CORS FIX ADD KIYA GAYA HAI ---
// -----------------------------------------------------------------
// Ab yeh live site aur localhost, dono ko allow karega

const allowedOrigins = [
    'https://madhurnews.netlify.app', // Aapki live frontend site
    'http://localhost:3000'          // Aapki local frontend site
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
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

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Sabhi routes ko yahan use karein ---
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/contact', contactRoutes);


// -----------------------------------------------------------------
// --- YAHAN PAR PORT TYPO FIX KIYA GAYA HAI ---
// -----------------------------------------------------------------
// 'process.Dprocess' ko 'process.env' kar diya gaya hai
const PORT = process.env.PORT || 5000;
// -----------------------------------------------------------------

// Connect to MongoDB and then start the server
console.log('Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log('MongoDB Connected successfully!');
    
    // Server ko listen mode me daalein
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

    // --- FIX: CRON JOB (AUTO-FETCH) KO SET UP KAREIN ---
    // (Database connect hone ke BAAD)
    
    console.log('Setting up GNews auto-fetch job...');
    
    // '0 * * * *' ka matlab hai "har ghante ke 0th minute par" (e.g., 1:00, 2:00, 3:00)
    cron.schedule('0 * * * *', () => {
        runGNewsAutoFetch();
    });

    // Server start hote hi ek baar turant fetch karein (optional, lekin accha hai)
    console.log('Running initial GNews fetch on server start...');
    runGNewsAutoFetch();
    // ----------------------------------------------------

})
.catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
});