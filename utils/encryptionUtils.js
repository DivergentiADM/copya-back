// utils/encryptionUtils.js

const crypto = require('crypto');

// Configuración de encriptación AES-256-GCM
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;       // 256 bits
const IV_LENGTH = 12;        // 96 bits recomendado para GCM
const TAG_LENGTH = 16;       // 128 bits

/**
 * Obtiene y valida la clave de encriptación desde la variable de entorno
 * @returns {Buffer} Clave de encriptación (32 bytes)
 */
function getEncryptionKey() {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey) {
    throw new Error('ENCRYPTION_KEY no está configurada en las variables de entorno');
  }
  if (hexKey.length !== KEY_LENGTH * 2) {
    throw new Error(`ENCRYPTION_KEY debe tener ${KEY_LENGTH * 2} caracteres hexadecimales`);
  }
  return Buffer.from(hexKey, 'hex');
}

/**
 * Encriptar texto plano utilizando AES-256-GCM
 * @param {string} plainText Texto a encriptar
 * @returns {string|null} Datos encriptados en Base64 (iv‖tag‖ciphertext)
 */
function encryptData(plainText) {
  if (plainText == null) return null;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const ciphertext = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  // Concatenar: iv‖tag‖ciphertext y codificar en Base64
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

/**
 * Desencriptar datos en Base64 (iv‖tag‖ciphertext) a texto plano
 * @param {string} encrypted Datos encriptados en Base64
 * @returns {string|null} Texto desencriptado
 */
function decryptData(encrypted) {
  if (encrypted == null) return null;

  const input = Buffer.from(encrypted, 'base64');
  const iv = input.slice(0, IV_LENGTH);
  const tag = input.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = input.slice(IV_LENGTH + TAG_LENGTH);

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  const plainText = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);

  return plainText.toString('utf8');
}

/**
 * Generar una nueva clave de encriptación hex de 64 caracteres
 * @returns {string} Clave en hexadecimal
 */
function generateEncryptionKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Hash SHA-256 de datos
 * @param {string} data Datos a hashear
 * @returns {string} Hash en hexadecimal
 */
function hashData(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generar hash con salt usando SHA-256
 * @param {string} data Datos a hashear
 * @param {string|null} salt (opcional) Salt en hexadecimal
 * @returns {{hash: string, salt: string}} Objeto con hash y salt
 */
function hashWithSalt(data, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.createHash('sha256').update(data + salt).digest('hex');
  return { hash, salt };
}

/**
 * Verificar hash con salt
 * @param {string} data Datos originales
 * @param {string} hash Hash a verificar
 * @param {string} salt Salt usado
 * @returns {boolean} True si el hash coincide
 */
function verifyHashWithSalt(data, hash, salt) {
  const { hash: computed } = hashWithSalt(data, salt);
  return computed === hash;
}

/**
 * Generar token aleatorio en hexadecimal
 * @param {number} length Longitud en bytes
 * @returns {string} Token hexadecimal
 */
function generateRandomToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generar UUID v4
 * @returns {string} UUID
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Encriptar un objeto JSON (serializando internamente)
 * @param {object} obj Objeto a encriptar
 * @returns {string|null} Objeto encriptado en Base64
 */
function encryptObject(obj) {
  return encryptData(JSON.stringify(obj));
}

/**
 * Desencriptar un objeto JSON previamente encriptado
 * @param {string} encryptedObj Objeto encriptado en Base64
 * @returns {object} Objeto desencriptado
 */
function decryptObject(encryptedObj) {
  return JSON.parse(decryptData(encryptedObj));
}

/**
 * Crear firma HMAC-SHA256
 * @param {string} data Datos a firmar
 * @param {string} secret Secreto (por defecto JWT_SECRET en env)
 * @returns {string} Firma HMAC en hexadecimal
 */
function createHMACSignature(data, secret = process.env.JWT_SECRET) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verificar firma HMAC-SHA256
 * @param {string} data Datos originales
 * @param {string} signature Firma a verificar
 * @param {string} secret Secreto usado
 * @returns {boolean} True si la firma es válida
 */
function verifyHMACSignature(data, signature, secret = process.env.JWT_SECRET) {
  const computed = crypto.createHmac('sha256', secret).update(data).digest();
  const provided = Buffer.from(signature, 'hex');
  return crypto.timingSafeEqual(provided, computed);
}

module.exports = {
  encryptData,
  decryptData,
  generateEncryptionKey,
  hashData,
  hashWithSalt,
  verifyHashWithSalt,
  generateRandomToken,
  generateUUID,
  encryptObject,
  decryptObject,
  createHMACSignature,
  verifyHMACSignature
};
