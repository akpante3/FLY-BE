const Trip = require('../models/Trip');

// @desc    Get all available trips with pagination and filtering
// @route   GET /api/trips
// @access  Public
const getTrips = async (req, res) => {
    try {
        const { status, type, page = 1, limit = 10 } = req.query;

        // Build query object
        const query = {};
        if (status) {
            query.status = status;
        }
        if (type) {
            query.type = type;
        }

        // Pagination setup
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const skip = (pageNumber - 1) * limitNumber;

        // Execute query
        const trips = await Trip.find(query)
            .skip(skip)
            .limit(limitNumber)
            .sort({ startDate: 1 }); // Sorted by upcoming dates first

        // Get total count for pagination metadata
        const totalTrips = await Trip.countDocuments(query);
        const totalPages = Math.ceil(totalTrips / limitNumber);

        res.status(200).json({
            success: true,
            count: trips.length,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                totalPages,
                totalTrips
            },
            data: trips
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error while fetching trips' });
    }
};

// @desc    Get a single trip by ID
// @route   GET /api/trips/:id
// @access  Public
const getTrip = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);

        if (!trip) {
            return res.status(404).json({ success: false, message: 'Trip not found' });
        }

        res.status(200).json({
            success: true,
            data: trip
        });
    } catch (error) {
        console.error(error);

        // Handle invalid MongoDB ObjectId correctly
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'Trip not found' });
        }

        res.status(500).json({ success: false, message: 'Server error while fetching trip' });
    }
};

// @desc    Create a new trip
// @route   POST /api/trips
// @access  Private/Admin
const createTrip = async (req, res) => {
    try {
        const trip = await Trip.create(req.body);
        res.status(201).json({
            success: true,
            data: trip
        });
    } catch (error) {
        console.error(error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Server error while creating trip' });
    }
};

// @desc    Update a trip
// @route   PATCH /api/trips/:id
// @access  Private/Admin
const updateTrip = async (req, res) => {
    try {
        let trip = await Trip.findById(req.params.id);

        if (!trip) {
            return res.status(404).json({ success: false, message: 'Trip not found' });
        }

        // Update trip with body data. Using new: true to return the updated document.
        trip = await Trip.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: trip
        });
    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'Trip not found' });
        }
        res.status(500).json({ success: false, message: 'Server error while updating trip' });
    }
};

// @desc    Delete a trip
// @route   DELETE /api/trips/:id
// @access  Private/Admin
const deleteTrip = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);

        if (!trip) {
            return res.status(404).json({ success: false, message: 'Trip not found' });
        }

        await trip.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'Trip not found' });
        }
        res.status(500).json({ success: false, message: 'Server error while deleting trip' });
    }
};

module.exports = {
    getTrips,
    getTrip,
    createTrip,
    updateTrip,
    deleteTrip
};
