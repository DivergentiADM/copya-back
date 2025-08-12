const jwt = require('jsonwebtoken');

/**
 * Generar token JWT
 * @param {string} userId - ID del usuario
 * @param {object} additionalPayload - Datos adicionales para incluir en el token
 * @returns {string} Token JWT
 */
const generateToken = (userId, additionalPayload = {}) => {
  const payload = {
    userId,
    ...additionalPayload,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

/**
 * Verificar y decodificar token JWT
 * @param {string} token - Token JWT
 * @returns {object} Payload decodificado
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Token inválido');
  }
};

/**
 * Decodificar token sin verificar (útil para debugging)
 * @param {string} token - Token JWT
 * @returns {object} Payload decodificado
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Verificar si un token está próximo a expirar
 * @param {string} token - Token JWT
 * @param {number} thresholdMinutes - Minutos antes de la expiración para considerar "próximo"
 * @returns {boolean} True si está próximo a expirar
 */
const isTokenExpiringSoon = (token, thresholdMinutes = 60) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiration = decoded.exp - now;
    const thresholdSeconds = thresholdMinutes * 60;

    return timeUntilExpiration <= thresholdSeconds;
  } catch (error) {
    return true; // Si hay error, considerar que está expirando
  }
};

/**
 * Generar token de refresh
 * @param {string} userId - ID del usuario
 * @returns {string} Refresh token
 */
const generateRefreshToken = (userId) => {
  const payload = {
    userId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

/**
 * Verificar refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {object} Payload decodificado
 */
const verifyRefreshToken = (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Token type inválido');
    }

    return decoded;
  } catch (error) {
    throw new Error('Refresh token inválido');
  }
};

/**
 * Extraer token del header Authorization
 * @param {string} authHeader - Header de autorización
 * @returns {string|null} Token extraído o null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1];
};

/**
 * Generar token temporal para operaciones específicas
 * @param {string} userId - ID del usuario
 * @param {string} operation - Tipo de operación
 * @param {string} expiresIn - Tiempo de expiración
 * @returns {string} Token temporal
 */
const generateTemporaryToken = (userId, operation, expiresIn = '1h') => {
  const payload = {
    userId,
    operation,
    type: 'temporary',
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Verificar token temporal
 * @param {string} token - Token temporal
 * @param {string} expectedOperation - Operación esperada
 * @returns {object} Payload decodificado
 */
const verifyTemporaryToken = (token, expectedOperation) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'temporary' || decoded.operation !== expectedOperation) {
      throw new Error('Token temporal inválido');
    }

    return decoded;
  } catch (error) {
    throw new Error('Token temporal inválido');
  }
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  isTokenExpiringSoon,
  generateRefreshToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  generateTemporaryToken,
  verifyTemporaryToken
};

