const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide the trip name'],
        },
        type: {
            type: String,
            enum: ['group', 'private'],
            required: [true, 'Please specify the trip type (group or private)'],
        },
        destination: {
            type: String,
            required: [true, 'Please provide the destination'],
        },
        countries: {
            type: [String],
            required: [true, 'Please provide at least one country'],
        },
        departureCity: {
            type: String,
            required: [true, 'Please provide the departure city'],
        },
        startDate: {
            type: Date,
            required: [true, 'Please provide the start date'],
        },
        endDate: {
            type: Date,
            required: [true, 'Please provide the end date'],
        },
        price: {
            type: Number,
            required: [true, 'Please provide the price of the trip'],
        },
        currency: {
            type: String,
            required: [true, 'Please provide the currency (e.g., USD)'],
            default: 'USD',
        },
        seatsTotal: {
            type: Number,
            required: [true, 'Please provide the total number of seats'],
        },
        waitlistLimit: {
            type: Number,
        },
        bookedCount: {
            type: Number,
            default: 0,
        },
        description: {
            type: String,
            required: [true, 'Please provide the trip description'],
        },
        highlights: {
            type: [String],
            default: [],
        },
        included: {
            type: [String],
            default: [],
        },
        notIncluded: {
            type: [String],
            default: [],
        },
        groupCode: {
            type: String,
        },
        itinerary: [
            {
                day: {
                    type: Number,
                    required: true,
                },
                title: {
                    type: String,
                    required: true,
                },
                description: {
                    type: String,
                    required: true,
                },
                activities: {
                    type: [String],
                    default: [],
                },
            },
        ],
        status: {
            type: String,
            enum: ['open', 'almost_full', 'sold_out', 'waitlist', 'completed'],
            default: 'open',
        },
        bookingOpen: {
            type: Boolean,
            default: true,
        },
        seatsAvailable: {
            type: Number,
            required: [true, 'Please provide the number of available seats'],
        },
        isInstallmentAllowed: {
            type: Boolean,
            default: true,
        },
        installmentDetails: {
            type: mongoose.Schema.Types.Mixed,
        }
    },
    {
        timestamps: true,
    }
);

const Trip = mongoose.model('Trip', tripSchema);

module.exports = Trip;
