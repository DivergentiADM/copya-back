const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../../utils/logger');

// Configuración inicial del cliente Claude
const apiKey = process.env.ANTHROPIC_KEY || process.env.CLAUDE_API_KEY;
if (!apiKey) throw new Error('ANTHROPIC_KEY or CLAUDE_API_KEY environment variable is required');

const client = new Anthropic({ apiKey });
const providerName = 'claude';
const model = 'claude-3-7-sonnet-20250219';
const maxTokens = 4000;

// Función principal para generar ideas de contenido
const generateContentIdeasClaude = async (params) => {
  logger.info('generateContentIdeas called in ClaudeProvider', { params });

  try {
    const { user, agentStyle, count, customPrompt, contentTypes } = params;

    // Validar parámetros requeridos
    if (!user) {
      throw new Error('User parameter is required');
    }
    if (!contentTypes || !Array.isArray(contentTypes) || contentTypes.length === 0) {
      throw new Error('contentTypes parameter is required and must be a non-empty array');
    }

    const prompt = customPrompt || buildDefaultPrompt(user, count, agentStyle, contentTypes);

    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt is empty or invalid.');
    }

    logger.info('Prompt being sent to Claude', { prompt });

    const response = await withRetry(async () => {
      return await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: 0.3,
        system: "Eres un experto en marketing de contenidos. Siempre respondes con JSON válido exactamente como se solicita, sin texto adicional.",
        messages: [{ role: 'user', content: prompt }]
      });
    });

    const contentArray = response?.content;
    if (!Array.isArray(contentArray) || contentArray.length === 0 || !contentArray[0]?.text) {
      throw new Error('Claude response content is empty or malformed.');
    }

    const rawContent = contentArray[0].text;
    logger.info(`<<<<< RAW AI RESPONSE (${providerName}) >>>>>: ${rawContent}`);

    const parsedResponse = parseAndNormalizeResponse(rawContent, contentTypes);
    logger.debug('Parsed and normalized Claude response', { parsedResponse });

    return parsedResponse;

  } catch (error) {
    logger.error('Error in generateContentIdeas', { error });
    return handleError(error, 'generateContentIdeas');
  }
};

const buildAgentSection = (agentStyle = {}) => {
  const {
    role = 'Un experto en marketing',
    personality = 'profesional y amigable',
    tone = 'conversacional',
    vocabulary = 'accesible',
    catchphrases = [],
    useEmojis = false,
  } = agentStyle;

  return `ROL Y PERSONALIDAD:
Eres ${role}. Tu personalidad es: ${personality}
Tu tono debe ser: ${tone}
Vocabulario: ${vocabulary}
${catchphrases.length > 0 ? `Frases características: ${catchphrases.join(', ')}` : ''}
${useEmojis ? 'Usa emojis apropiados' : 'No uses emojis'}`;
};

const buildBusinessSection = (businessInfo = {}) => {
  return `INFORMACIÓN DEL NEGOCIO:
- Nombre: ${businessInfo.name || 'N/A'}
- Industria: ${businessInfo.industry || 'N/A'}
- Descripción: ${businessInfo.description || 'N/A'}
- Productos/Servicios: ${businessInfo.products?.join(', ') || 'N/A'}`;
};

const buildBuyerPersonaSection = (buyerPersona = {}) => {
  return `CLIENTE IDEAL:
- Nombre: ${buyerPersona.name || 'N/A'}
- Edad: ${buyerPersona.demographics?.age || 'N/A'}
- Intereses: ${buyerPersona.psychographics?.interests?.join(', ') || 'N/A'}
- Problemas: ${buyerPersona.psychographics?.painPoints?.join(', ') || 'N/A'}
- Objetivos: ${buyerPersona.psychographics?.goals?.join(', ') || 'N/A'}`;
};

const buildDefaultPrompt = (user, count, agentStyle, contentTypes, customPrompt = '') => {
  const businessInfo = user.businessInfo || {};
  const buyerPersona = businessInfo.buyerPersona || {};
  const contentTypesList = contentTypes.join(', ');

  const prompt = `${buildAgentSection(agentStyle)}

${buildBusinessSection(businessInfo)}

${buildBuyerPersonaSection(buyerPersona)}

OBJETIVO:
Crea EXACTAMENTE 3 ideas de posts para Instagram que resuenen directamente con este cliente ideal.

TIPOS DE CONTENIDO PERMITIDOS: [${contentTypesList}]

FORMATO DE RESPUESTA OBLIGATORIO:
Responde SOLAMENTE con el JSON directo. NO uses \`\`\`json ni explicaciones. Exactamente 3 ideas:

{"ideas":[{"title":"Título 1","content":"Contenido 1","category":"${contentTypes[0]}","hashtags":["#tag1","#tag2","#tag3"]},{"title":"Título 2","content":"Contenido 2","category":"${contentTypes[0]}","hashtags":["#tag1","#tag2","#tag3"]},{"title":"Título 3","content":"Contenido 3","category":"${contentTypes[0]}","hashtags":["#tag1","#tag2","#tag3"]}]}

REGLAS OBLIGATORIAS:
1. EXACTAMENTE 3 ideas, ni más ni menos
2. La categoría DEBE ser exactamente una de: [${contentTypesList}]
3. Usa el TONO Y PERSONALIDAD definidos arriba
4. Habla DIRECTAMENTE al cliente ideal usando "tú"
5. Cada post debe tener exactamente 3-5 hashtags
6. Máximo 280 caracteres por contenido
7. INCORPORA las frases características del agente si las hay
8. SOLO el JSON, sin texto adicional

${customPrompt && customPrompt.trim() ? `CONTEXTO ADICIONAL: ${customPrompt}` : ''}

Genera exactamente 3 ideas ahora:`;

  return prompt;
};

module.exports = {
  buildDefaultPrompt
};


// Crear ideas de fallback cuando todo falla
const createFallbackIdeas = (content, contentTypes) => {
  logger.info('Creating fallback ideas');
  
  const category = contentTypes[0] || 'general';
  
  return [
    {
      title: 'Consejo del día',
      content: 'Aprovecha al máximo tu tiempo con estos consejos prácticos.',
      category: category,
      hashtags: ['#consejos', '#productividad', '#tips']
    },
    {
      title: 'Reflexión importante',
      content: 'A veces necesitamos parar y reflexionar sobre nuestros objetivos.',
      category: category,
      hashtags: ['#reflexion', '#objetivos', '#crecimiento']
    },
    {
      title: 'Motivación diaria',
      content: 'Cada día es una nueva oportunidad para crecer y mejorar.',
      category: category,
      hashtags: ['#motivacion', '#crecimiento', '#exito']
    }
  ];
};

// Lógica de reintento
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
  const errorMessage = error.message;
  const status = error?.status || error?.error?.status;

  logger.error(`Error in ${providerName} during ${operation}:`, { 
    message: errorMessage, 
    stack: error.stack,
    status: status,
    error: error
  });

  if (status === 401) {
    throw new Error('Invalid Claude API key. Please check your ANTHROPIC_KEY configuration.');
  } else if (status === 429) {
    throw new Error('Claude API rate limit exceeded. Please try again later.');
  } else {
    throw new Error(errorMessage);
  }
};

module.exports = {
  generateContentIdeasClaude
};