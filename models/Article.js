const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        content: { type: String, required: true },
        category: { type: String, required: true },
         subcategory: { // <-- Yeh nayi field add karein
            type: String,
        },
        featuredImage: {
            type: String, // Path to the uploaded image
        },
        author: { type: String, default: 'Abhay News' },
    },
    { timestamps: true }
);

ArticleSchema.index({ title: 'text', content: 'text' });

module.exports = mongoose.model('Article', ArticleSchema);