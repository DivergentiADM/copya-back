const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  handlePaymentWebhook,
  handleMercadoPagoWebhook,
  getPaymentHistory,
  getPaymentDetails,
  createPaymentPreference,
  getMercadoPagoPaymentDetails
} = require('../controllers/paymentController');

// Mercado Pago webhook endpoint
router.post('/webhook/mercadopago', handleMercadoPagoWebhook);

// Legacy webhook for backward compatibility
router.post('/webhook', handlePaymentWebhook);

// Protected routes
router.use(protect);

router.route('/')
  .get(getPaymentHistory)
  .post(createPaymentPreference);

router.route('/:id')
  .get(getPaymentDetails);

// Admin routes
router.route('/mercadopago/:paymentId')
  .get(getMercadoPagoPaymentDetails);

module.exports = router;
