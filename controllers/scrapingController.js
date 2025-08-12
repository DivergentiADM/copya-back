const scrapingService = require("../services/scrapingService");
const buyerPersonaService = require("../services/buyerPersonaService");
const User = require("../models/User");
const { validationResult } = require("express-validator");

class ScrapingController {
  /**
   * Inicia el proceso de scraping de una URL y actualiza la información del negocio del usuario.
   * @route POST /api/scraping/start
   * @access Private
   */
  async startScraping(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Datos de entrada inválidos",
          errors: errors.array(),
        });
      }

      const { url } = req.body;
      const userId = req.user._id; // Asume que el usuario está autenticado

      if (!url) {
        return res.status(400).json({
          success: false,
          message: "URL es requerida para el scraping.",
        });
      }

      // Ejecutar el scraping
      const scrapedData = await scrapingService.scrapeWebsite(url);

      // Extraer textos clave
      const keyTexts = scrapingService.extractKeyTexts(scrapedData);

      // Actualizar información del negocio del usuario con los textos clave
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado.",
        });
      }

      // Combinar la información existente con la nueva del scraping
      user.businessInfo = {
        ...user.businessInfo,
        website: url,
        description: keyTexts.about || keyTexts.home || user.businessInfo.description,
        // Agregar campos adicionales del scraping
        scrapedContent: {
          home: keyTexts.home,
          products: keyTexts.products,
          mission: keyTexts.mission,
          benefits: keyTexts.benefits,
          contact: keyTexts.contact,
          about: keyTexts.about,
          scrapedAt: new Date()
        }
      };

      await user.save();

      res.status(200).json({
        success: true,
        message: "Scraping completado y información del negocio actualizada.",
        data: {
          scrapedData: keyTexts,
          updatedBusinessInfo: user.businessInfo,
          nextSteps: {
            canGenerateBuyerPersona: true,
            recommendation: "Ahora puedes generar un buyer persona automáticamente basado en esta información"
          }
        },
      });
    } catch (error) {
      console.error("Error en startScraping:", error);
      res.status(500).json({
        success: false,
        message: "Error al iniciar el scraping.",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Genera un Buyer Persona basado en la información del negocio del usuario.
   * @route POST /api/scraping/generate-buyer-persona
   * @access Private
   */
  async generateBuyerPersona(req, res) {
    try {
      const userId = req.user._id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado.",
        });
      }

      // Usar el contenido scrapeado si está disponible
      const scrapedData = user.businessInfo?.scrapedContent || {};

      // Generar buyer persona usando el nuevo servicio
      const buyerPersona = await buyerPersonaService.generateBuyerPersona(user, scrapedData);

      // Actualizar usuario con el buyer persona
      const updatedUser = await buyerPersonaService.updateUserBuyerPersona(user, buyerPersona);

      // Generar insights de contenido
      const contentInsights = buyerPersonaService.generateContentInsights(buyerPersona);

      res.status(200).json({
        success: true,
        message: "Buyer Persona generado y actualizado exitosamente.",
        data: {
          buyerPersona,
          contentInsights,
          updatedBusinessInfo: updatedUser.businessInfo
        },
      });
    } catch (error) {
      console.error("Error en generateBuyerPersona:", error);
      res.status(500).json({
        success: false,
        message: "Error al generar el Buyer Persona.",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Proceso completo de onboarding: scraping + buyer persona
   * @route POST /api/scraping/complete-onboarding
   * @access Private
   */
  async completeOnboarding(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Datos de entrada inválidos",
          errors: errors.array(),
        });
      }

      const { url } = req.body;
      const userId = req.user._id;

      if (!url) {
        return res.status(400).json({
          success: false,
          message: "URL es requerida para el onboarding completo.",
        });
      }

      // Paso 1: Realizar scraping
      console.log(`Iniciando onboarding completo para usuario ${userId} con URL: ${url}`);
      
      const scrapedData = await scrapingService.scrapeWebsite(url);
      const keyTexts = scrapingService.extractKeyTexts(scrapedData);

      // Paso 2: Actualizar información del negocio
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado.",
        });
      }

      user.businessInfo = {
        ...user.businessInfo,
        website: url,
        description: keyTexts.about || keyTexts.home || user.businessInfo.description,
        scrapedContent: {
          home: keyTexts.home,
          products: keyTexts.products,
          mission: keyTexts.mission,
          benefits: keyTexts.benefits,
          contact: keyTexts.contact,
          about: keyTexts.about,
          scrapedAt: new Date()
        }
      };

      await user.save();

      // Paso 3: Generar buyer persona
      const buyerPersona = await buyerPersonaService.generateBuyerPersona(user, keyTexts);
      const updatedUser = await buyerPersonaService.updateUserBuyerPersona(user, buyerPersona);

      // Paso 4: Generar insights de contenido
      const contentInsights = buyerPersonaService.generateContentInsights(buyerPersona);

      res.status(200).json({
        success: true,
        message: "Onboarding completo exitoso. Tu perfil está listo para generar contenido personalizado.",
        data: {
          scrapingResults: {
            extractedData: keyTexts,
            websiteAnalyzed: url
          },
          buyerPersona,
          contentInsights,
          businessInfo: updatedUser.businessInfo,
          onboardingComplete: true,
          nextSteps: [
            "Revisar y ajustar el buyer persona si es necesario",
            "Configurar preferencias de publicación",
            "Comenzar a generar contenido personalizado"
          ]
        },
      });

    } catch (error) {
      console.error("Error en onboarding completo:", error);
      res.status(500).json({
        success: false,
        message: "Error durante el proceso de onboarding.",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

module.exports = new ScrapingController();

