// providers/openaiProvider.js
require('dotenv').config();
const { OpenAI } = require('openai');
const logger = require('../../utils/logger');

if (!process.env.SYSTEM_OPENAI_API_KEY) {
  throw new Error('La variable SYSTEM_OPENAI_API_KEY es requerida para OpenAIProvider');
}

const client = new OpenAI({ apiKey: process.env.SYSTEM_OPENAI_API_KEY });
const MODEL = 'gpt-4.1';
const DEFAULT_TEMPERATURE = 0.8;
const DEFAULT_MAX_TOKENS = 2000;


/** Construye el prompt de sistema con contexto completo */
function buildSystemPrompt( agent, topic, platform, format, duration, lighting, style, targetAudience, businessContext) {
  return `Eres ${agent.personality}, un director creativo de video especializado en ${platform}.
  
📋 DETALLES DEL PROYECTO:
- Tema: "${topic}"
- Plataforma: ${platform} (${format})
- Duración: ${duration} segundos
- Iluminación: ${lighting}
- Estilo visual: ${style}
- Audiencia: ${targetAudience}
${Object.keys(businessContext || {}).length
    ? `\n🏢 CONTEXTO DE NEGOCIO:\n${JSON.stringify(businessContext, null, 2)}`
    : ''
}

🔧 INSTRUCCIONES:
1. Responde **solo** con un JSON válido, sin código ni markdown ni "\n  \" estos caracteres.
2. Incluye: title, content (2–3 líneas), script (con timing y escenas), narrativeArc, storyboard (lista de escenas detalladas), callToAction y metadata.
3. Deja que el LLM decida internamente cámara, transiciones, paleta de color, música, efectos, etc.
4. Optimiza para máxima retención en ${platform}.
INSTRUCCIONES PARA EL STORYTELLING:
1. Crea una narrativa visual atractiva que se adapte perfectamente al formato ${format} de ${platform}
2. Divide el video en escenas específicas con duración exacta para cada una
3. Describe cada toma con detalles técnicos (cámara, iluminación, composición)
4. Incluye indicaciones para el talento (expresiones, movimientos, voz)
5. Especifica elementos visuales (colores, props, fondo, gráficos)
6. Define la música y efectos de sonido para cada escena
7. Incluye transiciones suaves entre escenas
8. Optimiza para engagement en ${platform}

FORMATO DE SALIDA:
Devuelve un objeto JSON con:
{
  "title": "Título del video",
  "platform": "plataforma del storytelling",
  "format":"formato del storytelling", 
  "hook": "Hook inicial de 3 segundos",
  "style":"Style del storytelling",
  "scenes": [
    {
      "scene": 1,
      "duration": "segundos",
      "description": "Descripción visual detallada",
      "camera": "Tipo de toma y movimiento",
      "lighting": "Configuración de iluminación",
      "talent": "Instrucciones para el talento",
      "props": "Elementos necesarios",
      "audio": "Música/efectos de sonido",
      "text": "Texto en pantalla si aplica"
  parseDurationToSeconds(length) {
    switch (length) {
      case 'short': return 15;
      case 'medium': return 30;
      case 'long': return 60;
      default: return parseInt(length) || 15;
    },
   
  ],
  "duration":"duracion del video del storytelling",
  "recomendaciones";"recomendaciones para tener exito con tu video"   
  "cta": "Call to action final",
  "tags":"tags storytelling",
  "hashtags": ["#hashtag1", "#hashtag2"]
}`;

}

/** Construye el prompt de usuario */
function buildUserPrompt({ topic }) {
  return `Genera el storytelling para el tema: "${topic}".`;
}


/** Función principal expuesta */
async function generateContent(props) {
  logger.info('🚀 OpenAIProvider.generating:', {
    topic: props.topic,
    platform: props.platform,
    duration: props.duration
  });

  const systemPrompt = buildSystemPrompt(props);
  const userPrompt   = buildUserPrompt(props);

  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt }
      ],
      temperature: DEFAULT_TEMPERATURE,
      max_tokens:  DEFAULT_MAX_TOKENS
    });

     const raw = res.choices[0].message; // este es un objeto
     const jsonString = raw.content;     // esto es un string JSON dentro del campo `content`
       const parsed = JSON.parse(jsonString); 
            
      if (!parsed) {
      throw new Error('OpenAI devolvió contenido vacío');
    }

    logger.debug('📥 Respuesta cruda OpenAI:', parsed);
    
    // Parsear el JSON de la respuesta
    try {
      
      return parsed;
    } catch (parseError) {
      logger.error('Error parseando JSON de OpenAI:', parseError);
      throw new Error(`OpenAI devolvió contenido no válido: ${parseError.message}`);
    }

  } catch (err) {
    logger.error('❌ Error en OpenAIProvider:', err);
    // Podrías implementar un fallback similar al de Gemini si quisieras
    throw new Error(`OpenAIProvider error: ${err.message}`);
  }
}

module.exports = {
  generateContent
};
