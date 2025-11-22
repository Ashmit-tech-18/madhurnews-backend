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

// ============================================================
// 🔥 PHASE 4: DATABASE INDEXING (Speed Booster)
// ============================================================

// 1. Basic Search Fields (Fast Filtering)
articleSchema.index({ status: 1 });              // "published" check karne ke liye
articleSchema.index({ category: 1 });            // Category filtering ke liye
articleSchema.index({ subcategory: 1 });         // Sub-category ke liye
articleSchema.index({ slug: 1 });                // Slug se article dhundhne ke liye
articleSchema.index({ createdAt: -1 });          // Sorting (Latest First) ke liye

// 2. Compound Indexes (Mixed Queries)
// Jab hum "status='published' AND category='Sports'" dhundhte hain
articleSchema.index({ status: 1, category: 1, createdAt: -1 });

// 3. Language & Title Search (Regex Performance)
// English aur Hindi titles ko fast search karne ke liye
articleSchema.index({ title_en: 1 });
articleSchema.index({ title_hi: 1 });
articleSchema.index({ longHeadline: 1 });
articleSchema.index({ shortHeadline: 1 });
articleSchema.index({ title: 1 }); // Legacy title support

// ============================================================

module.exports = mongoose.model('Article', articleSchema);

module.exports = mongoose.model('Article', articleSchema);