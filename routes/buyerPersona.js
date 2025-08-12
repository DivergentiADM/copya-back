const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const buyerPersonaController = require('../controllers/buyerPersonaController');
const { firebaseAuth, requireActiveUser } = require('../firebase/firebaseAuth');
const { protect } = require('../middleware/auth');

// Validadores
const generatePersonaValidation = [
  body('scrapedData')
    .optional()
    .isObject()
    .withMessage('scrapedData debe ser un objeto'),
  body('forceRegenerate')
    .optional()
    .isBoolean()
    .withMessage('forceRegenerate debe ser un booleano')
];

const updatePersonaValidation = [
  body('buyerPersona')
    .notEmpty()
    .isObject()
    .withMessage('buyerPersona es requerido y debe ser un objeto'),
  body('buyerPersona.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre del persona debe tener entre 2 y 100 caracteres'),
  body('buyerPersona.tagline')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('El tagline no puede exceder 200 caracteres')
];

const demoPersonaValidation = [
  body('industry')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('La industria debe tener entre 2 y 50 caracteres')
];

/**
 * @route   POST /api/buyer-persona/generate
 * @desc    Genera un buyer persona basado en la información del negocio
 * @access  Private
 */
router.post(
  '/generate',
  requireActiveUser,
  generatePersonaValidation,
  buyerPersonaController.generateBuyerPersona
);

/**
 * @route   GET /api/buyer-persona/current
 * @desc    Obtiene el buyer persona actual del usuario
 * @access  Private
 */
router.get(
  '/current',
  firebaseAuth,
  requireActiveUser,
  buyerPersonaController.getCurrentBuyerPersona
);

/**
 * @route   PUT /api/buyer-persona/update
 * @desc    Actualiza manualmente el buyer persona
 * @access  Private
 */
router.put(
  '/update',
  firebaseAuth,
  requireActiveUser,
  updatePersonaValidation,
  buyerPersonaController.updateBuyerPersona
);

/**
 * @route   DELETE /api/buyer-persona/delete
 * @desc    Elimina el buyer persona actual
 * @access  Private
 */
router.delete(
  '/delete',
  firebaseAuth,
  requireActiveUser,
  buyerPersonaController.deleteBuyerPersona
);

/**
 * @route   GET /api/buyer-persona/content-insights
 * @desc    Obtiene insights de contenido basados en el buyer persona
 * @access  Private
 */
router.get(
  '/content-insights',
  firebaseAuth,
  requireActiveUser,
  buyerPersonaController.getContentInsights
);

/**
 * @route   POST /api/buyer-persona/demo
 * @desc    Genera un buyer persona de ejemplo para demostración
 * @access  Private
 */
router.post(
  '/demo',
  firebaseAuth,
  requireActiveUser,
  demoPersonaValidation,
  buyerPersonaController.generateDemoBuyerPersona
);

/**
 * @route   POST /api/buyer-persona/validate-business-info
 * @desc    Valida la información del negocio para generar buyer persona
 * @access  Private
 */
router.post(
  '/validate-business-info',
  firebaseAuth,
  requireActiveUser,
  buyerPersonaController.validateBusinessInfo
);

module.exports = router;

