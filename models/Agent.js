const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  // Core Info & Identification
  // MongoDB's _id is used as the unique identifier (UUID)
  name: {
    type: String,
    required: true,
  },
  version: {
    type: String,
    default: '1.0.0',
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'in-development'],
    default: 'active',
  },
  agentType: {
    type: String,
    enum: ['Real Estate', 'Personal Branding', 'E-commerce', 'Advertising', 'Generic'],
    required: true,
  },

  // Professional Profile
  professionalProfile: {
    experience: { 
      type: String, 
      
    },
    industries: [{ type: String}],
    achievements: [{ type: String }],
    company: { type: String },
    role: { type: String},
    followers: { type: String },
    location: { type: String },
    background: { type: String }
  },

  // Communication Style
  communicationStyle: {
    personality: { 
      type: String, 
      required: true,
      
    },
    tone: { type: String, default: 'inspiracional, auténtico, profesional pero cercano' },
    linguisticPatterns: [{ type: String, default: ['Story → Lesson → Action', 'experiencia personal + aprendizaje + llamada a la acción'] }],
    narrativeStructure: { 
      type: String, 
      
    },
    contentStructure: { type: String },
    signaturePhrases: [{ type: String  }],
    ctas: [{ type: String}]
  },

  // Technical Expertise
  technicalExpertise: {
    methodologies: [{ type: String}],
    tools: [{ type: String }],
    frameworks: [{ type: String}],
  },

  // Content Patterns & Distribution
  contentPatterns: {
    distribution: [{
      category: { type: String, default: 'Productividad y Eficiencia' },
      percentage: { type: Number, default: 30 }
    }, {
      category: { type: String, default: 'Marca Personal' },
      percentage: { type: Number, default: 25 }
    }, {
      category: { type: String, default: 'Emprendimiento' },
      percentage: { type: Number, default: 20 }
    }, {
      category: { type: String, default: 'Tecnología y Datos' },
      percentage: { type: Number, default: 15 }
    }, {
      category: { type: String, default: 'Lifestyle y Autenticidad' },
      percentage: { type: Number, default: 10 }
    }],
    formats: [{ type: String, default: ['Posts', 'Videos', 'Stories', 'Reels'] }],
    temperature: { type: Number, default: 0.7 },
    style: { type: String, default: 'Profesional pero auténtico' }
  },

  // Legacy field, to be integrated into the new structure
  promptInfo: {
    type: String,
    required: true,
   
  },
  
  // Visual Identity
  avatar: {
    type: String,
   
  },
}, { timestamps: true });

const Agent = mongoose.model('Agent', agentSchema);

module.exports = Agent;
