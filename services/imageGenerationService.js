// services/imageService.js
const {generateOpenAi} = require('./imagen/openaiServiceImagen');
const {generateGemini} = require('./imagen/geminiServiceImagen');
const { uploadToFirebase } = require('../firebase/storage/firebaseStorageService');
const Imagen = require('../models/Image');
const ContentIdea = require('../models/ContentIdea');

/**
 * Sube el buffer a Firebase Storage y guarda el documento en MongoDB.
 * @returns {Promise<{ imageId: string, imageUrl: string }>}
 */
async function saveImagen(buffer, { userId, prompt, provider, model, resolution, temperature, tags, params }) {
  // 1. subir a Firebase Storage en carpeta organizada por usuario
  const fileName = `${Date.now()}.png`;
  const imageUrl = await uploadToFirebase(buffer, fileName, userId);

  // 2. guardar metadatos en Mongo
  const doc = new Imagen({
    userId,
    prompt,
    imageUrl,
    generatedBy: provider,
    metadata: { model, resolution, temperature, params },
    tags
  });
  const saved = await doc.save();

  
  return { imageId: saved._id.toString(), imageUrl };
}


/**
 * Genera la imagen vía el provider y luego la guarda.
 * @param {Object} options
 * @param {"openai"|"gemini"} options.provider
 * @param {string} options.userId
 * @param {string} options.topic - El tema principal de la imagen
 * @param {string} [options.aspectRatio="1:1"] - "9:16", "16:9", "1:1", "3:4"
 * @param {string[]} [options.tags]
 */
async function generateImage({ provider, userId, topic, aspectRatio}) {
  // 1. Invocar al servicio correspondiente
  let genResult;

  
  if (provider === 'openai') {
    genResult = await generateOpenAi({  topic, aspectRatio: '1024x1024' });
  } else if (provider === 'gemini') {
    console.log('Calling Gemini with aspectRatio:',topic , aspectRatio);
    genResult = await generateGemini({ topic, aspectRatio });
  } else {
    const err = new Error('Provider inválido. Debe ser "openai" o "gemini".');
    err.statusCode = 400;
    throw err;
  }
  
  // 2. Guardar imagen + metadatos
  const image=  await saveImagen(genResult.buffer, {
    userId,
    prompt: topic, // Guardar solo el tema original
    provider,
    model: genResult.model,
    resolution: aspectRatio,
    params: { aspectRatio } 
  });
return image
}

module.exports = { generateImage, saveImagen };
