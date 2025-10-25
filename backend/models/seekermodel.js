const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const seekerSchema = new mongoose.Schema({
    userName: {
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
    address: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        postalCode: { type: String },
        country: { type: String }
    },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] } // [longitude, latitude]
    },
    savedProviders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Provider'
    }]
}, {
    timestamps: true
});

// Hash password before saving
seekerSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Compare password
seekerSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Index for location-based search (optional)
seekerSchema.index({ location: '2dsphere' });

const Seeker = mongoose.model('Seeker', seekerSchema);
module.exports = Seeker;
