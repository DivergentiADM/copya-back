const Payment = require('../models/Payment');
const User = require('../models/User');
const Plan = require('../models/Plan');
const mercadopagoService = require('../services/mercadopagoService');

// @desc    Create a new payment preference with Mercado Pago
// @route   POST /api/payments/create-preference
// @access  Private
const createPaymentPreference = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const plan = await Plan.findById(planId);

    if (!user || !plan) {
      return res.status(404).json({ success: false, error: 'User or Plan not found' });
    }

    const externalReference = `payment_${userId}_${planId}_${Date.now()}`;
    
    const preferenceData = {
      planId: plan._id.toString(),
      planName: plan.name,
      planDescription: plan.description,
      amount: plan.price.USD, // Usar precio en USD
      userName: user.name,
      userEmail: user.email,
      userDocument: user.document || '123456789',
      externalReference
    };

    const preference = await mercadopagoService.createPreference(preferenceData);

    // Create pending payment record
    await Payment.create({
      user: userId,
      plan: planId,
      amount: plan.price.USD,
      currency: 'USD',
      transactionId: externalReference,
      status: 'pending',
      mercadoPagoPreferenceId: preference.preferenceId,
      externalReference,
      paymentProvider: 'mercadopago'
    });

    res.status(200).json({
      success: true,
      data: {
        preferenceId: preference.preferenceId,
        initPoint: preference.initPoint,
        sandboxInitPoint: preference.sandboxInitPoint
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Handle Mercado Pago webhook
// @route   POST /api/payments/webhook
// @access  Public (Webhook)
const handleMercadoPagoWebhook = async (req, res) => {
  try {
    const { query } = req;
    const { body } = req;

    if (!query.topic || !query.id) {
      return res.status(400).json({ success: false, error: 'Invalid webhook data' });
    }

    const webhookData = await mercadopagoService.processWebhook(body, query);

    if (webhookData && webhookData.type === 'payment') {
      const paymentData = webhookData.data;
      
      // Find payment record by external reference
      const payment = await Payment.findOne({
        externalReference: paymentData.externalReference
      }).populate('user').populate('plan');

      if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }

      // Update payment record
      payment.status = paymentData.status === 'approved' ? 'approved' : 
                     paymentData.status === 'rejected' ? 'failed' : 'pending';
      payment.mercadoPagoPaymentId = paymentData.id;
      payment.paymentMethod = paymentData.paymentMethod;
      payment.paymentType = paymentData.paymentType;
      payment.installments = paymentData.installments;

      await payment.save();

      // Update user plan if payment is approved
      if (paymentData.status === 'approved') {
        const user = payment.user;
        const plan = payment.plan;
        
        user.plan = plan._id;
        
        // Establecer fecha de expiración (30 días a partir de ahora)
        const now = new Date();
        user.planExpiresAt = new Date(now.setDate(now.getDate() + 30));
        
        // Reiniciar créditos del usuario
        await user.resetCredits(plan.creditsPerMonth);
        
        // Desactivar período de prueba si estaba activo
        user.isTrialActive = false;
        user.trialEndsAt = null;
        user.trialStartedAt = null;
        
        await user.save();

        console.log('User plan updated', {
          userId: user._id,
          planId: plan._id,
          paymentId: payment._id
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in MercadoPago webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Handle a successful payment (legacy webhook for backward compatibility)
// @route   POST /api/payments/webhook/legacy
// @access  Private (Webhook)
const handlePaymentWebhook = async (req, res) => {
  const { userId, planId, amount, currency, transactionId, status } = req.body;

  if (status !== 'succeeded') {
    return res.status(400).json({ success: false, error: 'Payment not successful' });
  }

  try {
    const user = await User.findById(userId);
    const plan = await Plan.findById(planId);

    if (!user || !plan) {
      return res.status(404).json({ success: false, error: 'User or Plan not found' });
    }

    await Payment.create({
      user: userId,
      plan: planId,
      amount,
      currency,
      transactionId,
      status: 'succeeded',
      paymentProvider: 'stripe'
    });

    user.plan = planId;
    
    // Establecer fecha de expiración (30 días a partir de ahora)
    const now = new Date();
    user.planExpiresAt = new Date(now.setDate(now.getDate() + 30));
    
    // Reiniciar créditos del usuario
    await user.resetCredits(plan.creditsPerMonth);
    
    // Desactivar período de prueba si estaba activo
    user.isTrialActive = false;
    user.trialEndsAt = null;
    user.trialStartedAt = null;
    
    await user.save();

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get payment history for a user
// @route   GET /api/payments
// @access  Private
const getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .populate('plan')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get payment details by ID
// @route   GET /api/payments/:id
// @access  Private
const getPaymentDetails = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('plan');

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get payment details from Mercado Pago
// @route   GET /api/payments/mercadopago/:paymentId
// @access  Private (Admin)
const getMercadoPagoPaymentDetails = async (req, res) => {
  try {
    const paymentId = req.params.paymentId;
    const paymentDetails = await mercadopagoService.getPayment(paymentId);
    
    res.status(200).json({ success: true, data: paymentDetails });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createPaymentPreference,
  handleMercadoPagoWebhook,
  handlePaymentWebhook,
  getPaymentHistory,
  getPaymentDetails,
  getMercadoPagoPaymentDetails
};