const User = require('../models/User');
const { validationResult } = require('express-validator');
const encryptionUtils = require('../utils/encryptionUtils');

class ApiKeysController {
  /**
   * Obtiene las API keys configuradas del usuario (sin mostrar las claves completas)
   * @route GET /api/api-keys
   * @access Private
   */
  async getApiKeys(req, res) {
    try {
      const userId = req.user._id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const apiKeys = user.apiKeys || {};
      
      // Ocultar las claves reales por seguridad
      const maskedKeys = {};
      Object.keys(apiKeys).forEach(provider => {
        if (apiKeys[provider]) {
          maskedKeys[provider] = {
            configured: true,
            masked: `${apiKeys[provider].substring(0, 8)}...${apiKeys[provider].slice(-4)}`,
            lastUpdated: user.apiKeysLastUpdated?.[provider] || null
          };
        } else {
          maskedKeys[provider] = {
            configured: false,
            masked: null,
            lastUpdated: null
          };
        }
      });

      res.status(200).json({
        success: true,
        data: {
          apiKeys: maskedKeys,
          supportedProviders: ['openai', 'gemini', 'claude', 'huggingface'],
          lastGlobalUpdate: user.apiKeysLastUpdated?.global || null
        }
      });

    } catch (error) {
      console.error('Error obteniendo API keys:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo API keys',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Configura o actualiza una API key específica
   * @route POST /api/api-keys/:provider
   * @access Private
   */
  async setApiKey(req, res) {
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
      const { provider } = req.params;
      const { apiKey } = req.body;

      const supportedProviders = ['openai', 'gemini', 'claude', 'huggingface'];
      
      if (!supportedProviders.includes(provider)) {
        return res.status(400).json({
          success: false,
          message: `Proveedor no soportado. Proveedores válidos: ${supportedProviders.join(', ')}`
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Validar formato de API key según el proveedor
      const validationResult = this.validateApiKeyFormat(provider, apiKey);
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: validationResult.message
        });
      }

      // Encriptar la API key antes de guardarla
      const encryptedKey = encryptionUtils.encrypt(apiKey);

      // Actualizar las API keys del usuario
      if (!user.apiKeys) {
        user.apiKeys = {};
      }
      if (!user.apiKeysLastUpdated) {
        user.apiKeysLastUpdated = {};
      }

      user.apiKeys[provider] = encryptedKey;
      user.apiKeysLastUpdated[provider] = new Date();
      user.apiKeysLastUpdated.global = new Date();

      await user.save();

      res.status(200).json({
        success: true,
        message: `API key de ${provider} configurada exitosamente`,
        data: {
          provider,
          configured: true,
          masked: `${apiKey.substring(0, 8)}...${apiKey.slice(-4)}`,
          lastUpdated: user.apiKeysLastUpdated[provider]
        }
      });

    } catch (error) {
      console.error('Error configurando API key:', error);
      res.status(500).json({
        success: false,
        message: 'Error configurando API key',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Elimina una API key específica
   * @route DELETE /api/api-keys/:provider
   * @access Private
   */
  async deleteApiKey(req, res) {
    try {
      const userId = req.user._id;
      const { provider } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      if (!user.apiKeys || !user.apiKeys[provider]) {
        return res.status(404).json({
          success: false,
          message: `No se encontró API key para ${provider}`
        });
      }

      // Eliminar la API key
      delete user.apiKeys[provider];
      if (user.apiKeysLastUpdated) {
        delete user.apiKeysLastUpdated[provider];
        user.apiKeysLastUpdated.global = new Date();
      }

      await user.save();

      res.status(200).json({
        success: true,
        message: `API key de ${provider} eliminada exitosamente`
      });

    } catch (error) {
      console.error('Error eliminando API key:', error);
      res.status(500).json({
        success: false,
        message: 'Error eliminando API key',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Prueba una API key para verificar que funciona
   * @route POST /api/api-keys/:provider/test
   * @access Private
   */
  async testApiKey(req, res) {
    try {
      const userId = req.user._id;
      const { provider } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      if (!user.apiKeys || !user.apiKeys[provider]) {
        return res.status(404).json({
          success: false,
          message: `No se encontró API key para ${provider}`
        });
      }

      // Desencriptar la API key
      const decryptedKey = encryptionUtils.decrypt(user.apiKeys[provider]);

      // Probar la API key
      const testResult = await this.performApiKeyTest(provider, decryptedKey);

      res.status(200).json({
        success: true,
        message: `API key de ${provider} ${testResult.isValid ? 'válida' : 'inválida'}`,
        data: {
          provider,
          isValid: testResult.isValid,
          testDetails: testResult.details,
          testedAt: new Date()
        }
      });

    } catch (error) {
      console.error('Error probando API key:', error);
      res.status(500).json({
        success: false,
        message: 'Error probando API key',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtiene el estado de configuración de todas las API keys
   * @route GET /api/api-keys/status
   * @access Private
   */
  async getConfigurationStatus(req, res) {
    try {
      const userId = req.user._id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const apiKeys = user.apiKeys || {};
      const supportedProviders = ['openai', 'gemini', 'claude', 'huggingface'];
      
      const status = {
        totalProviders: supportedProviders.length,
        configuredProviders: 0,
        missingProviders: [],
        configuredList: [],
        canGenerateContent: false
      };

      supportedProviders.forEach(provider => {
        if (apiKeys[provider]) {
          status.configuredProviders++;
          status.configuredList.push(provider);
        } else {
          status.missingProviders.push(provider);
        }
      });

      // Puede generar contenido si tiene al menos una API key configurada
      status.canGenerateContent = status.configuredProviders > 0;

      res.status(200).json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Error obteniendo estado de configuración:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estado de configuración',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Valida el formato de una API key según el proveedor
   * @private
   */
  validateApiKeyFormat(provider, apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return { isValid: false, message: 'API key es requerida y debe ser una cadena de texto' };
    }

    switch (provider) {
      case 'openai':
        if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
          return { isValid: false, message: 'API key de OpenAI debe comenzar con "sk-" y tener al menos 20 caracteres' };
        }
        break;
      
      case 'gemini':
        if (apiKey.length < 20) {
          return { isValid: false, message: 'API key de Gemini debe tener al menos 20 caracteres' };
        }
        break;
      
      case 'claude':
        if (!apiKey.startsWith('sk-ant-') || apiKey.length < 20) {
          return { isValid: false, message: 'API key de Claude debe comenzar con "sk-ant-" y tener al menos 20 caracteres' };
        }
        break;
      
      case 'huggingface':
        if (!apiKey.startsWith('hf_') || apiKey.length < 20) {
          return { isValid: false, message: 'API key de Hugging Face debe comenzar con "hf_" y tener al menos 20 caracteres' };
        }
        break;
      
      default:
        return { isValid: false, message: 'Proveedor no soportado' };
    }

    return { isValid: true, message: 'Formato válido' };
  }

  /**
   * Realiza una prueba real de la API key
   * @private
   */
  async performApiKeyTest(provider, apiKey) {
    try {
      const axios = require('axios');
      
      switch (provider) {
        case 'openai':
          const openaiResponse = await axios.get('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });
          return {
            isValid: openaiResponse.status === 200,
            details: 'Conexión exitosa con OpenAI API'
          };

        case 'gemini':
          // Prueba básica para Gemini (Google AI)
          const geminiResponse = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            contents: [{
              parts: [{ text: "Hello" }]
            }]
          }, {
            timeout: 10000
          });
          return {
            isValid: geminiResponse.status === 200,
            details: 'Conexión exitosa con Gemini API'
          };

        case 'claude':
          const claudeResponse = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hello' }]
          }, {
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01'
            },
            timeout: 10000
          });
          return {
            isValid: claudeResponse.status === 200,
            details: 'Conexión exitosa con Claude API'
          };

        case 'huggingface':
          const hfResponse = await axios.get('https://api-inference.huggingface.co/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`
            },
            timeout: 10000
          });
          return {
            isValid: hfResponse.status === 200,
            details: 'Conexión exitosa con Hugging Face API'
          };

        default:
          return {
            isValid: false,
            details: 'Proveedor no soportado para pruebas'
          };
      }

    } catch (error) {
      console.error(`Error probando API key de ${provider}:`, error.message);
      return {
        isValid: false,
        details: `Error de conexión: ${error.response?.data?.error?.message || error.message}`
      };
    }
  }
}

module.exports = new ApiKeysController();

