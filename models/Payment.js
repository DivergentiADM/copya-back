const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: 'COP',
  },
  status: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'cancelled', 'in_process', 'approved'],
    required: true,
  },
  transactionId: {
    type: String,
    required: true,
    unique: true,
  },
  paymentProvider: {
    type: String,
    required: true,
    default: 'mercadopago',
  },
  mercadoPagoPreferenceId: {
    type: String,
    unique: true,
    sparse: true,
  },
  mercadoPagoPaymentId: {
    type: String,
    unique: true,
    sparse: true,
  },
  paymentMethod: {
    type: String,
  },
  paymentType: {
    type: String,
  },
  installments: {
    type: Number,
    default: 1,
  },
  externalReference: {
    type: String,
    unique: true,
  },
}, {
  timestamps: true,
});

paymentSchema.index({ user: 1 });
paymentSchema.index({ transactionId: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
