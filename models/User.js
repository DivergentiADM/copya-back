const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({

  agenteID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    default: null
  },
  // Identificadores de Firebase
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true, 
   
  },
   // Información de autenticación
  authProvider: {
    type: String,
    enum: ['local', 'firebase', 'google', 'apple'],
    default: 'local'
  },
  googleId: {
    type: String,
    sparse: true
  },
  appleId: {
    type: String,
    sparse: true
  },
   needsProfileCompletion: {
    type: Boolean,
    default: true 
  },
 
  profilePicture: {
    type: String,
    default: null
  },
  
  // Información básica del usuario Buyer persona
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,        // único + crea índice
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  // Contraseña (opcional para usuarios de Firebase)
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // No incluir en consultas por defecto
  },
 
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  // Información del negocio
  businessInfo: {
    name: {
      type: String,
      trim: true,
      maxlength: [200, 'Business name cannot be more than 200 characters']
    },
    industry: {
      type: String,
      trim: true,
      maxlength: [100, 'Industry cannot be more than 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot be more than 500 characters']
    },
    targetAudience: {
      type: String,
      trim: true,
      maxlength: [500, 'Target audience cannot be more than 500 characters']
    },
    website: {
      type: String,
      trim: true,
      maxlength: [200, 'Website URL cannot be more than 200 characters']
    },
    logo: {
      type: String,
      default: null
    },
    brandColors: {
      primary: { type: String, default: '#007bff' },
      secondary: { type: String, default: '#6c757d' },
      accent: { type: String, default: '#28a745' }
    },
    referencias: [
    {
      web: {
        type: String,
        trim: true,
        maxlength: [200, 'URL de referencia demasiado larga']
      },
      descripcion: {
        type: String,
        trim: true,
        maxlength: [500, 'Descripción de la referencia demasiado larga']
      }
    }
  ],
  competenciaDirecta: [
    {
      web: {
        type: String,
        trim: true,
        maxlength: [200, 'URL de competencia demasiado larga']
      },
      descripcion: {
        type: String,
        trim: true,
        maxlength: [500, 'Descripción de la competencia demasiado larga']
      }
    }
  ]
  },
 
  // Preferencias del usuario
  preferences: {
    
    publishingDays: [{
      type: String,
      enum: ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']
    }],
    publishingTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time format (HH:MM)']
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    contentTypes: [{
      type: String,
      enum: ['educativo', 'promocional', 'entretenimiento', 'inspiracional', 'noticias', 'detrás de cámaras']
    }],
  
    notifications: {
      email: { type: Boolean, default: true },
      push:  { type: Boolean, default: true },
      sms:   { type: Boolean, default: false }
    }
  },
  
  
  
  // Configuración de la cuenta
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    default: null
  },
  planExpiresAt: {
    type: Date,
    default: null
  },
  trialStartedAt: {
    type: Date,
    default: null
  },
  trialEndsAt: {
    type: Date,
    default: null
  },
  isTrialActive: {
    type: Boolean,
    default: false
  },
  
  // Sistema de créditos unificados
  credits: {
    total: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    resetDate: { type: Date, default: Date.now }
  },
  
  // Límites y cuotas
  limits: {
    monthlyPosts:       { type: Number, default: 10 },
    aiGenerations:      { type: Number, default: 50 },
    socialAccounts:     { type: Number, default: 3 },
    imageGenerations:   { type: Number, default: 10 },
    customerSupport:    { type: Number, default: 10 } // por día
  },
  usage: {
    currentMonthPosts:           { type: Number, default: 0 },
    currentMonthGenerations:     { type: Number, default: 0 },
    currentMonthImageGenerations:{ type: Number, default: 0 },
    lastResetDate:               { type: Date, default: Date.now },
    lastCustomerSupportReset:    { type: Date, default: Date.now }
  },
  
  // Metadatos de actividad
  lastLoginAt:   { type: Date, default: null },
  lastActiveAt:  { type: Date, default: Date.now },
  loginCount:    { type: Number, default: 0 },
  

}, {
  timestamps: true,
  toJSON:    { virtuals: true },
  toObject:  { virtuals: true }
});

// — Índices para optimizar consultas —
// (email y firebaseUid ya tienen índices únicos)
userSchema.index({ authProvider: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// — Virtuals —
userSchema.virtual('socialAccounts', {
  ref: 'SocialAccount',
  localField: '_id',
  foreignField: 'userId'
});
userSchema.virtual('contentIdeas', {
  ref: 'ContentIdea',
  localField: '_id',
  foreignField: 'userId'
});

userSchema.virtual('agents', {
  ref: 'Agent',
  localField: '_id',
  foreignField: 'user'
});


// Hash de contraseña para usuarios locales
userSchema.pre('save', async function(next) {
  if (this.authProvider === 'local' && this.isModified('password')) {
    if (!this.password) {
      return next(new Error('Password is required for local authentication'));
    }
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
      return next(err);
    }
  }
  if (this.isModified('lastLoginAt') && this.lastLoginAt) {
    this.loginCount += 1;
  }
  next();
});

// Comparar password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.authProvider !== 'local' || !this.password) {
    throw new Error('Password comparison not available for this authentication method');
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Verificar permisos de feature
userSchema.methods.canUseFeature = function(feature) {
  const perms = {
    ai_generation:      ['basic','premium','enterprise'],
    multiple_accounts:  ['premium','enterprise'],
    advanced_scheduling:['premium','enterprise'],
    analytics:          ['basic','premium','enterprise'],
    team_collaboration: ['enterprise']
  };
  return (perms[feature] || []).includes(this.subscriptionType);
};

// Chequear límite de uso por créditos
userSchema.methods.checkCreditBalance = function(creditsToUse = 1) {
  return this.credits.used + creditsToUse <= this.credits.total;
};

// Chequear límite de uso por tipo específico
userSchema.methods.checkUsageLimit = function(type) {
  const now = new Date();
  const last = new Date(this.usage.lastResetDate);
  
  // Resetear contadores mensuales
  if (now.getMonth() !== last.getMonth() || now.getFullYear() !== last.getFullYear()) {
    this.usage.currentMonthPosts = 0;
    this.usage.currentMonthGenerations = 0;
    this.usage.currentMonthImageGenerations = 0;
    this.usage.lastResetDate = now;
  }
  
  // Resetear contadores diarios de soporte
  const lastSupport = new Date(this.usage.lastCustomerSupportReset);
  if (now.getDate() !== lastSupport.getDate() || 
      now.getMonth() !== lastSupport.getMonth() || 
      now.getFullYear() !== lastSupport.getFullYear()) {
    this.usage.lastCustomerSupportReset = now;
  }
  
  // Verificar límites según tipo
  switch (type) {
    case 'posts':
      return this.usage.currentMonthPosts < this.limits.monthlyPosts;
    case 'generations':
      return this.usage.currentMonthGenerations < this.limits.aiGenerations;
    case 'imageGenerations':
      return this.usage.currentMonthImageGenerations < this.limits.imageGenerations;
    case 'customerSupport':
      return this.usage.currentMonthGenerations < this.limits.customerSupport;
    default:
      return true;
  }
};

// Incrementar uso
userSchema.methods.incrementUsage = function(type, amount = 1) {
  switch (type) {
    case 'posts':
      this.usage.currentMonthPosts += amount;
      break;
    case 'generations':
      this.usage.currentMonthGenerations += amount;
      this.credits.used += amount;
      break;
    case 'imageGenerations':
      this.usage.currentMonthImageGenerations += amount;
      this.credits.used += amount;
      break;
    case 'customerSupport':
      this.usage.currentMonthGenerations += amount;
      break;
    default:
      break;
  }
  return this.save();
};

// Usar créditos
userSchema.methods.useCredits = function(amount) {
  if (this.checkCreditBalance(amount)) {
    this.credits.used += amount;
    return this.save();
  }
  throw new Error('Insufficient credits');
};

// Reiniciar créditos (cuando se renueva el plan)
userSchema.methods.resetCredits = function(totalCredits) {
  this.credits.total = totalCredits;
  this.credits.used = 0;
  this.credits.resetDate = new Date();
  return this.save();
};

// Activar período de prueba
userSchema.methods.activateTrial = function(trialDays = 7, trialCredits = 100) {
  const now = new Date();
  this.trialStartedAt = now;
  this.trialEndsAt = new Date(now.getTime() + (trialDays * 24 * 60 * 60 * 1000));
  this.isTrialActive = true;
  
  // Asignar créditos de prueba
  this.credits.total = trialCredits;
  this.credits.used = 0;
  this.credits.resetDate = now;
  
  return this.save();
};

// Verificar si el período de prueba está activo
userSchema.methods.isTrialPeriod = function() {
  if (!this.isTrialActive || !this.trialEndsAt) return false;
  const now = new Date();
  return now < this.trialEndsAt;
};

// Verificar si el período de prueba ha expirado
userSchema.methods.isTrialExpired = function() {
  if (!this.isTrialActive || !this.trialEndsAt) return false;
  const now = new Date();
  return now >= this.trialEndsAt;
};

// Información de suscripción
userSchema.methods.getSubscriptionInfo = function() {
  return {
    type: this.subscriptionType,
    isPremium: this.isPremium,
    expiresAt: this.subscriptionExpiresAt,
    isExpired: this.subscriptionExpiresAt ? new Date() > this.subscriptionExpiresAt : false,
    isTrialActive: this.isTrialPeriod(),
    trialEndsAt: this.trialEndsAt,
    credits: this.credits,
    limits: this.limits,
    usage: this.usage
  };
};

// Quitar campos sensibles al JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.apiKeys;
  delete obj.twoFactorSecret;
  return obj;
};

// Perfil público
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    name: this.name,
    profilePicture: this.profilePicture,
    businessInfo: {
      name: this.businessInfo?.name,
      industry: this.businessInfo?.industry,
      bio: this.businessInfo?.bio
    },
    createdAt: this.createdAt
  };
};

// Státicos
userSchema.statics.findByFirebaseUid = function(uid) {
  return this.findOne({ firebaseUid: uid, isActive: true });
};
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};


const User = mongoose.model('User', userSchema);

module.exports = User;