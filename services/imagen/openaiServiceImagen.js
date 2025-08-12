// services/openaiServiceImagen.js
const { OpenAI } = require('openai');
const logger = require('../../utils/logger');

// Prompt base para la generación de imagen
const SYSTEM_IMAGE_PROMPT = `Eres un experto artista visual especializado en crear imágenes impresionantes y de alta calidad.

Cuando se te da un tema y una proporción de aspecto, crea una imagen visualmente atractiva que:
1. Esté optimizada para la proporción especificada
2. Tenga composición profesional y de alta calidad
3. Use iluminación y balance de color apropiados
4. Sea visualmente impactante y atractiva
5. Evite texto a menos que se solicite específicamente

Guías de estilo:
- Usa colores vibrantes y naturales
- Asegura buen contraste y claridad
- Aplica principios de fotografía profesional
- Haz que el sujeto sea el punto focal claro
- Usa profundidad de campo apropiada`;

// Validar que la API Key exista
const apiKey = process.env.SYSTEM_OPENAI_API_KEY;
if (!apiKey) {
  throw new Error(
    "Falta la API key de OpenAI. Verifica la variable de entorno SYSTEM_OPENAI_API_KEY."
  );
}

// Cliente OpenAI compartido
const openai = new OpenAI({ apiKey });

/**
 * Genera un prompt visual enriquecido a partir de un topic genérico
 * usando GPT-4.
 *
 * @param {string} topic
 * @returns {Promise<string>}
 */
async function getVisualPromptFromOpenAI(topic) {
  if (!topic || typeof topic !== 'string') {
    throw new Error("El parámetro 'topic' es requerido y debe ser una cadena.");
  }

  const systemMsg =
    "Eres un experto diseñador de prompts visuales para generar imágenes con inteligencia artificial. " +
    "Transfórmalo en una descripción visual clara, rica en detalles y libre de texto.";
  const userMsg = `Transforma este tema en un prompt visual para generar una imagen IA:\n\n"${topic}"`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemMsg },
      { role: 'user', content: userMsg },
    ],
    temperature: 0.7,
    max_tokens: 300,
  });

  const generated = response.choices?.[0]?.message?.content?.trim();
  if (!generated) {
    throw new Error("OpenAI no devolvió un prompt visual.");
  }
  return generated;
}

/**
 * Construye el prompt final para DALL·E,
 * inyectando SYSTEM_IMAGE_PROMPT + el prompt visual.
 *
 * @param {string} visualPrompt
 * @returns {string}
 */
function buildOpenAIPrompt(visualPrompt) {
  // Sanitizar saltos de línea
  const singleLine = visualPrompt.replace(/[\r\n]+/g, ' ').trim();
  return `${SYSTEM_IMAGE_PROMPT}\n\nTema solicitado: "${singleLine}"`;
}

/**
 * Genera una imagen cuadrada (1024x1024) y opcionalmente la recorta.
 *
 * @param {Object} options
 * @param {string} options.topic  - Tema genérico a enriquecer y generar.
 * @param {Object} [options.crop] - { width: number, height: number } opcional.
 * @returns {Promise<Object>}     - { buffer, model, resolution, n, generationTime }
 */
async function generateOpenAi({ topic, crop }) {
  // 1) Enriquecer el topic a un prompt visual
  const visualPrompt = await getVisualPromptFromOpenAI(topic);
  const prompt = buildOpenAIPrompt(visualPrompt);

  // 2) Parámetros de generación
  const resolution = '1024x1024';
  const n = 1;

  try {
    const startTime = Date.now();
    logger.info(`[OpenAI Image] Generando imagen para tema "${topic}"`);

    const response = await openai.images.generate({
      prompt,
      size: resolution,
      n,
      response_format: 'b64_json',
      model: 'dall-e-3', // Asegúrate de tener acceso a este modelo
    });

    const b64 = response?.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error('OpenAI no devolvió datos de imagen.');
    }

    let buffer = Buffer.from(b64, 'base64');

   

    const generationTime = Date.now() - startTime;

    return {
      buffer,
      model: response.model || 'desconocido',
      resolution: crop
        ? `${crop.width}x${crop.height}`
        : resolution,
      n,
      generationTime,
    };
  } catch (err) {
    logger.error('[OpenAI Image] Error generando imagen', {
      error: err.message,
      topic,
      crop,
      stack: err.stack,
    });
    throw new Error('Error al generar la imagen con OpenAI.');
  }
}

module.exports = {
  generateOpenAi
};
