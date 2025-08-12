const Permission = require('../models/Permission');

// Crear un nuevo permiso
exports.createPermission = async (req, res) => {
  const { name, description } = req.body;

  try {
    let permission = await Permission.findOne({ name });
    if (permission) {
      return res.status(400).json({ msg: 'El permiso ya existe' });
    }

    permission = new Permission({
      name,
      description,
    });

    await permission.save();
    res.json(permission);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
};

// Obtener todos los permisos
exports.getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find();
    res.json(permissions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
};

// Actualizar un permiso
exports.updatePermission = async (req, res) => {
  const { name, description } = req.body;

  const permissionFields = { name, description };

  try {
    let permission = await Permission.findById(req.params.id);

    if (!permission) {
      return res.status(404).json({ msg: 'Permiso no encontrado' });
    }

    permission = await Permission.findByIdAndUpdate(
      req.params.id,
      { $set: permissionFields },
      { new: true }
    );

    res.json(permission);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
};

// Eliminar un permiso
exports.deletePermission = async (req, res) => {
  try {
    let permission = await Permission.findById(req.params.id);

    if (!permission) {
      return res.status(404).json({ msg: 'Permiso no encontrado' });
    }

    await Permission.findByIdAndRemove(req.params.id);

    res.json({ msg: 'Permiso eliminado' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
};