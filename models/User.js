const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

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
            required: [
                function () {
                    return !this.googleAuth;
                },
                'Please provide your phone number',
            ],
        },
        country: {
            type: String,
            required: [
                function () {
                    return !this.googleAuth;
                },
                'Please select your country of residence',
            ],
        },
        password: {
            type: String,
            required: [
                function () {
                    return !this.googleAuth;
                },
                'Please provide a password',
            ],
            minlength: [8, 'Password must be at least 8 characters long'],
            match: [
                /^(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/,
                'Password must contain at least one number and one symbol',
            ],
            select: false, // Don't return password by default
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true,
        },
        googleAuth: {
            type: Boolean,
            default: false,
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        isPhoneVerified: {
            type: Boolean,
            default: false,
        },
        emailVerificationOTP: String,
        emailVerificationOTPExpires: Date,
        onboardingComplete: {
            type: Boolean,
            default: false,
        },
        documentStatus: {
            type: String,
            enum: ['pending', 'verified', 'rejected', 'none'],
            default: 'pending',
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
        resetPasswordToken: String,
        resetPasswordExpire: Date,
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to match password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function () {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expire
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
