// File: backend/fix_db.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 1. Load Env (Try loading from current folder)
dotenv.config(); 

// Debugging: Check if MONGO_URI loaded
if (!process.env.MONGO_URI) {
    console.error("❌ Error: MONGO_URI not found. Make sure .env file is in the 'backend' folder.");
    process.exit(1);
}

// 2. Import Model (Adjusted for running inside 'backend' folder)
try {
    // Since we are in 'backend' folder, model is in './models/Article'
    var Article = require('./models/Article'); 
} catch (error) {
    console.error("❌ Error loading Article model:", error.message);
    process.exit(1);
}

const fixDatabase = async () => {
    try {
        console.log("⏳ Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to Database!");

        console.log("🔄 Fixing Articles...");
        
        // 1. Update Pending -> Published
        const result1 = await Article.updateMany(
            { status: 'pending' },
            { $set: { status: 'published' } }
        );
        console.log(`👉 Approved Pending Articles: ${result1.modifiedCount}`);

        // 2. Update Legacy (No Status) -> Published
        const result2 = await Article.updateMany(
            { status: { $exists: false } },
            { $set: { status: 'published' } }
        );
        console.log(`👉 Fixed Legacy Articles: ${result2.modifiedCount}`);

        console.log("\n🎉 SUCCESS! All articles are now LIVE.");
        process.exit();
    } catch (error) {
        console.error("❌ Script Error:", error);
        process.exit(1);
    }
};

fixDatabase();