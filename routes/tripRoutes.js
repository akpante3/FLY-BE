const express = require('express');
const router = express.Router();
const {
    getTrips,
    getTrip,
    createTrip,
    updateTrip,
    deleteTrip
} = require('../controllers/tripController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getTrips)
    .post(protect, admin, createTrip);

router.route('/:id')
    .get(getTrip)
    .patch(protect, admin, updateTrip)
    .delete(protect, admin, deleteTrip);

module.exports = router;
