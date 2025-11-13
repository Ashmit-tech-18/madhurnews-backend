const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    // ... (Old Fields Unchanged)
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    
    // --- NEW FIELD: ROLE ---
    role: {
        type: String,
        enum: ['admin', 'editor'], // Sirf ye do values allowed hain
        default: 'editor' // By default sab editor banenge
    }
    // -----------------------
});

// Hash password before saving the user (Old Logic Unchanged)
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model('User', UserSchema);