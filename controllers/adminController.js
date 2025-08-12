const Admin = require('../models/Admin');
const Role = require('../models/Role');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Crear un nuevo administrador
const createAdmin = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let admin = await Admin.findOne({ email });
    if (admin) {
      return res.status(400).json({ msg: 'El administrador ya existe' });
    }

    const adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      return res.status(400).json({ msg: 'El rol de administrador no existe. Por favor, créelo primero.' });
    }

    admin = new Admin({
      name,
      email,
      password,
      role: adminRole._id, // Asignar el ID del rol
    });

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(password, salt);

    await admin.save();

    const payload = {
      admin: {
        id: admin.id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      {
        expiresIn: 3600,
      },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
};

// Obtener todos los administradores
const getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.json(admins);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
};

// Actualizar un administrador
const updateAdmin = async (req, res) => {
  const { name, email } = req.body;

  const adminFields = { name, email };

  try {
    let admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({ msg: 'Administrador no encontrado' });
    }

    admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { $set: adminFields },
      { new: true }
    ).select('-password');

    res.json(admin);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
};

// Eliminar un administrador
const deleteAdmin = async (req, res) => {
  try {
    let admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({ msg: 'Administrador no encontrado' });
    }

    await Admin.findByIdAndRemove(req.params.id);

    res.json({ msg: 'Administrador eliminado' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
};

module.exports ={
  createAdmin,
  getAdmins,
  deleteAdmin,
  updateAdmin
}