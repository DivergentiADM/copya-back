const firebaseConfig = require('../firebase/firebase');
const User = require('../models/User');

/**
 * Middleware de autenticación con Firebase
 * Verifica el token de Firebase y carga el usuario correspondiente
 */
const firebaseAuth = async (req, res, next) => {
  try {
    // Extraer token del header Authorization
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de autorización requerido'
      });
    }

    const idToken = authHeader.replace('Bearer ', '');
    console.log('Received ID Token:', idToken);

    // Verificar token con Firebase
    const decodedToken = await firebaseConfig.verifyIdToken(idToken);
    console.log('Decoded Token:', decodedToken);
    
    if (!decodedToken || !decodedToken.uid) {
      return res.status(401).json({
        success: false,
        message: 'Token de Firebase inválido'
      });
    }

    // Buscar o crear usuario en la base de datos local
    let user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      // If user not found by firebaseUid, try finding by email
      user = await User.findOne({ email: decodedToken.email });
      if (user) {
        // If user found by email but not firebaseUid, update existing user
        user.firebaseUid = decodedToken.uid;
        user.authProvider = decodedToken.firebase?.sign_in_provider === 'google.com' ? 'google' : decodedToken.firebase?.sign_in_provider || user.authProvider;
        user.profilePicture = decodedToken.picture || user.profilePicture;
        user.emailVerified = decodedToken.email_verified || user.emailVerified;
        await user.save();
        console.log(`✅ Usuario existente actualizado con Firebase UID: ${user.email}`);
      } else {
        // If no user found by firebaseUid or email, create a new one
        user = await createUserFromFirebaseToken(decodedToken, req.body);
      }
    } else {
      // If user found by firebaseUid, update information if necessary
      user = await updateUserFromFirebaseToken(user, decodedToken);
    }

    // Agregar información del usuario y Firebase al request
    req.user = user;
    req.firebaseUser = decodedToken;
    
    next();

  } catch (error) {
    console.error('Error en autenticación Firebase:', error);
    
    // Manejar diferentes tipos de errores
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        message: 'Token revocado',
        code: 'TOKEN_REVOKED'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Error de autenticación',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Crear usuario en la base de datos local desde token de Firebase
 * @param {object} decodedToken - Token decodificado de Firebase
 * @returns {Promise<User>} Usuario creado
 */
const createUserFromFirebaseToken = async (decodedToken, additionalData = {}) => {
  try {
    const userData = {
      firebaseUid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email?.split('@')[0] || 'Usuario',
      profilePicture: decodedToken.picture,
      authProvider: decodedToken.firebase?.sign_in_provider || 'firebase',
      emailVerified: decodedToken.email_verified || false,
      isActive: true,
      lastLoginAt: new Date(),
      ...additionalData // Merge additional data here
    };

    // Si viene de Google, extraer información adicional
    if (decodedToken.firebase?.sign_in_provider === 'google.com') {
      userData.authProvider = 'google';
      userData.googleId = decodedToken.uid;
    }

    // Si viene de Apple, extraer información adicional
    if (decodedToken.firebase?.sign_in_provider === 'apple.com') {
      userData.authProvider = 'apple';
      userData.appleId = decodedToken.uid;
    }

    const user = new User(userData);
    await user.save();

    console.log(`✅ Usuario creado automáticamente desde Firebase: ${user.email}`);
    return user;

  } catch (error) {
    console.error('Error creando usuario desde Firebase:', error);
    throw new Error('Error creando usuario');
  }
};

/**
 * Actualizar usuario existente con información de Firebase
 * @param {User} user - Usuario existente
 * @param {object} decodedToken - Token decodificado de Firebase
 * @returns {Promise<User>} Usuario actualizado
 */
const updateUserFromFirebaseToken = async (user, decodedToken) => {
  try {
    let needsUpdate = false;

    // Actualizar último acceso
    user.lastLoginAt = new Date();
    needsUpdate = true;

    // Actualizar email si cambió
    if (decodedToken.email && user.email !== decodedToken.email) {
      user.email = decodedToken.email;
      needsUpdate = true;
    }

    // Actualizar nombre si cambió
    if (decodedToken.name && user.name !== decodedToken.name) {
      user.name = decodedToken.name;
      needsUpdate = true;
    }

    // Actualizar foto de perfil si cambió
    if (decodedToken.picture && user.profilePicture !== decodedToken.picture) {
      user.profilePicture = decodedToken.picture;
      needsUpdate = true;
    }

    // Actualizar estado de verificación de email
    if (decodedToken.email_verified !== undefined && user.emailVerified !== decodedToken.email_verified) {
      user.emailVerified = decodedToken.email_verified;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await user.save();
    }

    return user;

  } catch (error) {
    console.error('Error actualizando usuario desde Firebase:', error);
    // Retornar usuario sin actualizar en caso de error
    return user;
  }
};

/**
 * Middleware opcional de autenticación Firebase
 * No falla si no hay token, pero carga el usuario si está presente
 */
const optionalFirebaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No hay token, continuar sin usuario
      req.user = null;
      req.firebaseUser = null;
      return next();
    }

    // Usar el middleware principal
    return firebaseAuth(req, res, next);

  } catch (error) {
    // En caso de error, continuar sin usuario
    req.user = null;
    req.firebaseUser = null;
    next();
  }
};

/**
 * Middleware para verificar roles específicos
 * @param {Array<string>} allowedRoles - Roles permitidos
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autenticación requerida'
      });
    }

    const userRole = req.user.role || 'user';
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Permisos insuficientes'
      });
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario esté activo
 */
const requireActiveUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Autenticación requerida'
    });
  }

  if (!req.user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Cuenta desactivada'
    });
  }

  next();
};

/**
 * Middleware para verificar que el email esté verificado
 */
const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Autenticación requerida'
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email no verificado',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }

  next();
};

module.exports = {
  firebaseAuth,
  optionalFirebaseAuth,
  requireRole,
  requireActiveUser,
  requireVerifiedEmail,
  createUserFromFirebaseToken,
  updateUserFromFirebaseToken
};

