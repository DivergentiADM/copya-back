const { GoogleGenAI } = require('@google/genai');
const logger = require('../../utils/logger');

// Configuración inicial del cliente Gemini
const apiKey = process.env.SYSTEM_GEMINI_API_KEY;
if (!apiKey) throw new Error('API key is required for gemini provider');

const ai = new GoogleGenAI({ apiKey });
const providerName = 'gemini';
const model = 'gemini-2.5-pro';
const temperature = 0.7;

// Validación de configuración
const validateConfig = () => {
  if (!process.env.SYSTEM_GEMINI_API_KEY) {
    throw new Error(`API key is required for ${providerName} provider`);
  }
  return true;
};

// Función principal para generar ideas de contenido
const generateContentIdeasGemini = async (params) => {
  logger.info('generateContentIdeas called in GeminiProvider', { params });

  try {
    validateConfig();

    const { user, agentStyle, count, customPrompt, contentTypes } = params;

    const basePrompt = buildDefaultPrompt(user, count, agentStyle, contentTypes, customPrompt);

    const systemInstruction = `
Eres un experto en marketing de contenidos. RESPONDE SÓLO con un JSON válido. 
El objeto JSON DEBE tener una clave "ideas" que sea un array de ${count} objetos, 
cada uno con "title" (string), "content" (string), "category" (string) y "hashtags" (array de strings).
Nada más.
`.trim();

    const prompt = `${systemInstruction}\n\n${basePrompt}`;
    logger.info('Prompt being sent to Gemini', { prompt });

    const response = await withRetry(async () => {
      const resp = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature,
          maxOutputTokens: 3000,
        }
      });
      logger.info(`<<<<< RAW AI RESPONSE (${providerName}) >>>>>: ${resp.text}`);
      return resp.text;
    });

    const start = response.indexOf('{');
    const end = response.lastIndexOf('}') + 1;
    const jsonString = start !== -1 && end !== -1
      ? response.slice(start, end)
      : response;

    const parsed = JSON.parse(jsonString);
    const ideas = parsed.ideas;

    logger.debug('Parsed and normalized Gemini response', { ideas });
    return ideas;

  } catch (error) {
    return handleError(error, 'generateContentIdeas');
  }
};

// Construye el prompt base
const buildDefaultPrompt = (user, count, agentStyle, contentTypes, customPrompt = '') => {
  const businessInfo = user.businessInfo || {};
  const buyerPersona = businessInfo.buyerPersona || {};

  const agentJSON = JSON.stringify(agentStyle, null, 2);
  const contentTypesList = contentTypes.join(', ');

  let prompt = `Crea ${count} ideas de posts para Instagram.

NEGOCIO:
- Empresa: ${businessInfo.name || 'N/A'}
- Industria: ${businessInfo.industry || 'N/A'}

CLIENTE IDEAL:
- Intereses: ${buyerPersona.psychographics?.interests?.join(', ') || 'N/A'}

AGENT STYLE:
${agentJSON}

CONTENT TYPES: ${contentTypesList}

CATEGORY: El campo 'category' es OBLIGATORIO y DEBE ser uno de estos valores: [${contentTypesList}].

REGLAS ESTRICTAS:
- La respuesta DEBE ser un objeto JSON válido.
- El objeto JSON DEBE tener una clave "ideas".
- El valor de "ideas" DEBE ser un array de ${count} objetos.
- CADA objeto en el array DEBE tener:
  • "title" (string)  
  • "content" (string)  
  • "category" (string)  
  • "hashtags" (array de strings, p. ej. ["#ejemplo", "#IA"])

EJEMPLO DE FORMATO:
{
  "ideas": [
    {
      "title": "Título del post 1",
      "content": "Contenido completo del post 1.",
      "category": "educational",
      "hashtags": ["#ia", "#educacion"]
    }
  ]
}`;

  if (customPrompt.trim()) {
    prompt += `

CONTEXTO ADICIONAL: ${customPrompt}`;
  }

  return prompt;
};

// Reintento con backoff
const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      logger.warn(`${providerName} attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};

// Manejo de errores
const handleError = (error, operation) => {
  const apiError = error.response?.data?.error;
  const errorMessage = apiError?.message || error.message;

  logger.error(`Error in ${providerName} during ${operation}:`, { 
    message: errorMessage, 
    stack: error.stack,
    details: apiError
  });

  throw new Error(errorMessage);
};


module.exports = {
  generateContentIdeasGemini
};
