const Booking = require('../models/Booking');

// @desc    Upload receipt (save Cloudinary URL) for an installment
// @route   POST /api/payments/installments/:id/receipt
// @access  Private
const uploadReceipt = async (req, res) => {
    try {
        const { receiptUrl } = req.body;

        if (!receiptUrl) {
            return res.status(400).json({ message: 'Please provide a receipt URL' });
        }

        // Find the booking that has this installment
        const booking = await Booking.findOne({ 'installments._id': req.params.id });

        if (!booking) {
            return res.status(404).json({ message: 'Installment not found' });
        }

        // Verify user owns the booking or is admin
        if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to upload receipt for this installment' });
        }

        const installment = booking.installments.id(req.params.id);

        // Save Cloudinary URL
        installment.receiptUrl = receiptUrl;
        installment.status = 'uploaded';

        await booking.save();

        res.status(200).json({
            success: true,
            installment
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while uploading receipt' });
    }
};

// @desc    Update installment status (Admin)
// @route   PATCH /api/payments/installments/:id/status
// @access  Private/Admin
const updateInstallmentStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!status || !['pending', 'uploaded', 'paid', 'overdue'].includes(status)) {
            return res.status(400).json({ message: 'Please provide a valid status' });
        }

        const booking = await Booking.findOne({ 'installments._id': req.params.id });

        if (!booking) {
            return res.status(404).json({ message: 'Installment not found' });
        }

        const installment = booking.installments.id(req.params.id);

        // Calculate amount changes if marking as paid or removing paid status
        if (status === 'paid' && installment.status !== 'paid') {
            booking.amountPaid += installment.amount;
        } else if (installment.status === 'paid' && status !== 'paid') {
            booking.amountPaid -= installment.amount;
        }

        // Update parent booking paymentStatus
        if (booking.amountPaid >= booking.totalAmount) {
            booking.paymentStatus = 'complete';
        } else if (booking.amountPaid > 0) {
            booking.paymentStatus = 'partial';
        } else {
            booking.paymentStatus = 'pending';
        }

        installment.status = status;
        await booking.save();

        res.status(200).json({
            success: true,
            installment
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while updating installment status' });
    }
};

module.exports = {
    uploadReceipt,
    updateInstallmentStatus
};
