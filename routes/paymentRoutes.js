const express = require('express');
const router = express.Router();
const { uploadReceipt, updateInstallmentStatus } = require('../controllers/paymentController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/installments/:id/receipt', protect, uploadReceipt);
router.patch('/installments/:id/status', protect, admin, updateInstallmentStatus);

module.exports = router;
