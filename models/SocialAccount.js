const mongoose = require('mongoose');

const socialAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  platform: {
    type: String,
    required: [true, 'Platform is required'],
    enum: ['instagram', 'facebook', 'linkedin'],
    lowercase: true
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true
  },
  platformUserId: {
    type: String,
    required: [true, 'Platform user ID is required']
  },
  accessToken: {
    type: String,
    required: [true, 'Access token is required']
  },
  refreshToken: {
    type: String,
    default: null
  },
  tokenExpiresAt: {
    type: Date,
    default: null
  },
  isConnected: {
    type: Boolean,
    default: true
  },
  connectedAt: {
    type: Date,
    default: Date.now
  },
  lastSync: {
    type: Date,
    default: Date.now
  },
  // Información adicional específica de la plataforma
  platformData: {
    profilePicture: String,
    followerCount: Number,
    accountType: String, // 'personal', 'business', 'creator'
    permissions: [String] // permisos otorgados por el usuario
  },
  // Configuración de publicación para esta cuenta
  publishingSettings: {
    enabled: {
      type: Boolean,
      default: true
    },
    preferredTimes: [String], // horarios preferidos para esta plataforma
    hashtagStrategy: {
      type: String,
      enum: ['minimal', 'moderate', 'extensive'],
      default: 'moderate'
    }
  }
}, {
  timestamps: true
});

// Índice compuesto para evitar duplicados de plataforma por usuario
socialAccountSchema.index({ userId: 1, platform: 1 }, { unique: true });

// Método para verificar si el token está próximo a expirar
socialAccountSchema.methods.isTokenExpiringSoon = function(hoursThreshold = 24) {
  if (!this.tokenExpiresAt) return false;
  
  const now = new Date();
  const expirationTime = new Date(this.tokenExpiresAt);
  const timeDifference = expirationTime - now;
  const hoursUntilExpiration = timeDifference / (1000 * 60 * 60);
  
  return hoursUntilExpiration <= hoursThreshold;
};

// Método para marcar como desconectado
socialAccountSchema.methods.disconnect = function() {
  this.isConnected = false;
  this.accessToken = null;
  this.refreshToken = null;
  this.tokenExpiresAt = null;
  return this.save();
};

// No exponer tokens en respuestas JSON
socialAccountSchema.methods.toJSON = function() {
  const accountObject = this.toObject();
  delete accountObject.accessToken;
  delete accountObject.refreshToken;
  return accountObject;
};

module.exports = mongoose.model('SocialAccount', socialAccountSchema);

