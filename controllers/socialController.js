const SocialAccount = require('../models/SocialAccount');
const { validationResult } = require('express-validator');
const socialMediaService = require('../services/socialMediaService');
const { encryptData, decryptData } = require('../utils/encryptionUtils');

class SocialController {
  // Obtener todas las cuentas de redes sociales del usuario
  async getAccounts(req, res) {
    try {
      const userId = req.user._id;

      const accounts = await SocialAccount.find({ userId })
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: {
          accounts: accounts.map(account => account.toJSON())
        }
      });

    } catch (error) {
      console.error('Error obteniendo cuentas sociales:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener cuenta específica por plataforma
  async getAccountByPlatform(req, res) {
    try {
      const { platform } = req.params;
      const userId = req.user._id;

      const account = await SocialAccount.findOne({ 
        userId, 
        platform: platform.toLowerCase() 
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: `No se encontró cuenta conectada para ${platform}`
        });
      }

      res.status(200).json({
        success: true,
        data: {
          account: account.toJSON()
        }
      });

    } catch (error) {
      console.error('Error obteniendo cuenta por plataforma:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Iniciar proceso de conexión OAuth para una plataforma
  async initiateConnection(req, res) {
    try {
      const { platform } = req.params;
      const userId = req.user._id;

      // Verificar si la plataforma es soportada
      const supportedPlatforms = ['instagram', 'facebook', 'linkedin'];
      if (!supportedPlatforms.includes(platform.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Plataforma no soportada'
        });
      }

      // Generar URL de autorización OAuth
      const authUrl = await socialMediaService.generateAuthUrl(platform, userId);

      res.status(200).json({
        success: true,
        message: `URL de autorización generada para ${platform}`,
        data: {
          authUrl,
          platform
        }
      });

    } catch (error) {
      console.error('Error iniciando conexión:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Callback OAuth - completar conexión
// En tu archivo de controlador (ej. socialController.js)

async completeConnection(req, res) {
  try {
    const { platform } = req.params;
    const { code, state } = req.query;
     
    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: 'Código de autorización y estado son requeridos'
      });
    }
    
    // --- CAMBIO CLAVE AQUÍ ---
    // Decodificar el 'state' para obtener el userId que guardamos al inicio
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    const userId = decodedState.userId;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: 'El estado es inválido o no contiene un ID de usuario.'
        });
    }

    // El resto del flujo sigue igual que antes...
    const connectionData = await socialMediaService.exchangeCodeForTokens(platform, code);
    
    const profileData = connectionData.user;
    const tokenData = connectionData;

    let account = await SocialAccount.findOne({ userId, platform });

    if (account) {
      // Actualizar cuenta existente
      account.accessToken = encryptData(tokenData.accessToken);
      account.refreshToken = tokenData.refreshToken ? encryptData(tokenData.refreshToken) : null;
      account.tokenExpiresAt = tokenData.expiresAt;
      account.isConnected = true;
      account.connectedAt = new Date();
      account.lastSync = new Date();
      account.platformData = { ...account.platformData, ...profileData };
    } else {
      // Crear nueva cuenta
      account = new SocialAccount({
        userId,
        platform,
        username: profileData.name,
        platformUserId: profileData.id,
        accessToken: encryptData(tokenData.accessToken),
        refreshToken: tokenData.refreshToken ? encryptData(tokenData.refreshToken) : null,
        tokenExpiresAt: tokenData.expiresAt,
        isConnected: true,
        platformData: profileData
      });
    }

    await account.save();

    res.status(200).json({
      success: true,
      message: `Cuenta de ${platform} conectada exitosamente`,
      data: {
        account: account.toJSON()
      }
    });

  } catch (error) {
    console.error('Error completando conexión:', error);
    res.status(500).json({
      success: false,
      message: 'Error conectando cuenta',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}


  // Desconectar cuenta de red social
  async disconnectAccount(req, res) {
    try {
      const { platform } = req.params;
      const userId = req.user._id;

      const account = await SocialAccount.findOne({ userId, platform });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: `No se encontró cuenta conectada para ${platform}`
        });
      }

      // Revocar tokens en la plataforma (si es posible)
      try {
        await socialMediaService.revokeTokens(platform, decryptData(account.accessToken));
      } catch (revokeError) {
        console.warn('Error revocando tokens:', revokeError.message);
        // Continuar con la desconexión local aunque falle la revocación
      }

      // Marcar como desconectado
      await account.disconnect();

      res.status(200).json({
        success: true,
        message: `Cuenta de ${platform} desconectada exitosamente`
      });

    } catch (error) {
      console.error('Error desconectando cuenta:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Actualizar configuración de publicación para una cuenta
  async updatePublishingSettings(req, res) {
    try {
      const { platform } = req.params;
      const userId = req.user._id;
      const { publishingSettings } = req.body;

      // Verificar errores de validación
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const account = await SocialAccount.findOne({ userId, platform });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: `No se encontró cuenta conectada para ${platform}`
        });
      }

      // Actualizar configuración
      account.publishingSettings = {
        ...account.publishingSettings,
        ...publishingSettings
      };

      await account.save();

      res.status(200).json({
        success: true,
        message: 'Configuración de publicación actualizada',
        data: {
          account: account.toJSON()
        }
      });

    } catch (error) {
      console.error('Error actualizando configuración:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Sincronizar datos de la cuenta (métricas, información del perfil)
  async syncAccount(req, res) {
    try {
      const { platform } = req.params;
      const userId = req.user._id;

      const account = await SocialAccount.findOne({ userId, platform });

      if (!account || !account.isConnected) {
        return res.status(404).json({
          success: false,
          message: `No se encontró cuenta conectada para ${platform}`
        });
      }

      // Verificar si el token está próximo a expirar
      if (account.isTokenExpiringSoon()) {
        try {
          const newTokens = await socialMediaService.refreshTokens(platform, decryptData(account.refreshToken));
          account.accessToken = encryptData(newTokens.accessToken);
          if (newTokens.refreshToken) {
            account.refreshToken = encryptData(newTokens.refreshToken);
          }
          account.tokenExpiresAt = newTokens.expiresAt;
        } catch (refreshError) {
          console.error('Error refrescando tokens:', refreshError);
          return res.status(401).json({
            success: false,
            message: 'Token expirado, reconexión requerida'
          });
        }
      }

      // Obtener datos actualizados del perfil
      const profileData = await socialMediaService.getProfileInfo(platform, decryptData(account.accessToken));

      // Actualizar datos de la plataforma
      account.platformData = {
        ...account.platformData,
        ...profileData
      };
      account.lastSync = new Date();

      await account.save();

      res.status(200).json({
        success: true,
        message: `Cuenta de ${platform} sincronizada exitosamente`,
        data: {
          account: account.toJSON()
        }
      });

    } catch (error) {
      console.error('Error sincronizando cuenta:', error);
      res.status(500).json({
        success: false,
        message: 'Error sincronizando cuenta',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Verificar estado de conexión de todas las cuentas
  async checkConnectionStatus(req, res) {
    try {
      const userId = req.user._id;

      const accounts = await SocialAccount.find({ userId });
      const statusReport = {};

      for (const account of accounts) {
        statusReport[account.platform] = {
          isConnected: account.isConnected,
          username: account.username,
          lastSync: account.lastSync,
          tokenExpiringSoon: account.isTokenExpiringSoon(),
          needsReconnection: !account.isConnected || account.isTokenExpiringSoon(24)
        };
      }

      res.status(200).json({
        success: true,
        data: {
          connectionStatus: statusReport
        }
      });

    } catch (error) {
      console.error('Error verificando estado de conexión:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new SocialController();

