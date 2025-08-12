const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const { protect } = require('../middleware/auth');

// Obtener todas las cuentas conectadas del usuario
router.get('/accounts', protect, socialController.getAccounts);

// Obtener cuenta específica por plataforma
router.get('/account/:platform', protect, socialController.getAccountByPlatform);

// Iniciar proceso de conexión (esto es opcional si haces auth directa en frontend)
router.get('/connect/:platform/initiate', protect, socialController.initiateConnection);

// Completar proceso de conexión OAuth
router.get('/connect/:platform/callback', socialController.completeConnection);

// Conectar cuenta con credenciales (usado si haces POST desde frontend)
router.post('/connect/:platform', protect, socialController.completeConnection);

// Desconectar cuenta
router.delete('/disconnect/:platform', protect, socialController.disconnectAccount);

// Actualizar configuración de publicación
router.put('/settings/:platform', protect, socialController.updatePublishingSettings);

// Sincronizar cuenta
router.post('/sync/:platform', protect, socialController.syncAccount);

// Verificar estado de conexión
router.get('/status', socialController.checkConnectionStatus);

module.exports = router;
