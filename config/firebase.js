// config/firebase.js
const admin = require('firebase-admin');

//const serviceAccount = require('../copya-by-poweredia-firebase-adminsdk-fbsvc-3f54dac6a4.json');

admin.initializeApp({
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
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
        universe_domain: "googleapis.com"
      };
    }

   

    throw new Error('Configuración de Firebase no encontrada. Configura FIREBASE_SERVICE_ACCOUNT_PATH o las variables individuales.');
  },
  credential: admin.credential.cert(getFirebaseConfig),
  storageBucket: 'tu-proyecto.appspot.com', // cambia por el tuyo
});

module.exports = admin;
