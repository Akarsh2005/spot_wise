const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const providerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please enter a valid email address'
        ]
    },
    contactNumber: {
        type: String,
        match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit contact number']
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    skills: {
        type: [String],
        required: true // e.g., ['plumber', 'electrician']
    },
    rate: {
        type: Number,
        default: 0
    },
    address: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        postalCode: { type: String },
        country: { type: String }
    },
    status: {
        type: String,
        enum: ['offline', 'online', 'active', 'in-progress'],
        default: 'offline'
    },
    verified: {
        type: Boolean,
        default: false
    },
    reviews: [
        {
            booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
            seeker: { type: mongoose.Schema.Types.ObjectId, ref: "Seeker" },
            rating: { type: Number, min: 1, max: 5 },
            review: { type: String },
            createdAt: { type: Date, default: Date.now },
        }
    ],
    rating: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Hash password before saving
providerSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Method to check password
providerSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to update average rating
providerSchema.methods.updateRating = async function () {
    if (this.reviews.length === 0) {
        this.rating = 0;
    } else {
        const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
        this.rating = total / this.reviews.length;
    }
    await this.save();
};

const Provider = mongoose.model('Provider', providerSchema);
module.exports = Provider;
