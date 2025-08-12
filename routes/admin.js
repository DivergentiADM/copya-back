const express = require('express');
const router = express.Router();
const { createAdmin, getAdmins, updateAdmin, deleteAdmin } = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   POST api/admins
// @desc    Crear un nuevo administrador
// @access  Private (requiere ser administrador)
router.post('/', [protect, admin], createAdmin);

// @route   GET api/admins
// @desc    Obtener todos los administradores
// @access  Private (requiere ser administrador)
router.get('/', [protect, admin], getAdmins);

// @route   PUT api/admins/:id
// @desc    Actualizar un administrador
// @access  Private (requiere ser administrador)
router.put('/:id', [protect, admin], updateAdmin);

// @route   DELETE api/admins/:id
// @desc    Eliminar un administrador
// @access  Private (requiere ser administrador)
router.delete('/:id', [protect, admin], deleteAdmin);

module.exports = router;