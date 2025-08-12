const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const logger = require('../utils/logger');

class MercadoPagoService {
  constructor() {
    this.client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      options: { timeout: 5000, idempotencyKey: process.env.MERCADOPAGO_IDEMPOTENCY_KEY }
    });
  }

  async createPreference(paymentData) {
    try {
      const preference = new Preference(this.client);
      
      const preferenceData = {
        items: [
          {
            id: paymentData.planId,
            title: paymentData.planName,
            description: paymentData.planDescription || `Plan ${paymentData.planName}`,
            quantity: 1,
            currency_id: 'COP',
            unit_price: paymentData.amount,
          }
        ],
        payer: {
          name: paymentData.userName,
          email: paymentData.userEmail,
          identification: {
            type: 'CC',
            number: paymentData.userDocument || '123456789'
          }
        },
        back_urls: {
          success: `${process.env.FRONTEND_URL}/payments/success`,
          failure: `${process.env.FRONTEND_URL}/payments/failure`,
          pending: `${process.env.FRONTEND_URL}/payments/pending`
        },
        auto_return: 'approved',
        notification_url: `${process.env.BACKEND_URL}/api/webhooks/mercadopago`,
        statement_descriptor: 'ContentBold',
        external_reference: paymentData.externalReference,
        expires: false,
        payment_methods: {
          excluded_payment_types: [],
          installments: 12,
          default_installments: 1
        }
      };

      const response = await preference.create({ body: preferenceData });
      
      logger.info('Preference created successfully', {
        preferenceId: response.id,
        externalReference: paymentData.externalReference
      });

      return {
        preferenceId: response.id,
        initPoint: response.init_point,
        sandboxInitPoint: response.sandbox_init_point
      };
    } catch (error) {
      logger.error('Error creating MercadoPago preference', {
        error: error.message,
        paymentData: { planId: paymentData.planId, amount: paymentData.amount }
      });
      throw new Error(`Failed to create payment preference: ${error.message}`);
    }
  }

  async getPayment(paymentId) {
    try {
      const payment = new Payment(this.client);
      const response = await payment.get({ id: paymentId });
      
      logger.info('Payment retrieved successfully', {
        paymentId: response.id,
        status: response.status,
        externalReference: response.external_reference
      });

      return {
        id: response.id,
        status: response.status,
        statusDetail: response.status_detail,
        transactionAmount: response.transaction_amount,
        installments: response.installments,
        paymentMethod: response.payment_method_id,
        paymentType: response.payment_type_id,
        externalReference: response.external_reference,
        payerEmail: response.payer?.email,
        dateCreated: response.date_created,
        dateApproved: response.date_approved,
        description: response.description,
        metadata: response.metadata
      };
    } catch (error) {
      logger.error('Error getting payment details', {
        error: error.message,
        paymentId
      });
      throw new Error(`Failed to get payment details: ${error.message}`);
    }
  }

  async searchPayments(filters = {}) {
    try {
      const payment = new Payment(this.client);
      const searchFilters = {
        external_reference: filters.externalReference,
        status: filters.status,
        range: filters.range || 'date_created',
        begin_date: filters.beginDate,
        end_date: filters.endDate,
        limit: filters.limit || 10,
        offset: filters.offset || 0
      };

      const response = await payment.search({
        options: searchFilters
      });

      return {
        results: response.results || [],
        paging: response.paging || { total: 0, limit: 10, offset: 0 }
      };
    } catch (error) {
      logger.error('Error searching payments', {
        error: error.message,
        filters
      });
      throw new Error(`Failed to search payments: ${error.message}`);
    }
  }

  async processWebhook(body, query) {
    try {
      logger.info('Processing MercadoPago webhook', {
        topic: query.topic,
        id: query.id,
        body: body
      });

      if (query.topic === 'payment') {
        const paymentData = await this.getPayment(query.id);
        return {
          type: 'payment',
          data: paymentData
        };
      }

      if (query.topic === 'merchant_order') {
        return {
          type: 'merchant_order',
          data: body
        };
      }

      return null;
    } catch (error) {
      logger.error('Error processing webhook', {
        error: error.message,
        body,
        query
      });
      throw error;
    }
  }

  validateWebhookSignature(signature, body) {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET)
      .update(JSON.stringify(body))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

module.exports = new MercadoPagoService();