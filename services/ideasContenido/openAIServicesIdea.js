const { OpenAI } = require('openai');
const logger = require('../../utils/logger');

// Configuración inicial
const apiKey = process.env.SYSTEM_OPENAI_API_KEY;
if (!apiKey) throw new Error('API key is required for openai provider');

const providerName = 'openai';
const chatModel = 'gpt-4.1';
const maxTokens = 4000;

// Cliente SDK
const openai = new OpenAI({ apiKey });

// Validación de configuración
const validateConfig = () => {
  if (!apiKey) {
    throw new Error(`API key is required for ${providerName} provider`);
  }
  return true;
};

// Función principal: generar ideas de contenido
const generateContentIdeasOpenAi = async (params) => {
  validateConfig();
  const { user, agentStyle, count, contentTypes, topic } = params;

  // 1) Mensaje de sistema reforzado
  const systemMessage = `
Eres un experto en marketing de contenidos.
RESPONDE SÓLO con un JSON válido. NO incluyas explicaciones, ni etiquetas de código, ni texto adicional.
El objeto JSON DEBE tener una propiedad "ideas" que sea un array de ${count} objetos,
y cada objeto debe tener: "title" (string), "content" (string), "category" (string) y "hashtags" (array de strings).
`.trim();

  // 2) Prompt base
  const promptBase = buildDefaultPrompt(user, count, agentStyle, contentTypes, topic);

  // 3) Llamada con el SDK de OpenAI
  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: chatModel,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: promptBase }
      ],
      temperature: 0.7,
      max_tokens: maxTokens
    })
  );

  const raw = response.choices[0].message.content;
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}') + 1;
  const clean = raw.slice(jsonStart, jsonEnd);

  try {
    const parsed = JSON.parse(clean);
    return parsed.ideas;
  } catch (err) {
    logger.warn(`JSON parse failed: ${err.message}, using fallback.`);
    return fallbackParsing(raw);
  }
};

// Construye el prompt base
const buildDefaultPrompt = (user, count, agentStyle, contentTypes, topic = '') => {
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
  • "hashtags" (array de strings)

EJEMPLO:
{
  "ideas": [
    {
      "title": "Título 1",
      "content": "Contenido del post 1.",
      "category": "educational",
      "hashtags": ["#ejemplo","#IA"]
    }
  ]
}`;

  if (topic.trim()) {
    prompt += `

CONTEXTO ADICIONAL: ${topic}`;
  }

  return prompt;
};

// Backoff con retries
const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      logger.warn(`${providerName} attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
    }
  }
};

// Fallback cuando no hay JSON limpio
const fallbackParsing = (content) => {
  const ideas = [];
  const postRegex = /\*\*Post\s+\d+:\*\*\s*([^\n]+)\n([\s\S]*?)(?=\*\*Post\s+\d+:\*\*|\n\n|$)/g;
  let match;

  while ((match = postRegex.exec(content)) !== null) {
    const title = match[1].trim();
    const body = match[2].trim();
    ideas.push({
      title,
      content: body,
      category: 'general',
      hashtags: (body.match(/#[\w\u00c0-\u024f]+/gi) || [])
    });
  }

  return ideas;
};

module.exports = {
  generateContentIdeasOpenAi
};
