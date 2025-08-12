const Role = require('../models/Role');

exports.createRole = async (roleData) => {
  const role = new Role(roleData);
  return await role.save();
};

exports.getRoles = async () => {
  return await Role.find();
};
