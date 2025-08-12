const buyerPersonaService = require('../services/buyerPersonaService');
const User = require('../models/User');
const { validationResult } = require('express-validator');

class BuyerPersonaController {
  /**
   * Genera un buyer persona basado en la información del negocio del usuario
   * @route POST /api/buyer-persona/generate
   * @access Private
   */
  async generateBuyerPersona(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const userId = req.user._id;
      const { scrapedData, forceRegenerate } = req.body;

      // Obtener usuario con información completa
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Verificar si ya tiene buyer persona y no se fuerza regeneración
      if (user.businessInfo?.buyerPersona && !forceRegenerate) {
        return res.status(200).json({
          success: true,
          message: 'Buyer persona ya existe',
          data: {
            buyerPersona: user.businessInfo.buyerPersona,
            contentInsights: buyerPersonaService.generateContentInsights(user.businessInfo.buyerPersona),
            isExisting: true
          }
        });
      }

      // Verificar que haya información suficiente del negocio
      if (!user.businessInfo || (!user.businessInfo.description && !scrapedData)) {
        return res.status(400).json({
          success: false,
          message: 'Información insuficiente del negocio. Realiza el scraping del sitio web o completa la información manualmente.',
          code: 'INSUFFICIENT_BUSINESS_INFO'
        });
      }

      // Generar buyer persona
      const buyerPersona = await buyerPersonaService.generateBuyerPersona(user, scrapedData);

      // Actualizar usuario con el buyer persona
      const updatedUser = await buyerPersonaService.updateUserBuyerPersona(user, buyerPersona);

      // Generar insights de contenido
      const contentInsights = buyerPersonaService.generateContentInsights(buyerPersona);

      res.status(200).json({
        success: true,
        message: 'Buyer persona generado exitosamente',
        data: {
          buyerPersona,
          contentInsights,
          updatedBusinessInfo: updatedUser.businessInfo,
          isNew: true
        }
      });

    } catch (error) {
      console.error('Error generando buyer persona:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando buyer persona',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtiene el buyer persona actual del usuario
   * @route GET /api/buyer-persona/current
   * @access Private
   */
  async getCurrentBuyerPersona(req, res) {
    try {
      const userId = req.user._id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const buyerPersona = user.businessInfo?.buyerPersona;
      
      if (!buyerPersona) {
        return res.status(404).json({
          success: false,
          message: 'No se ha generado un buyer persona aún',
          code: 'NO_BUYER_PERSONA'
        });
      }

      // Generar insights actualizados
      const contentInsights = buyerPersonaService.generateContentInsights(buyerPersona);

      res.status(200).json({
        success: true,
        data: {
          buyerPersona,
          contentInsights,
          lastUpdate: user.businessInfo.lastPersonaUpdate
        }
      });

    } catch (error) {
      console.error('Error obteniendo buyer persona:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo buyer persona',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Actualiza manualmente el buyer persona
   * @route PUT /api/buyer-persona/update
   * @access Private
   */
  async updateBuyerPersona(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const userId = req.user._id;
      const { buyerPersona } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Validar estructura del buyer persona
      const validatedPersona = buyerPersonaService.validateAndCompleteBuyerPersona(
        buyerPersona, 
        user.businessInfo
      );

      // Actualizar usuario
      const updatedUser = await buyerPersonaService.updateUserBuyerPersona(user, validatedPersona);

      // Generar insights actualizados
      const contentInsights = buyerPersonaService.generateContentInsights(validatedPersona);

      res.status(200).json({
        success: true,
        message: 'Buyer persona actualizado exitosamente',
        data: {
          buyerPersona: validatedPersona,
          contentInsights,
          updatedBusinessInfo: updatedUser.businessInfo
        }
      });

    } catch (error) {
      console.error('Error actualizando buyer persona:', error);
      res.status(500).json({
        success: false,
        message: 'Error actualizando buyer persona',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Elimina el buyer persona actual
   * @route DELETE /api/buyer-persona/delete
   * @access Private
   */
  async deleteBuyerPersona(req, res) {
    try {
      const userId = req.user._id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Eliminar buyer persona
      if (user.businessInfo) {
        user.businessInfo.buyerPersona = undefined;
        user.businessInfo.lastPersonaUpdate = undefined;
        await user.save();
      }

      res.status(200).json({
        success: true,
        message: 'Buyer persona eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando buyer persona:', error);
      res.status(500).json({
        success: false,
        message: 'Error eliminando buyer persona',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtiene insights de contenido basados en el buyer persona
   * @route GET /api/buyer-persona/content-insights
   * @access Private
   */
  async getContentInsights(req, res) {
    try {
      const userId = req.user._id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const buyerPersona = user.businessInfo?.buyerPersona;
      
      if (!buyerPersona) {
        return res.status(404).json({
          success: false,
          message: 'No se ha generado un buyer persona aún',
          code: 'NO_BUYER_PERSONA'
        });
      }

      const contentInsights = buyerPersonaService.generateContentInsights(buyerPersona);

      res.status(200).json({
        success: true,
        data: {
          contentInsights,
          personaName: buyerPersona.name,
          lastUpdate: user.businessInfo.lastPersonaUpdate
        }
      });

    } catch (error) {
      console.error('Error obteniendo insights de contenido:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo insights de contenido',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Genera un buyer persona de ejemplo para demostración
   * @route POST /api/buyer-persona/demo
   * @access Private
   */
  async generateDemoBuyerPersona(req, res) {
    try {
      const { industry } = req.body;

      // Crear información de negocio de ejemplo
      const demoBusinessInfo = {
        name: 'Negocio Demo',
        industry: industry || 'tecnología',
        description: 'Negocio de ejemplo para demostración'
      };

      // Generar buyer persona de ejemplo
      const demoBuyerPersona = buyerPersonaService.generateFallbackBuyerPersona(demoBusinessInfo);

      // Generar insights
      const contentInsights = buyerPersonaService.generateContentInsights(demoBuyerPersona);

      res.status(200).json({
        success: true,
        message: 'Buyer persona de demostración generado',
        data: {
          buyerPersona: demoBuyerPersona,
          contentInsights,
          isDemo: true
        }
      });

    } catch (error) {
      console.error('Error generando buyer persona demo:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando buyer persona de demostración',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Valida la información del negocio para generar buyer persona
   * @route POST /api/buyer-persona/validate-business-info
   * @access Private
   */
  async validateBusinessInfo(req, res) {
    try {
      const userId = req.user._id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const businessInfo = user.businessInfo || {};
      
      // Verificar campos requeridos
      const requiredFields = ['name', 'industry', 'description'];
      const missingFields = requiredFields.filter(field => !businessInfo[field]);
      
      const hasWebsite = !!businessInfo.website;
      const hasSufficientInfo = missingFields.length === 0 || hasWebsite;

      res.status(200).json({
        success: true,
        data: {
          isValid: hasSufficientInfo,
          missingFields,
          hasWebsite,
          canGeneratePersona: hasSufficientInfo,
          recommendations: this.getBusinessInfoRecommendations(businessInfo, missingFields)
        }
      });

    } catch (error) {
      console.error('Error validando información del negocio:', error);
      res.status(500).json({
        success: false,
        message: 'Error validando información del negocio',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtiene recomendaciones para completar información del negocio
   * @private
   */
  getBusinessInfoRecommendations(businessInfo, missingFields) {
    const recommendations = [];

    if (missingFields.includes('name')) {
      recommendations.push('Agrega el nombre de tu negocio para personalizar el buyer persona');
    }

    if (missingFields.includes('industry')) {
      recommendations.push('Especifica la industria para generar un perfil más preciso');
    }

    if (missingFields.includes('description')) {
      recommendations.push('Proporciona una descripción de tu negocio o realiza scraping de tu sitio web');
    }

    if (!businessInfo.website) {
      recommendations.push('Agrega la URL de tu sitio web para extraer información automáticamente');
    }

    if (!businessInfo.targetAudience) {
      recommendations.push('Define tu audiencia objetivo actual para mejorar la precisión');
    }

    return recommendations;
  }
}

module.exports = new BuyerPersonaController();

