const express = require('express');
const router = express.Router();
const { uploadReceipt, updateInstallmentStatus } = require('../controllers/paymentController');
const { protect, admin } = require('../middleware/authMiddleware');
const { uploadReceipt: receiptUploader } = require('../middleware/uploadMiddleware');

router.post('/installments/:id/receipt', protect, receiptUploader.single('receipt'), uploadReceipt);
router.patch('/installments/:id/status', protect, admin, updateInstallmentStatus);

module.exports = router;
