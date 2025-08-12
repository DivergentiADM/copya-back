const roleService = require('../services/roleService');

exports.createRole = async (req, res) => {
  try {
    const role = await roleService.createRole(req.body);
    res.status(201).json(role);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getRoles = async (req, res) => {
  try {
    const roles = await roleService.getRoles();
    res.status(200).json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
