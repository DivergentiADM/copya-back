const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../../utils/logger');

class ClaudeProvider {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_KEY || process.env.CLAUDE_API_KEY;
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_KEY or CLAUDE_API_KEY environment variable is required');
    }
    this.client = new Anthropic({
      apiKey: this.apiKey
    });
    this.model = 'claude-3-7-sonnet-20250219'; // Updated to available model
    this.maxTokens = 2000;
    this.temperature = 0.8;
  }

  async generateContent(prompt, options = {}, systemPrompt = '') {
    const { 
      maxTokens = 500, 
      temperature = this.temperature,
      content = '',
      platform = 'instagram',
      format = 'reel',
      duration = 30,
      lighting = 'natural',
      style = 'professional',
      targetAudience = 'general',
      businessContext = {},
      formatSpecs = {}
    } = options;
    
    // System message for storytelling JSON format
    const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../../utils/logger');

class ClaudeProvider {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_KEY || process.env.CLAUDE_API_KEY;
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_KEY or CLAUDE_API_KEY environment variable is required');
    }
    this.client = new Anthropic({
      apiKey: this.apiKey
    });
    this.model = 'claude-3-opus-20240229'; // Updated to a more capable model for JSON output
    this.maxTokens = 4000; // Increased max tokens for potentially larger JSON
    this.temperature = 0.7; // Slightly lower temperature for more consistent JSON
  }

  async generateContent(prompt, options = {}, systemPrompt = '') {
    const { 
      maxTokens = 3500, // Adjusted default
      temperature = this.temperature,
      content = '',
      platform = 'instagram',
      format = 'reel',
      duration = 30,
      lighting = 'natural',
      style = 'professional',
      targetAudience = 'general',
      businessContext = {},
      formatSpecs = {}
    } = options;
    
    const storytellingSystemMessage = ({ platform, format, duration, lighting, style, targetAudience, formatSpecs, content, businessContext }) => `
Tu única función es generar un objeto JSON válido, puro y completo basado en las instrucciones. No debes incluir NUNCA texto introductorio, explicaciones, ni el marcador \`\`\`json. La salida debe ser directamente el JSON.

Actúa como un director creativo especializado en contenido de video para redes sociales. 

CONTEXTO DEL NEGOCIO:
- Plataforma: ${platform}
- Formato: ${format}
- Duración: ${duration} segundos
- Estilo de iluminación: ${lighting}
- Estilo visual: ${style}
- Audiencia objetivo: ${targetAudience}
- Especificaciones técnicas: 
${JSON.stringify(formatSpecs, null, 2)}

CONTENIDO BASE:
${content}

DETALLES DEL NEGOCIO:
${JSON.stringify(businessContext, null, 2)}

INSTRUCCIONES PARA EL STORYTELLING:
1. Crea una narrativa visual atractiva que se adapte perfectamente al formato ${format} de ${platform}
2. Divide el video en escenas específicas con duración exacta para cada una
3. Describe cada toma con detalles técnicos (cámara, iluminación, composición)
4. Incluye indicaciones para el talento (expresiones, movimientos, voz)
5. Especifica elementos visuales (colores, props, fondo, gráficos)
6. Define la música y efectos de sonido para cada escena
7. Incluye transiciones suaves entre escenas
8. Optimiza para engagement en ${platform}

Estructura obligatoria completa:
${JSON.stringify({
  title: "Título específico y atractivo",
  content: "Resumen accionable de 2-3 líneas",
  script: "Guion completo con hook inicial, desarrollo y CTA",
  narrativeArc: "Estructura narrativa aplicada",
  storyboard: [
    {
      scene: 1,
      duration: 3,
      description: "Descripción visual detallada",
      camera: "Técnica de cámara específica",
      lighting: "Estilo de iluminación",
      transition: "Tipo de transición",
      music: "Tipo de música o mood musical",
      soundEffects: "Efectos de sonido específicos",
      textOnScreen: "Texto a mostrar en pantalla",
      emotion: "Emoción principal a transmitir",
      colorPalette: "Paleta de colores para la escena"
    }
  ],
  music: {
    overallMood: "Mood principal de la música",
    genre: "Género musical recomendado",
    tempo: "BPM o tempo",
    intensity: "Nivel de intensidad",
    transitions: "Tipo de transiciones musicales"
  },
  soundDesign: {
    ambient: "Sonidos ambientales",
    effects: ["Array de efectos de sonido"],
    voiceOver: "Estilo de voz en off"
  },
  visualStyle: {
    colorPalette: "Paleta de colores dominante",
    filters: "Filtros visuales recomendados",
    graphics: "Estilo de gráficos"
  },
  callToAction: {
    text: "Texto del call to action",
    timing: "Momento exacto para el CTA",
    style: "Estilo de presentación del CTA"
  },
  metadata: {
    duration: "Duración total",
    sceneCount: "Número de escenas",
    difficulty: "Nivel de dificultad 1-10",
    equipmentNeeded: ["Lista de equipo necesario"],
    platformOptimization: "Optimización para plataforma"
  }
}, null, 2)}
`;

    
    logger.debug('→ Claude SDK request:', { model: this.model, maxTokens, temperature });

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: Math.max(maxTokens, 4000),
        temperature: temperature,
        system: systemPrompt ? `${systemPrompt}

${storytellingSystemMessage}` : storytellingSystemMessage,
        messages: [
          {
            role: 'user',
            content: `${prompt}

Por favor, genera únicamente el objeto JSON solicitado.`
          }
        ]
      });

      logger.info('=== Claude SDK response ===');
      logger.info(JSON.stringify(response, null, 2));

      let text = response.content[0]?.text?.trim();
      
      // Attempt to extract JSON from a markdown block if it exists
      const jsonMatch = text.match(/```json([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        text = jsonMatch[1].trim();
      } else if (text.startsWith('{') && text.endsWith('}')) {
        // It might be a raw JSON string already
      } else {
         logger.warn('Claude response was not a JSON object. Attempting to parse anyway.');
      }

      if (!text || text === '') {
        logger.warn('Claude returned empty text, using fallback content');
        return JSON.stringify({
          title: "Contenido generado automáticamente",
          content: "Contenido temporal mientras resolvemos el problema técnico.",
          script: "Este es un guion de respaldo generado automáticamente.",
          narrativeArc: "Estructura narrativa básica",
          storyboard: [
            {
              scene: 1,
              duration: 5,
              description: "Introducción al tema",
              camera: "Plano medio",
              lighting: "Natural"
            }
          ],
          metadata: {
            duration: "15 segundos",
            difficulty: 3,
            keyPoints: ["Introducción", "Desarrollo", "Conclusión"]
          }
        });
      }

      logger.info('=== Claude generated text ===');
      logger.info(text);
      return text;

    } catch (error) {
      if (error.status) {
        logger.error('Claude SDK Error Response:', { 
          status: error.status, 
          message: error.message,
          type: error.type,
          error: error.error
        });
        
        if (error.status === 401) {
          throw new Error('Invalid Claude API key. Please check your ANTHROPIC_KEY configuration.');
        } else if (error.status === 429) {
          throw new Error('Claude API rate limit exceeded. Please try again later.');
        } else if (error.status === 500) {
          throw new Error('Claude API server error. Please try again later.');
        } else {
          throw new Error(`Claude API Error (${error.status}): ${error.message}`);
        }
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        logger.error('Claude SDK Network Error:', error.message);
        throw new Error(`Network error connecting to Claude API: ${error.message}`);
      } else {
        logger.error('Claude SDK Error:', error.message, error.stack);
        throw new Error(`Claude API Error: ${error.message}`);
      }
    }
  }
}

module.exports = new ClaudeProvider();
;
    
    logger.debug('→ Claude SDK request:', { model: this.model, maxTokens, temperature });

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: Math.max(maxTokens, 2000),
        temperature: temperature,
        system: systemPrompt ? `${systemPrompt}\n\n${storytellingSystemMessage}` : storytellingSystemMessage,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      logger.info('=== Claude SDK response ===');
      logger.info(JSON.stringify(response, null, 2));

      const text = response.content[0]?.text?.trim();
      if (!text || text === '') {
        logger.warn('Claude returned empty text, using fallback content');
        return JSON.stringify({
          title: "Contenido generado automáticamente",
          content: "Contenido temporal mientras resolvemos el problema técnico.",
          script: "Este es un guion de respaldo generado automáticamente.",
          narrativeArc: "Estructura narrativa básica",
          storyboard: [
            {
              scene: 1,
              duration: 5,
              description: "Introducción al tema",
              camera: "Plano medio",
              lighting: "Natural"
            }
          ],
          metadata: {
            duration: "15 segundos",
            difficulty: 3,
            keyPoints: ["Introducción", "Desarrollo", "Conclusión"]
          }
        });
      }

      logger.info('=== Claude generated text ===');
      logger.info(text);
      return text;

    } catch (error) {
      if (error.status) {
        logger.error('Claude SDK Error Response:', { 
          status: error.status, 
          message: error.message,
          type: error.type,
          error: error.error
        });
        
        if (error.status === 401) {
          throw new Error('Invalid Claude API key. Please check your ANTHROPIC_KEY configuration.');
        } else if (error.status === 429) {
          throw new Error('Claude API rate limit exceeded. Please try again later.');
        } else if (error.status === 500) {
          throw new Error('Claude API server error. Please try again later.');
        } else {
          throw new Error(`Claude API Error (${error.status}): ${error.message}`);
        }
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        logger.error('Claude SDK Network Error:', error.message);
        throw new Error(`Network error connecting to Claude API: ${error.message}`);
      } else {
        logger.error('Claude SDK Error:', error.message, error.stack);
        throw new Error(`Claude API Error: ${error.message}`);
      }
    }
  }
}

module.exports = new ClaudeProvider();