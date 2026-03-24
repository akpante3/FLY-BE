const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Booking must belong to a user'],
        },
        trip: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Trip',
            required: [true, 'Booking must belong to a trip'],
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'cancelled'],
            default: 'pending',
        },
        paymentType: {
            type: String,
            enum: ['full', 'installment'],
            required: [true, 'Please specify payment type (full or installment)'],
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'partial', 'complete', 'overdue'],
            default: 'pending',
        },
        totalAmount: {
            type: Number,
            required: [true, 'Booking must have a total amount'],
        },
        amountPaid: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
