const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const apiKeysController = require('../controllers/apiKeysController');
const { firebaseAuth, requireActiveUser } = require('../firebase/firebaseAuth');

// Validadores
const setApiKeyValidation = [
  param('provider')
    .isIn(['openai', 'gemini', 'claude', 'huggingface'])
    .withMessage('Proveedor debe ser uno de: openai, gemini, claude, huggingface'),
  body('apiKey')
    .notEmpty()
    .withMessage('API key es requerida')
    .isLength({ min: 10, max: 200 })
    .withMessage('API key debe tener entre 10 y 200 caracteres')
    .trim()
];

const providerValidation = [
  param('provider')
    .isIn(['openai', 'gemini', 'claude', 'huggingface'])
    .withMessage('Proveedor debe ser uno de: openai, gemini, claude, huggingface')
];

/**
 * @route   GET /api/api-keys
 * @desc    Obtiene las API keys configuradas del usuario (enmascaradas)
 * @access  Private
 */
router.get(
  '/',
  firebaseAuth,
  requireActiveUser,
  apiKeysController.getApiKeys
);

/**
 * @route   POST /api/api-keys/:provider
 * @desc    Configura o actualiza una API key específica
 * @access  Private
 */
router.post(
  '/:provider',
  firebaseAuth,
  requireActiveUser,
  setApiKeyValidation,
  apiKeysController.setApiKey
);

/**
 * @route   DELETE /api/api-keys/:provider
 * @desc    Elimina una API key específica
 * @access  Private
 */
router.delete(
  '/:provider',
  firebaseAuth,
  requireActiveUser,
  providerValidation,
  apiKeysController.deleteApiKey
);

/**
 * @route   POST /api/api-keys/:provider/test
 * @desc    Prueba una API key para verificar que funciona
 * @access  Private
 */
router.post(
  '/:provider/test',
  firebaseAuth,
  requireActiveUser,
  providerValidation,
  apiKeysController.testApiKey
);

/**
 * @route   GET /api/api-keys/status
 * @desc    Obtiene el estado de configuración de todas las API keys
 * @access  Private
 */
router.get(
  '/status',
  firebaseAuth,
  requireActiveUser,
  apiKeysController.getConfigurationStatus
);

module.exports = router;

