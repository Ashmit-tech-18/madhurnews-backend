const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const articleSchema = new Schema({
    
    // --- Aapke maujooda Dual-Language fields (Koi badlav nahi) ---
    title_en: {
        type: String,
        default: '' // English title
    },
    title_hi: {
        type: String,
        default: '' // Hindi title
    },

    summary_en: {
        type: String,
        default: '' // English summary
    },
    summary_hi: {
        type: String,
        default: '' // Hindi summary
    },

    content_en: {
        type: String,
        default: '' // English content
    },
    content_hi: {
        type: String,
        default: '' // Hindi content
    },

    // --- Aapke maujooda Media fields (Koi badlav nahi) ---
    featuredImage: {
        type: String
    },
    galleryImages: {
        type: [String],
        default: []
    },

    // ---
    // --- ! NEW UPDATE (Tags/Keywords) ! ---
    // ---
    tags: {
        type: [String], // Yeh strings ka ek array hoga
        default: []     // Default khaali array
    },
    // --- END OF NEW UPDATE ---
    // ---

    // --- Baaki sabhi fields (Koi badlav nahi) ---
    category: {
        type: String,
        required: true // Category abhi bhi required hai
    },
    subcategory: {
        type: String
    },
    slug: { 
        type: String,
        required: true,
        unique: true,
        index: true
    },
    author: {
        type: String,
        default: 'Madhur News'
    },
    sourceUrl: {
        type: String,
        default: null
    }
}, { timestamps: true }); // 'createdAt' aur 'updatedAt' bhi maujood hain

const Article = mongoose.model('Article', articleSchema);

module.exports = Article;