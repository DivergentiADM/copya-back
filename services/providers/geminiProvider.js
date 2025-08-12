// providers/geminiProvider.js
require('dotenv').config();
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const logger = require('../../utils/logger');

// ANOTACIÓN: Es buena práctica inicializar el cliente de la API una sola vez.
const genAI = new GoogleGenerativeAI(process.env.SYSTEM_GEMINI_API_KEY);
if (!process.env.SYSTEM_GEMINI_API_KEY) {
  throw new Error('API key is required for gemini provider');
}

const providerName = 'gemini';

/**
 * Construye el prompt de sistema con todo el contexto disponible.
 */
function buildSystemPrompt(agent, topic, platform, format, duration, lighting, style, targetAudience, businessContext) {
  // ANOTACIÓN: Se corrigió el JSON de ejemplo en el prompt.
  // El bloque de la función `parseDurationToSeconds` era inválido y confundiría al modelo.
  return `Eres ${agent.personality}, un director de contenido viral.
  
🎯 PERSONALIDAD Y ESTILO:
${agent.communicationStyle?.narrativeStructure || 'gancho-desarrollo-clímax-resolución'}
Tono: ${agent.communicationStyle?.tone || 'energético y auténtico'}
Vocabulario: ${agent.communicationStyle?.vocabulary || 'accesible pero profesional'}

📺 DETALLES DEL PROYECTO:
- Tema central: "${topic}"
- Plataforma: ${platform} (${format})
- Duración: ${duration} segundos
- Estilo visual: ${style}
- Iluminación: ${lighting}
- Audiencia objetivo: ${targetAudience}
${Object.keys(businessContext || {}).length ? `\n🏢 CONTEXTO DE NEGOCIO:\n${JSON.stringify(businessContext, null, 2)}` : ''}

INSTRUCCIONES PARA EL STORYTELLING:
1. Crea una narrativa visual atractiva que se adapte perfectamente al formato ${format} de ${platform}.
2. Divide el video en escenas específicas con duración exacta para cada una.
3. Describe cada toma con detalles técnicos (cámara, iluminación, composición).
4. Incluye indicaciones para el talento (expresiones, movimientos, voz).
5. Especifica elementos visuales (colores, props, fondo, gráficos).
6. Define la música y efectos de sonido para cada escena.
7. Incluye transiciones suaves entre escenas.
8. Optimiza para engagement en ${platform}.

FORMATO DE SALIDA ESTRICTO:
Responde únicamente con un objeto JSON válido que siga esta estructura. No incluyas texto antes o después del JSON.
{
  "title": "Título del video",
  "platform": "plataforma del storytelling",
  "format": "formato del storytelling",
  "hook": "Hook inicial de 3 segundos",
  "style": "Style del storytelling",
  "scenes": [
    {
      "scene": 1,
      "duration": "10 segundos",
      "description": "Descripción visual detallada",
      "camera": "Tipo de toma y movimiento",
      "lighting": "Configuración de iluminación",
      "talent": "Instrucciones para el talento",
      "props": "Elementos necesarios",
      "audio": "Música/efectos de sonido",
      "text": "Texto en pantalla si aplica"
    }
  ],
  "duration": "duracion total del video en segundos",
  "recommendations": "recomendaciones para tener exito con tu video",
  "cta": "Call to action final",
  "tags": "tags para el storytelling",
  "hashtags": ["#hashtag1", "#hashtag2"]
}
`;
}

/**
 * Construye el prompt de usuario. Permite un prompt personalizado para mayor flexibilidad.
 */
function buildUserPrompt({ topic, customPrompt }) {
  // ANOTACIÓN: Ahora puedes pasar instrucciones adicionales del usuario si es necesario.
  if (customPrompt) {
    return customPrompt;
  }
  return `Crea el contenido para el tema: "${topic}". Sigue estrictamente las instrucciones del sistema y responde solo con el objeto JSON requerido.`;
}

/**
 * Genera un storytelling para un video utilizando Gemini.
 * @param {object} props - Propiedades para la generación del contenido.
 * @returns {object} - El objeto JSON con el storytelling.
 */
async function generateStory(props) {
  logger.info('🚀 GeminiProvider.generating:', {
    topic: props.topic,
    platform: props.platform,
    duration: props.duration
  });

  try {
    // ANOTACIÓN: La forma correcta de usar el SDK es obtener el modelo primero.
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // Se recomienda usar 1.5 Pro por su capacidad de seguir instrucciones complejas.
      systemInstruction: buildSystemPrompt(props),
    });

    const userPrompt = buildUserPrompt(props);
    
    // ANOTACIÓN: Se define la configuración de generación y seguridad.
    const generationConfig = {
      temperature: 0.7,
      maxOutputTokens: 4096, // Aumentado para respuestas complejas
      responseMimeType: "application/json", // ¡Clave! Le pedimos a la API que la salida sea JSON directamente.
    };
    
    // ANOTACIÓN: Se simplificó la llamada a la API. `async/await` directo es más limpio.
    const result = await model.generateContent(userPrompt, generationConfig);
    const response = result.response;
    const rawText = response.text();
    logger.info(`<<<<< RAW AI RESPONSE (${providerName}) >>>>>: ${rawText}`);

    // ANOTACIÓN: El SDK parsea el JSON automáticamente si usas responseMimeType: "application/json".
    // El texto de la respuesta ya es el objeto que necesitas.
    const story = response.text();
    const match = rawText.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("No valid JSON object found in the AI response.");
    }
    
    const jsonString = match[0];
    let parsedStory = JSON.parse(jsonString); // Parseamos el string limpio

    logger.info('✅ GeminiProvider.parsed successfully');

    logger.info(`<<<<< PARSEDSTORY AI RESPONSE (${providerName}) >>>>>: ${parsedStory}`); 
   
    logger.info('✅ GeminiProvider.finished:', { title: parsedStory.title });
    return parsedStory;

  } catch (error) {
    // ANOTACIÓN: Un manejo de errores robusto es crucial.
    logger.error('❌ Error in GeminiProvider.generateStory:', {
      message: error.message,
      stack: error.stack,
      details: error.response?.candidates || 'No additional details'
    });
    // Relanzar el error o devolver un objeto de error estandarizado
    throw new Error(`Failed to generate story from Gemini: ${error.message}`);
  }
}

module.exports = {
  generateStory
};