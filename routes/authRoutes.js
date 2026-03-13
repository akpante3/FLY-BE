const express = require('express');
const router = express.Router();
const { signup, signin, logout, getMe, forgotPassword, resetPassword, updateUserByAdmin } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:resettoken', resetPassword);
router.patch('/users/:id', protect, admin, updateUserByAdmin);

module.exports = router;
