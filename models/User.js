const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, 'Please provide your full name'],
        },
        email: {
            type: String,
            required: [true, 'Please provide your email address'],
            unique: true,
            match: [
                /^\S+@\S+\.\S+$/,
                'Please provide a valid email address',
            ],
        },
        phoneNumber: {
            type: String,
            required: [true, 'Please provide your phone number'],
        },
        country: {
            type: String,
            required: [true, 'Please select your country of residence'],
        },
        password: {
            type: String,
            required: [true, 'Please provide a password'],
            minlength: 8,
            select: false, // Don't return password by default
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to match password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
