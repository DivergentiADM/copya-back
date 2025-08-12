// controllers/chatController.js
const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Process a chat message with AI customer support
// @route   POST /api/chat/message
// @access  Private
const processChatMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'El mensaje es obligatorio.'
      });
    }

    // Verificar límites de uso antes de procesar el mensaje
    const user = await User.findById(userId).populate('plan');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar límites de uso para customer support
    const hasLimit = user.checkUsageLimit('customerSupport');
    if (!hasLimit) {
      return res.status(403).json({
        success: false,
        message: 'Has alcanzado el límite diario de consultas de soporte de tu plan.'
      });
    }

    // Verificar créditos (el chat cuesta 1 crédito por mensaje)
    const creditsNeeded = 1;
    if (!user.checkCreditBalance(creditsNeeded)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes suficientes créditos para usar el chat de soporte. Actualiza tu plan para obtener más.'
      });
    }

    // TODO: Implementar la lógica real de procesamiento de chat con IA
    // Por ahora, simulamos una respuesta
    const simulatedResponse = {
      response: `Gracias por tu consulta: "${message}". Nuestro equipo de soporte está aquí para ayudarte. Esta es una respuesta simulada del sistema de IA.`,
      suggestions: [
        "Consulta nuestra documentación",
        "Revisa tu configuración de cuenta",
        "Contacta con un agente humano"
      ],
      relatedTopics: [
        "Configuración de cuenta",
        "Generación de contenido",
        "Publicación en redes"
      ]
    };

    // Incrementar uso y usar créditos
    await user.incrementUsage('customerSupport');
    await user.useCredits(creditsNeeded);

    res.status(200).json({
      success: true,
      data: {
        message,
        response: simulatedResponse,
        timestamp: new Date(),
        credits: {
          total: user.credits.total,
          used: user.credits.used + creditsNeeded,
          remaining: user.credits.total - user.credits.used - creditsNeeded
        }
      }
    });

  } catch (error) {
    logger.error('Error processing chat message:', error);
    res.status(500).json({
      success: false,
      message: 'Error procesando el mensaje de chat',
      error: error.message
    });
  }
};

// @desc    Get user's chat history
// @route   GET /api/chat/history
// @access  Private
const getChatHistory = async (req, res) => {
  try {
    // TODO: Implementar almacenamiento y recuperación del historial de chat
    res.status(200).json({
      success: true,
      data: {
        messages: [],
        totalCount: 0
      }
    });
  } catch (error) {
    logger.error('Error getting chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo el historial de chat',
      error: error.message
    });
  }
};

module.exports = {
  processChatMessage,
  getChatHistory
};