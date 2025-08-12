const admin = require('firebase-admin');
const path = require('path');

class FirebaseConfig {
  constructor() {
    this.app = null;
    this.auth = null;
    this.initialized = false;
  }

  /**
   * Inicializar Firebase Admin SDK
   */
  initialize() {
    try {
      if (this.initialized) {
        console.log('Firebase ya está inicializado');
        return this.app;
      }

      // Configuración usando variables de entorno
      const firebaseConfig = this.getFirebaseConfig();

      // Inicializar Firebase Admin
      this.app = admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
        projectId: firebaseConfig.project_id,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${firebaseConfig.project_id}.appspot.com`
      });

      this.auth = admin.auth();
      this.initialized = true;

      console.log('✅ Firebase Admin SDK inicializado correctamente');
      console.log('📦 Storage bucket:', this.app.options.storageBucket);
      return this.app;

    } catch (error) {
      console.error('❌ Error inicializando Firebase:', error);
      throw new Error('Error en la configuración de Firebase');
    }
  }

  /**
   * Obtener configuración de Firebase desde variables de entorno
   * @returns {object} Configuración de Firebase
   */
  getFirebaseConfig() {
    // Opción 1: Usar archivo de credenciales JSON
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      return require(serviceAccountPath);
    }

    // Opción 2: Usar variables de entorno individuales
    if (process.env.FIREBASE_PRIVATE_KEY) {
      return {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI,
        token_uri: process.env.FIREBASE_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL ,
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
      };
    }

   

    throw new Error('Configuración de Firebase no encontrada. Configura FIREBASE_SERVICE_ACCOUNT_PATH o las variables individuales.');
  }

  /**
   * Obtener instancia de Firebase Auth
   * @returns {admin.auth.Auth} Instancia de Firebase Auth
   */
  getAuth() {
    if (!this.initialized) {
      this.initialize();
    }
    return this.auth;
  }

  /**
   * Obtener instancia de Firebase App
   * @returns {admin.app.App} Instancia de Firebase App
   */
  getApp() {
    if (!this.initialized) {
      this.initialize();
    }
    return this.app;
  }

  /**
   * Verificar token de ID de Firebase
   * @param {string} idToken - Token de ID de Firebase
   * @returns {Promise<admin.auth.DecodedIdToken>} Token decodificado
   */
  async verifyIdToken(idToken) {
    try {
      if (!this.initialized) {
        this.initialize();
      }

      // En desarrollo, permitir tokens mock
      if (process.env.NODE_ENV === 'development' && idToken === 'mock-firebase-token') {
        return {
          uid: 'mock-user-id',
          email: 'mock@example.com',
          name: 'Mock User',
          picture: 'https://example.com/mock-avatar.jpg',
          firebase: {
            sign_in_provider: 'google.com'
          }
        };
      }

      const decodedToken = await this.auth.verifyIdToken(idToken);
      return decodedToken;

    } catch (error) {
      console.error('Error verificando token de Firebase:', error);
      throw new Error('Token de Firebase inválido');
    }
  }

  /**
   * Obtener usuario de Firebase por UID
   * @param {string} uid - UID del usuario
   * @returns {Promise<admin.auth.UserRecord>} Registro del usuario
   */
  async getUserByUid(uid) {
    try {
      if (!this.initialized) {
        this.initialize();
      }

      // En desarrollo, retornar usuario mock
      if (process.env.NODE_ENV === 'development' && uid === 'mock-user-id') {
        return {
          uid: 'mock-user-id',
          email: 'mock@example.com',
          displayName: 'Mock User',
          photoURL: 'https://example.com/mock-avatar.jpg',
          providerData: [{
            providerId: 'google.com',
            uid: 'mock-google-id',
            email: 'mock@example.com'
          }]
        };
      }

      const userRecord = await this.auth.getUser(uid);
      return userRecord;

    } catch (error) {
      console.error('Error obteniendo usuario de Firebase:', error);
      throw new Error('Usuario no encontrado en Firebase');
    }
  }

  /**
   * Crear usuario personalizado en Firebase
   * @param {object} userData - Datos del usuario
   * @returns {Promise<admin.auth.UserRecord>} Usuario creado
   */
  async createUser(userData) {
    try {
      if (!this.initialized) {
        this.initialize();
      }

      const userRecord = await this.auth.createUser({
        email: userData.email,
        displayName: userData.name,
        photoURL: userData.photoURL,
        disabled: false
      });

      return userRecord;

    } catch (error) {
      console.error('Error creando usuario en Firebase:', error);
      throw new Error('Error creando usuario en Firebase');
    }
  }

  /**
   * Actualizar usuario en Firebase
   * @param {string} uid - UID del usuario
   * @param {object} updateData - Datos a actualizar
   * @returns {Promise<admin.auth.UserRecord>} Usuario actualizado
   */
  async updateUser(uid, updateData) {
    try {
      if (!this.initialized) {
        this.initialize();
      }

      const userRecord = await this.auth.updateUser(uid, updateData);
      return userRecord;

    } catch (error) {
      console.error('Error actualizando usuario en Firebase:', error);
      throw new Error('Error actualizando usuario en Firebase');
    }
  }

  /**
   * Eliminar usuario de Firebase
   * @param {string} uid - UID del usuario
   * @returns {Promise<void>}
   */
  async deleteUser(uid) {
    try {
      if (!this.initialized) {
        this.initialize();
      }

      await this.auth.deleteUser(uid);

    } catch (error) {
      console.error('Error eliminando usuario de Firebase:', error);
      throw new Error('Error eliminando usuario de Firebase');
    }
  }

  /**
   * Generar token personalizado
   * @param {string} uid - UID del usuario
   * @param {object} additionalClaims - Claims adicionales
   * @returns {Promise<string>} Token personalizado
   */
  async createCustomToken(uid, additionalClaims = {}) {
    try {
      if (!this.initialized) {
        this.initialize();
      }

      const customToken = await this.auth.createCustomToken(uid, additionalClaims);
      return customToken;

    } catch (error) {
      console.error('Error creando token personalizado:', error);
      throw new Error('Error creando token personalizado');
    }
  }

  /**
   * Verificar si Firebase está configurado correctamente
   * @returns {boolean} Estado de la configuración
   */
  isConfigured() {
    return !!(
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      process.env.FIREBASE_PRIVATE_KEY ||
      process.env.NODE_ENV === 'development'
    );
  }

  /**
   * Obtener información del proyecto
   * @returns {object} Información del proyecto
   */
  getProjectInfo() {
    if (!this.initialized) {
      this.initialize();
    }

    return {
      projectId: this.app.options.projectId,
      initialized: this.initialized,
      environment: process.env.NODE_ENV
    };
  }
}

// Crear instancia singleton
const firebaseConfig = new FirebaseConfig();

module.exports = firebaseConfig;

