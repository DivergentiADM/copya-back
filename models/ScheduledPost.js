const mongoose = require('mongoose');

const scheduledPostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContentIdea',
    required: [true, 'Content ID is required']
  },
  platforms: [{
    platform: {
      type: String,
      enum: ['instagram', 'facebook', 'linkedin'],
      required: true
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SocialAccount',
      required: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'publishing', 'published', 'failed', 'cancelled'],
      default: 'scheduled'
    },
    publishedAt: Date,
    platformPostId: String, // ID del post en la plataforma
    error: {
      message: String,
      code: String,
      timestamp: Date
    },
    metrics: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 }
    }
  }],
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required'],
    index: true
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  // Estado general del post programado
  status: {
    type: String,
    enum: ['scheduled', 'publishing', 'published', 'partially_published', 'failed', 'cancelled'],
    default: 'scheduled'
  },
  // Configuración de reintento
  retryConfig: {
    maxRetries: {
      type: Number,
      default: 3
    },
    currentRetries: {
      type: Number,
      default: 0
    },
    nextRetryAt: Date,
    retryInterval: {
      type: Number,
      default: 300000 // 5 minutos en milisegundos
    }
  },
  // Metadatos de programación
  schedulingData: {
    scheduledBy: {
      type: String,
      enum: ['user', 'auto', 'bulk'],
      default: 'user'
    },
    originalScheduledDate: Date, // fecha original en caso de reprogramación
    rescheduledCount: {
      type: Number,
      default: 0
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal'
    }
  },
  // Logs de ejecución
  executionLogs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    action: {
      type: String,
      enum: ['scheduled', 'publishing', 'published', 'failed', 'retrying', 'cancelled']
    },
    platform: String,
    message: String,
    error: mongoose.Schema.Types.Mixed
  }],
  publishedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

// Índices para optimizar consultas
scheduledPostSchema.index({ userId: 1, scheduledDate: 1 });
scheduledPostSchema.index({ scheduledDate: 1, status: 1 });
scheduledPostSchema.index({ 'platforms.status': 1 });

// Método para verificar si el post está listo para publicar
scheduledPostSchema.methods.isReadyToPublish = function() {
  const now = new Date();
  return this.scheduledDate <= now && this.status === 'scheduled';
};

// Método para marcar como publicado en una plataforma específica
scheduledPostSchema.methods.markPlatformAsPublished = function(platform, platformPostId, metrics = {}) {
  const platformIndex = this.platforms.findIndex(p => p.platform === platform);
  
  if (platformIndex !== -1) {
    this.platforms[platformIndex].status = 'published';
    this.platforms[platformIndex].publishedAt = new Date();
    this.platforms[platformIndex].platformPostId = platformPostId;
    this.platforms[platformIndex].metrics = { ...this.platforms[platformIndex].metrics, ...metrics };
    
    // Agregar log
    this.executionLogs.push({
      action: 'published',
      platform: platform,
      message: `Successfully published to ${platform}`,
      timestamp: new Date()
    });
    
    // Actualizar estado general
    this.updateOverallStatus();
  }
  
  return this.save();
};

// Método para marcar como fallido en una plataforma específica
scheduledPostSchema.methods.markPlatformAsFailed = function(platform, error) {
  const platformIndex = this.platforms.findIndex(p => p.platform === platform);
  
  if (platformIndex !== -1) {
    this.platforms[platformIndex].status = 'failed';
    this.platforms[platformIndex].error = {
      message: error.message || 'Unknown error',
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date()
    };
    
    // Agregar log
    this.executionLogs.push({
      action: 'failed',
      platform: platform,
      message: `Failed to publish to ${platform}: ${error.message}`,
      error: error,
      timestamp: new Date()
    });
    
    // Actualizar estado general
    this.updateOverallStatus();
  }
  
  return this.save();
};

// Método para actualizar el estado general basado en los estados de las plataformas
scheduledPostSchema.methods.updateOverallStatus = function() {
  const platformStatuses = this.platforms.map(p => p.status);
  const uniqueStatuses = [...new Set(platformStatuses)];
  
  if (uniqueStatuses.length === 1) {
    // Todos tienen el mismo estado
    this.status = uniqueStatuses[0];
  } else if (platformStatuses.includes('published') && platformStatuses.includes('failed')) {
    // Algunos publicados, algunos fallidos
    this.status = 'partially_published';
  } else if (platformStatuses.includes('publishing')) {
    // Al menos uno está publicando
    this.status = 'publishing';
  }
  
  // Marcar como completado si todos terminaron (publicado o fallido)
  const completedStatuses = ['published', 'failed', 'cancelled'];
  if (platformStatuses.every(status => completedStatuses.includes(status))) {
    this.completedAt = new Date();
  }
};

// Método para programar reintento
scheduledPostSchema.methods.scheduleRetry = function() {
  if (this.retryConfig.currentRetries < this.retryConfig.maxRetries) {
    this.retryConfig.currentRetries += 1;
    this.retryConfig.nextRetryAt = new Date(Date.now() + this.retryConfig.retryInterval);
    this.status = 'scheduled';
    
    this.executionLogs.push({
      action: 'retrying',
      message: `Scheduled retry ${this.retryConfig.currentRetries}/${this.retryConfig.maxRetries}`,
      timestamp: new Date()
    });
    
    return this.save();
  }
  return Promise.resolve(this);
};

// Método para cancelar publicación
scheduledPostSchema.methods.cancel = function(reason = 'Cancelled by user') {
  this.status = 'cancelled';
  this.platforms.forEach(platform => {
    if (platform.status === 'scheduled') {
      platform.status = 'cancelled';
    }
  });
  
  this.executionLogs.push({
    action: 'cancelled',
    message: reason,
    timestamp: new Date()
  });
  
  return this.save();
};

module.exports = mongoose.model('ScheduledPost', scheduledPostSchema);

