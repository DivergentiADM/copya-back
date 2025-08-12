const mongoose = require('mongoose');

const contentIdeaSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
    maxlength: [5000, 'Content cannot be more than 5000 characters']
  },
  hashtags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Hashtag cannot be more than 50 characters']
  }],
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['educativo', 'promocional', 'entretenimiento', 'inspiracional', 'noticias', 'detrás de cámaras', 'generado por usuarios'],
    lowercase: true
  },
  platforms: [{
    type: String,
    enum: ['instagram', 'facebook', 'linkedin'],
    lowercase: true
  }],
  imageUrl:{
    type: String,
  },
  // Metadatos de generación
  generationData: {
    aiModel: {
      type: String,
      enum: ['openai', 'gemini', 'claude', 'manual'],
      default: 'manual'
    },
    prompt: String, // prompt usado para generar el contenido
    temperature: Number, // configuración de creatividad usada
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  // Estado del contenido
  status: {
    type: String,
    enum: ['draft', 'approved', 'scheduled', 'published', 'archived'],
    default: 'draft'
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  // Métricas y feedback
  metrics: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 }
  },
  // Programación
  scheduledFor: Date,
  publishedAt: Date,
  // Archivos multimedia asociados

}, {
  timestamps: true
});

// Índices para mejorar rendimiento
contentIdeaSchema.index({ userId: 1, createdAt: -1 });
contentIdeaSchema.index({ userId: 1, category: 1 });
contentIdeaSchema.index({ userId: 1, status: 1 });
contentIdeaSchema.index({ scheduledFor: 1 });

// Método para marcar como usado
contentIdeaSchema.methods.markAsUsed = function() {
  this.isUsed = true;
  this.status = 'published';
  this.publishedAt = new Date();
  return this.save();
};

// Método para obtener contenido optimizado para una plataforma específica
contentIdeaSchema.methods.getContentForPlatform = function(platform) {
  const platformSpecific = this.platformContent[platform];
  
  if (platformSpecific && (platformSpecific.caption || platformSpecific.text)) {
    return {
      text: platformSpecific.caption || platformSpecific.text,
      hashtags: platformSpecific.hashtags || this.hashtags,
      mentions: platformSpecific.mentions || []
    };
  }
  
  // Fallback al contenido general
  return {
    text: this.content,
    hashtags: this.hashtags,
    mentions: []
  };
};

// Método para calcular score de engagement
contentIdeaSchema.methods.getEngagementScore = function() {
  const { likes, comments, shares, reach } = this.metrics;
  if (reach === 0) return 0;
  
  // Fórmula simple de engagement: (likes + comments*2 + shares*3) / reach * 100
  return ((likes + comments * 2 + shares * 3) / reach * 100).toFixed(2);
};
const ContentIdea = mongoose.model('ContentIdea', contentIdeaSchema);

module.exports = ContentIdea

