const mongoose = require('mongoose');



const storytellingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
 
  title: {
    type: String,
    required: true,
    trim: true
  },
  platform:{
    type: String,
    required: true,
    trim: true
  },
  format:{
    type: String,
    required: true,
    trim: true
  },
  
   hook: {
    type: String,
    required: true,
    trim: true
  },
  escenes: [{
    type: String,
    trim: true
  }],
  platform: {
    type: String,
    required: true
  },
  cta: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true,
    min: 5,
    max: 3600
  },
  hashtags: [{
    type: String,
    trim: true
  }],
  style: {
    type: String,
    required: true
  },
  provider: {
    type: String,
    enum: ['gemini', 'openai'],
    default: 'gemini'
  },
 

  tags: [{
    type: String,
    trim: true
  }],
  ratings: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
 metadata: [JSON.stringify({
  generatedBy: 'openai',
  generatedAt: new Date(),
  requestId: 'story_1754533278926'
})],
 
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
storytellingSchema.index({ userId: 1, status: 1 });
storytellingSchema.index({ platform: 1, format: 1 });
storytellingSchema.index({ createdAt: -1 });

// Método para obtener el resumen del storytelling
storytellingSchema.methods.getSummary = function() {
  return {
    id: this._id,
    title: this.title,
    platform: this.platform,
    format: this.format,
    duration: this.duration,
    status: this.status,
    createdAt: this.createdAt,
    storyboardCount: this.story.storyboard.length,
    estimatedProductionTime: this.production.estimatedProductionTime,
    difficulty: this.metadata.difficulty
  };
};

// Método estático para obtener por usuario
storytellingSchema.statics.findByUser = function(userId, status = null) {
  const query = { userId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

// Método para agregar o actualizar calificación
storytellingSchema.methods.addRating = function(userId, rating, comment = '') {
  const existingRatingIndex = this.ratings.findIndex(r => r.userId.toString() === userId.toString());
  
  if (existingRatingIndex > -1) {
    // Actualizar calificación existente
    this.ratings[existingRatingIndex].rating = rating;
    this.ratings[existingRatingIndex].comment = comment;
  } else {
    // Agregar nueva calificación
    this.ratings.push({ userId, rating, comment });
  }
  
  // Recalcular promedio
  this.totalRatings = this.ratings.length;
  this.averageRating = this.ratings.reduce((sum, r) => sum + r.rating, 0) / this.totalRatings;
  
  return this.save();
};

// Método para obtener calificación de un usuario específico
storytellingSchema.methods.getUserRating = function(userId) {
  return this.ratings.find(r => r.userId.toString() === userId.toString());
};
const Storytelling = mongoose.model('Storytelling', storytellingSchema);

module.exports = Storytelling