const express = require('express');
const router = express.Router();
const {
    createBooking,
    getAllBookings,
    getMyBookings,
    getBookingById,
    updateBookingStatus,
    getBookingInstallments
} = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, createBooking)
    .get(protect, admin, getAllBookings);

router.get('/mine', protect, getMyBookings);

router.get('/:id/installments', protect, getBookingInstallments);

router.route('/:id')
    .get(protect, getBookingById);

router.patch('/:id/status', protect, admin, updateBookingStatus);

module.exports = router;
