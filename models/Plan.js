// models/Plan.js
const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  // Nombre del plan: "Básico", "Professional", "Enterprise"
  name: {
    type: String,
    required: true,
    unique: true
  },

  // Precios
  price: {
    USD: {
      type: Number,
      required: true
    },
    COP: {
      type: Number
    }
  },

  // Buyer personas
  buyerPersonas: {
    type: String,
    required: true
  },

  // Agentes IA
  agentesIA: {
    type: String,
    required: true
  },

  // Créditos/mes (unificados para todo tipo de generación)
  creditsPerMonth: {
    type: Number,
    required: true
  },

  // Generación de contenido
  generacion: {
    type: String,
    required: true
  },

  // Modelos IA disponibles
  modelosIA: {
    type: String,
    required: true
  },

  // Guiones Storytelling
  guionesStorytelling: {
    included: { type: Number, required: true },
    additional: { type: Number, required: true }
  },

  // Analytics
  analytics: {
    type: String,
    required: true
  },

  // Colaboración
  colaboracion: {
    type: String,
    required: true
  },

  // Publicación
  publicacion: {
    type: String,
    required: true
  },

  // Customer Support IA: consultas diarias
  customerSupportPerDay: {
    type: Number,
    required: true
  },

  // Soporte
  soporte: {
    type: String,
    required: true
  },

  // Período de prueba
  trialPeriodDays: {
    type: Number,
    default: 7
  },

  // Meta: activo/inactivo y fecha de creación
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Plan = mongoose.model('Plan', PlanSchema);

module.exports = Plan;