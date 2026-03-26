const express = require('express');
const router = express.Router();
const passport = require('passport');
const { signup, signin, logout, getMe, forgotPassword, resetPassword, sendEmailVerificationOTP, verifyEmailOTP, sendPhoneVerificationOTP, verifyPhoneOTP, updateUserByAdmin, googleAuthCallback, listUsers, deleteUsers } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:resettoken', resetPassword);
router.post('/send-verification-otp', sendEmailVerificationOTP);
router.post('/verify-email-otp', verifyEmailOTP);
router.post('/send-phone-otp', sendPhoneVerificationOTP);
router.post('/verify-phone-otp', verifyPhoneOTP);

// User management routes (Admin only)
router.get('/users', protect, admin, listUsers);
router.delete('/users', protect, admin, deleteUsers);
router.patch('/users/:id', protect, admin, updateUserByAdmin);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
    (req, res, next) => {
        const failureUrl = `${process.env.FRONTEND_URL || 'https://www.flyaux.com'}/auth/callback?error=access_denied`;
        passport.authenticate('google', { session: false, failureRedirect: failureUrl })(req, res, next);
    },
    googleAuthCallback
);

module.exports = router;
