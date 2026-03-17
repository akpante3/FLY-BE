const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

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
        // In a real app, this would be a full URL to your frontend's reset password page
        const resetUrl = `http://localhost:5000/api/auth/reset-password/${resetToken}`;

        console.log(`Reset Password URL: \n${resetUrl}`);

        res.status(200).json({
            message: 'Email sent',
            resetToken // Returning the reset token in the response for testing purposes since we aren't actually sending an email
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Email could not be sent' });
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
    updateUserByAdmin,
    googleAuthCallback,
    listUsers,
    deleteUsers
};
