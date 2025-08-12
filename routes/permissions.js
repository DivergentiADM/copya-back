const express = require('express');
const router = express.Router();
const { createPermission, getPermissions, updatePermission, deletePermission } = require('../controllers/permissionController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   POST api/permissions
// @desc    Crear un nuevo permiso
// @access  Private (requiere ser administrador)
router.post('/',  createPermission);

// @route   GET api/permissions
// @desc    Obtener todos los permisos
// @access  Private (requiere ser administrador)
router.get('/',  getPermissions);

// @route   PUT api/permissions/:id
// @desc    Actualizar un permiso
// @access  Private (requiere ser administrador)
router.put('/:id',  updatePermission);

// @route   DELETE api/permissions/:id
// @desc    Eliminar un permiso
// @access  Private (requiere ser administrador)
router.delete('/:id', deletePermission);

module.exports = router;