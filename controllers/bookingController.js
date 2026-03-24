const Booking = require('../models/Booking');
const Trip = require('../models/Trip');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res) => {
    try {
        const { tripId, paymentType } = req.body;

        if (!tripId) {
            return res.status(400).json({ message: 'Please provide a tripId' });
        }

        const trip = await Trip.findById(tripId);

        if (!trip) {
            return res.status(404).json({ message: 'Trip not found' });
        }

        // Check if trip is open
        if (!trip.bookingOpen || trip.status === 'sold_out' || trip.status === 'completed') {
            return res.status(400).json({ message: 'Trip is no longer accepting bookings' });
        }

        // Check if seats are available
        if (trip.bookedCount >= trip.seatsTotal) {
            return res.status(400).json({ message: 'Trip is fully booked' });
        }

        // Validate paymentType if installment is chosen but not allowed
        if (paymentType === 'installment' && !trip.isInstallmentAllowed) {
            return res.status(400).json({ message: 'Installments are not allowed for this trip' });
        }

        // Check if user already booked this trip and it's not cancelled
        const existingBooking = await Booking.findOne({
            user: req.user._id,
            trip: tripId,
            status: { $ne: 'cancelled' }
        });

        if (existingBooking) {
            return res.status(400).json({ message: 'You have already booked this trip' });
        }

        const booking = await Booking.create({
            user: req.user._id,
            trip: tripId,
            paymentType,
            totalAmount: trip.price,
            status: 'pending',
            paymentStatus: 'pending',
        });

        // Increment bookedCount on the trip
        trip.bookedCount += 1;
        // Optionally update trip status if full
        if (trip.bookedCount >= trip.seatsTotal) {
            trip.status = 'sold_out';
        }
        await trip.save();

        res.status(201).json({
            success: true,
            booking
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while creating booking' });
    }
};

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private/Admin
const getAllBookings = async (req, res) => {
    try {
        const { status, paymentStatus, tripId } = req.query;

        // Build filter object based on query params
        const filter = {};
        if (status) filter.status = status;
        if (paymentStatus) filter.paymentStatus = paymentStatus;
        if (tripId) filter.trip = tripId;

        const bookings = await Booking.find(filter)
            .populate('user', 'fullName email phoneNumber')
            .populate('trip', 'name destination startDate endDate price');

        res.status(200).json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while fetching bookings' });
    }
};

// @desc    Get logged in user bookings
// @route   GET /api/bookings/mine
// @access  Private
const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user._id })
            .populate('trip', 'name destination startDate endDate price');

        res.status(200).json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while fetching your bookings' });
    }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('user', 'fullName email phoneNumber country')
            .populate('trip');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Make sure the user is requesting their own booking or is an admin
        if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to view this booking' });
        }

        res.status(200).json({
            success: true,
            booking
        });
    } catch (error) {
        console.error(error);
        if (error.name === 'CastError' && error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Booking not found' });
        }
        res.status(500).json({ message: 'Server error while fetching booking' });
    }
};

// @desc    Update booking status
// @route   PATCH /api/bookings/:id/status
// @access  Private/Admin
const updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!status || !['pending', 'confirmed', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Please provide a valid status (pending, confirmed, cancelled)' });
        }

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // If cancelling, decrement the trip bookedCount
        if (status === 'cancelled' && booking.status !== 'cancelled') {
            const trip = await Trip.findById(booking.trip);
            if (trip) {
                // Determine if it was actually subtracting from seats
                if (trip.bookedCount > 0) {
                    trip.bookedCount -= 1;
                    if (trip.status === 'sold_out' && trip.bookedCount < trip.seatsTotal) {
                        trip.status = 'open'; // Re-open the trip
                    }
                    await trip.save();
                }
            }
        }

        // If un-cancelling, increment bookedCount
        if (status !== 'cancelled' && booking.status === 'cancelled') {
            const trip = await Trip.findById(booking.trip);
            if (trip) {
                if (trip.bookedCount >= trip.seatsTotal) {
                    return res.status(400).json({ message: 'Cannot un-cancel: Trip is fully booked' });
                }
                trip.bookedCount += 1;
                if (trip.bookedCount >= trip.seatsTotal) {
                    trip.status = 'sold_out';
                }
                await trip.save();
            }
        }

        booking.status = status;
        await booking.save();

        res.status(200).json({
            success: true,
            booking
        });
    } catch (error) {
        console.error(error);
        if (error.name === 'CastError' && error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Booking not found' });
        }
        res.status(500).json({ message: 'Server error while updating booking status' });
    }
};

module.exports = {
    createBooking,
    getAllBookings,
    getMyBookings,
    getBookingById,
    updateBookingStatus
};
