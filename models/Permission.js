const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  }
}, { timestamps: true });

const Permission = mongoose.model('Permission', permissionSchema);

module.exports = Permission;
