// File: backend/models/Article.js

const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
    // --- Existing Fields ---
    title_en: { type: String },
    title_hi: { type: String },
    
    summary_en: { type: String },
    summary_hi: { type: String },
    
    content_en: { type: String },
    content_hi: { type: String },

    // SEO & Meta Fields
    urlHeadline: { type: String, required: true, unique: true }, 
    
    // 🔥 ADDED SLUG FIELD HERE (Crucial Fix)
    slug: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    
    shortHeadline: { type: String }, 
    longHeadline: { type: String }, 
    kicker: { type: String }, 
    
    keywords: [{ type: String }],
    
    author: { type: String },
    sourceUrl: { type: String },

    // Categorization
    category: { type: String, required: true },
    subcategory: { type: String },
    district: { type: String },

    // Media
    featuredImage: { type: String },
    thumbnailCaption: { type: String },
    galleryImages: [
        {
            url: { type: String },
            caption: { type: String }
        }
    ],

    // Stats
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },

    // Approval Status
    status: {
        type: String,
        enum: ['published', 'pending', 'draft', 'rejected'], 
        default: 'pending', 
        index: true 
    },

    // User Reference (Author ID)
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false 
    }

}, { timestamps: true });

module.exports = mongoose.model('Article', articleSchema);