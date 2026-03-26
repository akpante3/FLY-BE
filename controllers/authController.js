const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const sendEmail = require('../utils/email');

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
    const { fullName, email, phoneNumber, country, password } = req.body;

    try {
        // Check if user exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            fullName,
            email,
            phoneNumber,
            country,
            password,
        });

        if (user) {
            // Send welcome email
            try {
                await sendEmail({
                    to: user.email,
                    subject: 'Welcome to FlyAUX!',
                    html: `
                        <h2>Welcome to FlyAUX, ${user.fullName}!</h2>
                        <p>We are excited to have you on board.</p>
                        <p>With FlyAUX, your next adventure is just a few clicks away.</p>
                        <br/>
                        <p>Safe travels,</p>
                        <p>The FlyAUX Team</p>
                    `
                });
            } catch (err) {
                console.error('Email could not be sent:', err);
            }

            res.status(201).json({
                token: generateToken(user._id),
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    country: user.country,
                    onboardingComplete: user.onboardingComplete,
                    documentStatus: user.documentStatus,
                    createdAt: user.createdAt,
                }
            });
        } else {
            res.status(400).json({ message: 'Invalid user data received' });
        }
    } catch (error) {
        console.error(error);

        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }

        res.status(500).json({ message: 'Server error during signup' });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/signin
// @access  Public
const signin = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check for user email logic (we need password here to compare, but selected false in model)
        const user = await User.findOne({ email }).select('+password');

        if (user && (await user.matchPassword(password))) {
            res.json({
                token: generateToken(user._id),
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    country: user.country,
                    onboardingComplete: user.onboardingComplete,
                    documentStatus: user.documentStatus,
                    createdAt: user.createdAt,
                }
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during signin' });
    }
};

// @desc    Logout user / clear cookie or token state (client handle)
// @route   POST /api/auth/logout
// @access  Public
const logout = async (req, res) => {
    res.status(200).json({ message: 'Logged out successfully. Please clear the token on the client side.' });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    // req.user is set in protect middleware
    res.status(200).json({
        user: {
            id: req.user._id,
            fullName: req.user.fullName,
            email: req.user.email,
            phoneNumber: req.user.phoneNumber,
            country: req.user.country,
            onboardingComplete: req.user.onboardingComplete,
            documentStatus: req.user.documentStatus,
            createdAt: req.user.createdAt,
        }
    });
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'There is no user with that email' });
        }

        // Get reset token
        const resetToken = user.getResetPasswordToken();

        await user.save({ validateBeforeSave: false });

        // Create reset url
        const clientUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

        const message = `
            <h2>Password Reset Request</h2>
            <p>You are receiving this email because you (or someone else) has requested the reset of a password.</p>
            <p>Please click on the following link, or paste this into your browser to complete the process:</p>
            <a href="${resetUrl}" target="_blank">${resetUrl}</a>
            <br/>
            <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        `;

        try {
            await sendEmail({
                to: user.email,
                subject: 'Password Reset Token',
                html: message
            });

            res.status(200).json({ success: true, message: 'Email sent' });
        } catch (err) {
            console.error('Email could not be sent:', err);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(500).json({ message: 'Email could not be sent' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during forgot password' });
    }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:resettoken
// @access  Public
const resetPassword = async (req, res) => {
    try {
        // Get hashed token
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resettoken)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid token' });
        }

        // Set new password
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        // Send confirmation email
        try {
            await sendEmail({
                to: user.email,
                subject: 'Password Reset Successful',
                html: `
                    <h2>Password Reset Successful</h2>
                    <p>Hello ${user.fullName},</p>
                    <p>This is a confirmation that the password for your account has just been changed.</p>
                    <p>If you did not make this change, please contact support immediately.</p>
                    <br/>
                    <p>Best regards,</p>
                    <p>The FlyAUX Team</p>
                `
            });
        } catch (err) {
            console.error('Confirmation email could not be sent:', err);
        }

        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
};

// @desc    Send Email Verification OTP
// @route   POST /api/auth/send-verification-otp
// @access  Public
const sendEmailVerificationOTP = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        user.emailVerificationOTP = otp;
        user.emailVerificationOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes from now

        await user.save({ validateBeforeSave: false });

        // Send Email
        const message = `
            <h2>Email Verification</h2>
            <p>Your verification code is: <strong>${otp}</strong></p>
            <p>This code will expire in 10 minutes.</p>
        `;

        try {
            await sendEmail({
                to: user.email,
                subject: 'Verify Your Email',
                html: message
            });

            res.status(200).json({ success: true, message: 'OTP sent to your email' });
        } catch (err) {
            console.error('Email could not be sent:', err);
            user.emailVerificationOTP = undefined;
            user.emailVerificationOTPExpires = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(500).json({ message: 'Email could not be sent' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while sending OTP' });
    }
};

// @desc    Verify Email OTP
// @route   POST /api/auth/verify-email-otp
// @access  Public
const verifyEmailOTP = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }

        if (!user.emailVerificationOTP || user.emailVerificationOTP !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (user.emailVerificationOTPExpires < Date.now()) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        // Verify user
        user.isEmailVerified = true;
        user.emailVerificationOTP = undefined;
        user.emailVerificationOTPExpires = undefined;

        await user.save({ validateBeforeSave: false });

        res.status(200).json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while verifying OTP' });
    }
};

// @desc    Send Phone Verification OTP (Termii)
// @route   POST /api/auth/send-phone-otp
// @access  Public
const sendPhoneVerificationOTP = async (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ message: 'Phone number is required' });
    }

    const payload = {
        api_key: process.env.TERMII_API_KEY,
        message_type: "NUMERIC",
        to: phoneNumber,
        from: process.env.TERMII_SENDER_ID || "N-Alert",
        channel: "generic",
        pin_attempts: 10,
        pin_time_to_live: 10,
        pin_length: 6,
        pin_placeholder: "< 1234 >",
        message_text: "Your FlyAUX verification code is < 1234 >. Valid for 10 minutes.",
        pin_type: "NUMERIC"
    };

    try {
        const response = await axios.post(`${process.env.TERMII_BASE_URL}/api/sms/otp/send`, payload);

        res.status(200).json({
            success: true,
            message: 'OTP sent to phone',
            pinId: response.data.pinId
        });
    } catch (error) {
        console.error('Termii error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Failed to send phone OTP' });
    }
};

// @desc    Verify Phone OTP (Termii)
// @route   POST /api/auth/verify-phone-otp
// @access  Public
const verifyPhoneOTP = async (req, res) => {
    const { userId, pinId, pin } = req.body;

    if (!pinId || !pin) {
        return res.status(400).json({ message: 'pinId and pin are required' });
    }

    const payload = {
        api_key: process.env.TERMII_API_KEY,
        pin_id: pinId,
        pin: pin
    };

    try {
        const response = await axios.post(`${process.env.TERMII_BASE_URL}/api/sms/otp/verify`, payload);

        if (response.data.verified === true || response.data.verified === "true" || response.data.verified === "Verified") {
            if (userId) {
                const user = await User.findById(userId);
                if (user) {
                    user.isPhoneVerified = true;
                    await user.save({ validateBeforeSave: false });
                }
            }
            return res.status(200).json({ success: true, message: 'Phone verified successfully!' });
        } else {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }
    } catch (error) {
        console.error('Termii verification error:', error.response ? error.response.data : error.message);
        res.status(400).json({ success: false, message: 'Verification failed. OTP may be invalid.' });
    }
};

// @desc    Update user info (admin only)
// @route   PATCH /api/auth/users/:id
// @access  Private/Admin
const updateUserByAdmin = async (req, res) => {
    try {
        const { documentStatus, onboardingComplete, country } = req.body;

        let user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Only update fields that are provided in the request
        if (documentStatus !== undefined) user.documentStatus = documentStatus;
        if (onboardingComplete !== undefined) user.onboardingComplete = onboardingComplete;
        if (country !== undefined) user.country = country;

        await user.save();

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                country: user.country,
                onboardingComplete: user.onboardingComplete,
                documentStatus: user.documentStatus,
                createdAt: user.createdAt,
            }
        });
    } catch (error) {
        console.error(error);
        if (error.name === 'CastError' && error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(500).json({ message: 'Server error while updating user' });
    }
};

// @desc    Google auth callback
// @route   GET /api/auth/google/callback
// @access  Public
const googleAuthCallback = async (req, res) => {
    try {
        const user = req.user;
        const token = generateToken(user._id);

        const clientUrl = process.env.FRONTEND_URL || 'https://www.flyaux.com';

        let redirectUrl = `${clientUrl}/auth/callback?token=${token}`;

        // If the user hasn't completed onboarding, redirect them to the onboarding page
        if (!user.onboardingComplete) {
            redirectUrl += '&next=/onboarding/passport';
        }

        res.redirect(redirectUrl);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during Google authentication' });
    }
};

// @desc    Get all users (admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
const listUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while fetching users' });
    }
};

// @desc    Delete multiple users (admin only)
// @route   DELETE /api/auth/users
// @access  Private/Admin
const deleteUsers = async (req, res) => {
    try {
        const { userIds } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'Please provide an array of user IDs to delete' });
        }

        // Optional: Prevent admins from deleting themselves
        if (userIds.includes(req.user._id.toString())) {
            return res.status(400).json({ message: 'You cannot delete your own account' });
        }

        const result = await User.deleteMany({
            _id: { $in: userIds }
        });

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} user(s) deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while deleting users' });
    }
};

module.exports = {
    signup,
    signin,
    logout,
    getMe,
    forgotPassword,
    resetPassword,
    sendEmailVerificationOTP,
    verifyEmailOTP,
    sendPhoneVerificationOTP,
    verifyPhoneOTP,
    updateUserByAdmin,
    googleAuthCallback,
    listUsers,
    deleteUsers
};
