// models/GeneratedImage.js

const mongoose = require('mongoose');

const MetadataSchema = new mongoose.Schema({
  model: { type: String, required: true },             // ej: "dall-e-3"
  resolution: { type: String, required: false },       // ej: "1024x1024"
  temperature: { type: Number, required: false },      // ej: 0.7
  params: { type: mongoose.Schema.Types.Mixed },       // otros parámetros (top_p, stop, etc.)
}, { _id: false });

const GeneratedImageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prompt: { type: String, required: true },
  imageUrl: { type: String, required: true },
  generatedBy: { type: String, enum: ['openai', 'gemini'], required: true },
  metadata: { type: MetadataSchema, required: true },
  status: { type: String, enum: ['active', 'deleted'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
});

const Imagen = mongoose.model('Imagen', GeneratedImageSchema);


module.exports = Imagen