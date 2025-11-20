const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // MongoDB URI env variable se lein, ya fallback use karein
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/madhurnews', {
            // Naye mongoose version mein in options ki zaroorat nahi hoti, 
            // par safe side rehne ke liye hata diya hai taaki warning na aaye
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1); // Failure par process band karein
    }
};

module.exports = connectDB; // <-- Yahan dhyan dein, hum seedha function export kar rahe hain