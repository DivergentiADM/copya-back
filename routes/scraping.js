const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const scrapingController = require("../controllers/scrapingController");
const { firebaseAuth, requireActiveUser } = require("../firebase/firebaseAuth");
const { protect } = require('../middleware/auth')
/**
 * @route   POST /api/scraping/start
 * @desc    Inicia el proceso de scraping de una URL y actualiza la información del negocio del usuario.
 * @access  Private
 */
router.post(
  "/start",
  protect,
  requireActiveUser,
  [
    body("url")
      .isURL()
      .withMessage("Por favor, introduce una URL válida.")
      .notEmpty()
      .withMessage("La URL es requerida."),
  ],
  scrapingController.startScraping
);

/**
 * @route   POST /api/scraping/generate-buyer-persona
 * @desc    Genera un Buyer Persona basado en la información del negocio del usuario.
 * @access  Private
 */
router.post(
  "/generate-buyer-persona",
  firebaseAuth,
  requireActiveUser,
  scrapingController.generateBuyerPersona
);

/**
 * @route   POST /api/scraping/complete-onboarding
 * @desc    Proceso completo de onboarding: scraping + buyer persona
 * @access  Private
 */
router.post(
  "/complete-onboarding",
  requireActiveUser,
  [
    body("url")
      .isURL()
      .withMessage("Por favor, introduce una URL válida.")
      .notEmpty()
      .withMessage("La URL es requerida."),
  ],
  scrapingController.completeOnboarding
);

module.exports = router;

