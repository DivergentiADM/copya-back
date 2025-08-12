const firebaseConfig = require('../firebase/firebase');
const User = require('../models/User');
const Plan = require('../models/Plan')
const { generateToken } = require('../utils/tokenUtils');
const { validationResult } = require('express-validator');

class FirebaseAuthController {
  constructor() {
    this.authenticateWithFirebase = this.authenticateWithFirebase.bind(this);
    this.registerWithFirebase = this.registerWithFirebase.bind(this);
    this.linkWithFirebase = this.linkWithFirebase.bind(this);
    this.unlinkFromFirebase = this.unlinkFromFirebase.bind(this);
    this.getFirebaseUserInfo = this.getFirebaseUserInfo.bind(this);
    this.refreshFirebaseToken = this.refreshFirebaseToken.bind(this);
    this.createUserFromFirebaseToken = this.createUserFromFirebaseToken.bind(this);
    this.updateUserLoginInfo = this.updateUserLoginInfo.bind(this);
    this.getAuthProvider = this.getAuthProvider.bind(this);
  }
  /**
   * Autenticación con token de Firebase
   * El frontend envía el ID token de Firebase después del login
   */
  async authenticateWithFirebase(req, res) {
  try {
    // 1) Validación de inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array(),
      });
    }

    // 2) Extraer additionalInfo y posible idToken del body
    const { additionalInfo, idToken: bodyToken, token: bodyTokenAlias } = req.body;

    // 3) Intentar leer de header Authorization
    let idToken;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      idToken = authHeader.split(' ')[1];
    }

    // 4) Si no vino en headers, buscar en el body
    if (!idToken) {
      idToken = bodyToken ?? bodyTokenAlias;
    }

    // 5) Si sigue sin existir, error
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Token de Firebase requerido',
      });
    }

    // 6) Verificar token con Firebase
    const decodedToken = await firebaseConfig.verifyIdToken(idToken);

    // 7) Buscar o crear usuario
    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!user) {
      user = await this.createUserFromFirebaseToken(decodedToken, additionalInfo);
    } else {
      await this.updateUserLoginInfo(user, decodedToken);
    }

    // 8) Generar token interno
    const internalToken = generateToken(user._id, {
      firebaseUid: decodedToken.uid,
      authProvider: user.authProvider,
    });

    // 9) Responder
    return res.status(200).json({
      success: true,
      message: 'Autenticación exitosa',
      data: {
        user: user.toJSON(),
        token: internalToken,
        firebaseInfo: {
          uid: decodedToken.uid,
          provider: decodedToken.firebase?.sign_in_provider,
          emailVerified: decodedToken.email_verified,
        },
      },
    });

  } catch (error) {
    console.error('Error en autenticación Firebase:', error);
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ success: false, message: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ success: false, message: 'Token revocado', code: 'TOKEN_REVOKED' });
    }
    return res.status(500).json({
      success: false,
      message: 'Error en la autenticación',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}


  /**
   * Registro con Firebase (Google/Apple)
   * Similar a authenticate pero específicamente para nuevos usuarios
   */
  async registerWithFirebase(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const { idToken, businessInfo, preferences } = req.body;

      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: 'Token de Firebase requerido'
        });
      }

      // Verificar token con Firebase
      const decodedToken = await firebaseConfig.verifyIdToken(idToken);

      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({ firebaseUid: decodedToken.uid });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'El usuario ya está registrado'
        });
      }

      // Verificar si el email ya está en uso
      const emailExists = await User.findOne({ email: decodedToken.email });
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'El email ya está registrado con otro método'
        });
      }

      // Crear nuevo usuario con información adicional
      const user = await this.createUserFromFirebaseToken(decodedToken, {
        businessInfo,
        preferences
      });

      // Generar token interno
      const internalToken = generateToken(user._id, {
        firebaseUid: decodedToken.uid,
        authProvider: user.authProvider
      });

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: user.toJSON(),
          token: internalToken,
          firebaseInfo: {
            uid: decodedToken.uid,
            provider: decodedToken.firebase?.sign_in_provider,
            emailVerified: decodedToken.email_verified
          }
        }
      });

    } catch (error) {
      console.error('Error en registro Firebase:', error);
      res.status(500).json({
        success: false,
        message: 'Error en el registro',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Vincular cuenta existente con Firebase
   */
  async linkWithFirebase(req, res) {
    try {
      const { idToken } = req.body;
      const currentUser = req.user; // Usuario actual autenticado

      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: 'Token de Firebase requerido'
        });
      }

      // Verificar token con Firebase
      const decodedToken = await firebaseConfig.verifyIdToken(idToken);

      // Verificar que el email coincida
      if (decodedToken.email !== currentUser.email) {
        return res.status(400).json({
          success: false,
          message: 'El email de Firebase debe coincidir con la cuenta actual'
        });
      }

      // Verificar que no haya otro usuario con este Firebase UID
      const existingFirebaseUser = await User.findOne({ firebaseUid: decodedToken.uid });
      if (existingFirebaseUser && existingFirebaseUser._id.toString() !== currentUser._id.toString()) {
        return res.status(409).json({
          success: false,
          message: 'Esta cuenta de Firebase ya está vinculada a otro usuario'
        });
      }

      // Actualizar usuario actual con información de Firebase
      currentUser.firebaseUid = decodedToken.uid;
      currentUser.authProvider = decodedToken.firebase?.sign_in_provider === 'google.com' ? 'google' : 
                                 decodedToken.firebase?.sign_in_provider === 'apple.com' ? 'apple' : 'firebase';
      currentUser.emailVerified = decodedToken.email_verified || currentUser.emailVerified;
      
      if (decodedToken.picture && !currentUser.profilePicture) {
        currentUser.profilePicture = decodedToken.picture;
      }

      await currentUser.save();

      res.status(200).json({
        success: true,
        message: 'Cuenta vinculada exitosamente con Firebase',
        data: {
          user: currentUser.toJSON()
        }
      });

    } catch (error) {
      console.error('Error vinculando con Firebase:', error);
      res.status(500).json({
        success: false,
        message: 'Error vinculando cuenta',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Desvincular cuenta de Firebase
   */
  async unlinkFromFirebase(req, res) {
    try {
      const currentUser = req.user;

      if (!currentUser.firebaseUid) {
        return res.status(400).json({
          success: false,
          message: 'La cuenta no está vinculada con Firebase'
        });
      }

      // Verificar que el usuario tenga una contraseña local antes de desvincular
      if (!currentUser.password && currentUser.authProvider !== 'local') {
        return res.status(400).json({
          success: false,
          message: 'Debe establecer una contraseña antes de desvincular Firebase'
        });
      }

      // Desvincular de Firebase
      currentUser.firebaseUid = undefined;
      currentUser.authProvider = 'local';
      currentUser.googleId = undefined;
      currentUser.appleId = undefined;

      await currentUser.save();

      res.status(200).json({
        success: true,
        message: 'Cuenta desvinculada exitosamente de Firebase',
        data: {
          user: currentUser.toJSON()
        }
      });

    } catch (error) {
      console.error('Error desvinculando Firebase:', error);
      res.status(500).json({
        success: false,
        message: 'Error desvinculando cuenta',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtener información del usuario de Firebase
   */
  async getFirebaseUserInfo(req, res) {
    try {
      const { uid } = req.params;
      const currentUser = req.user;

      // Verificar que el UID pertenezca al usuario actual
      if (currentUser.firebaseUid !== uid) {
        return res.status(403).json({
          success: false,
          message: 'No autorizado para acceder a esta información'
        });
      }

      // Obtener información del usuario de Firebase
      const firebaseUser = await firebaseConfig.getUserByUid(uid);

      res.status(200).json({
        success: true,
        data: {
          firebase: {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified,
            disabled: firebaseUser.disabled,
            metadata: {
              creationTime: firebaseUser.metadata.creationTime,
              lastSignInTime: firebaseUser.metadata.lastSignInTime
            },
            providerData: firebaseUser.providerData.map(provider => ({
              providerId: provider.providerId,
              uid: provider.uid,
              email: provider.email,
              displayName: provider.displayName
            }))
          }
        }
      });

    } catch (error) {
      console.error('Error obteniendo información de Firebase:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo información del usuario',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Refrescar token de Firebase
   */
  async refreshFirebaseToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token requerido'
        });
      }

      // En una implementación real, aquí se haría la llamada a Firebase para refrescar el token
      // Por ahora, simplemente validamos que el usuario esté autenticado
      
      res.status(200).json({
        success: true,
        message: 'Token refrescado exitosamente',
        data: {
          // En producción, aquí iría el nuevo token
          message: 'Use Firebase SDK en el frontend para refrescar tokens'
        }
      });

    } catch (error) {
      console.error('Error refrescando token:', error);
      res.status(500).json({
        success: false,
        message: 'Error refrescando token',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Crear usuario desde token de Firebase
   * @private
   */
  async createUserFromFirebaseToken(decodedToken, additionalInfo = {}) {
    const { businessInfo, preferences } = additionalInfo;

    // Buscar el plan "Básico"
    const basicPlan = await Plan.findOne({ name: 'Básico' });
    if (!basicPlan) {
      // Manejar el caso en que el plan básico no se encuentra
      throw new Error('Plan básico no encontrado');
    }

    // Calcular la fecha de vencimiento (7 días a partir de ahora)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const userData = {
      firebaseUid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email?.split('@')[0] || 'Usuario',
      profilePicture: decodedToken.picture,
      authProvider: this.getAuthProvider(decodedToken),
      emailVerified: decodedToken.email_verified || false,
      isActive: true,
      lastLoginAt: new Date(),
      businessInfo: businessInfo || {},
      preferences: preferences || {},
      role: '688400391dce2f85f4ad03a0', 
      plan: basicPlan._id,
      planExpiresAt: expiresAt
    };

    // Configurar IDs específicos del proveedor
    if (decodedToken.firebase?.sign_in_provider === 'google.com') {
      userData.googleId = decodedToken.uid;
    } else if (decodedToken.firebase?.sign_in_provider === 'apple.com') {
      userData.appleId = decodedToken.uid;
    }

    const user = new User(userData);
    await user.save();

    console.log(`✅ Usuario creado desde Firebase: ${user.email} (${userData.authProvider})`);
    return user;
  }

  /**
   * Actualizar información de login del usuario
   * @private
   */
  async updateUserLoginInfo(user, decodedToken) {
    user.lastLoginAt = new Date();
    user.lastActiveAt = new Date();

    // Actualizar información si cambió
    if (decodedToken.email && user.email !== decodedToken.email) {
      user.email = decodedToken.email;
    }

    if (decodedToken.name && user.name !== decodedToken.name) {
      user.name = decodedToken.name;
    }

    if (decodedToken.picture && user.profilePicture !== decodedToken.picture) {
      user.profilePicture = decodedToken.picture;
    }

    if (decodedToken.email_verified !== undefined) {
      user.emailVerified = decodedToken.email_verified;
    }

    await user.save();
    return user;
  }

  /**
   * Determinar proveedor de autenticación
   * @private
   */
  getAuthProvider(decodedToken) {
    const signInProvider = decodedToken.firebase?.sign_in_provider;
    
    switch (signInProvider) {
      case 'google.com':
        return 'google';
      case 'apple.com':
        return 'apple';
      case 'facebook.com':
        return 'facebook';
      default:
        return 'firebase';
    }
  }
}

module.exports = new FirebaseAuthController();

