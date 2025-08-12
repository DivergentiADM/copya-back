const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Verificación del webhook de WhatsApp
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    logger.info('Webhook verificado exitosamente');
    res.status(200).send(challenge);
  } else {
    logger.error('Error en la verificación del webhook');
    res.sendStatus(403);
  }
});

// Recepción de mensajes de WhatsApp
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
      const changes = body.entry?.[0]?.changes?.[0];
      if (changes?.field === 'messages') {
        const messages = changes.value.messages;
        if (messages) {
          
        }
      }
    }
    res.sendStatus(200);
  } catch (error) {
    logger.error('Error procesando webhook:', error);
    res.sendStatus(500);
  }
});


module.exports = router;