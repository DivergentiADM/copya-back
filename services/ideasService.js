require('dotenv').config();
const Agent = require('../models/Agent');
const User = require('../models/User');

class IdeasService {
  constructor() {
    this.geminiUrl = process.env.GEMINI_BASE_URL;
    this.geminiApiKey = process.env.GEMINI_KEY;
  }

  // Obtener el agente del usuario o retornar uno por defecto
  async getAgent(user) {
    try {
      if (user?.agenteID) {
        const agent = await Agent.findById(user.agenteID);
        if (agent) return agent;
        console.warn('Agente no encontrado por agenteID, usando agente por defecto.');
      }
    } catch (error) {
      console.error('Error al obtener agente del usuario:', error);
    }

    // Si no hay agente personalizado, retornar agente por defecto
    return {
      communicationStyle: {
        personality: 'Eres amigable, creativo y empático. Hablas con cercanía y conocimiento del mercado digital.'
      }
    };
  }

  async generateContentIdeas(params) {
    const platforms = ['instagram'];
    const {
      user,
      count = 3,
      category = 'general',
      topic,
      customPrompt = null,
      tone = 'professional',
      includeHashtags = true,
      includeCallToAction = true
    } = params;

    try {
      const prompt = customPrompt || await this.buildContentPrompt({
        user, count, platforms, category, tone, includeHashtags, includeCallToAction, topic
      });

      const generatedText = await this.callGemini(prompt, {
        maxTokens: 4000,
        temperature: 0.7
      }, user);

      const ideas = this.parseGeneratedContent(generatedText, platforms);

      return Promise.all(
        ideas.map((idea, idx) =>
          this._structureIdea(idea, idx, { user, category, tone, platforms })
        )
      );
    } catch (err) {
      console.error('Error generando contenido:', err);
      throw new Error(`Error generando contenido: ${err.message}`);
    }
  }

  async _structureIdea(idea, index, meta) {
    const { user, tone, platforms } = meta;
    const agent = await this.getAgent(user);
    const optimized = {};
    for (const plat of platforms) {
      optimized[plat] = await this.optimizeContentForPlatform(idea.content, plat);
    }

    return {
      title: idea.title || `Idea de Contenido ${index + 1}`,
      content: idea.content,
      hashtags: idea.hashtags || [],
      category: 'educational',
      platforms,
      provider: 'gemini',
      generatedAt: new Date(),
      originalContent: idea.content,
      optimizedContent: optimized,
      tone,
      metadata: {
        wordCount: idea.content.split(' ').length,
        estimatedEngagement: this.estimateEngagement(idea.content, 'instagram'),
        suggestedPostTime: this.suggestOptimalPostTime('instagram')
      }
    };
  }

  async callGemini(prompt, options = {}, user) {
    const agent = await this.getAgent(user);
    const systemPrompt = agent?.communicationStyle?.personality;

    if (!this.geminiApiKey) {
      throw new Error('La API Key de Gemini no está configurada.');
    }

    const contents = [];
    if (systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: `System: ${systemPrompt}` }] });
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const res = await fetch(
      `${this.geminiUrl}/models/gemini-2.5-pro:generateContent?key=${this.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: options.maxTokens,
            temperature: options.temperature
          }
        })
      }
    );

    const data = await res.json();

    if (!data?.candidates?.length) {
      throw new Error(`Error de Gemini: ${JSON.stringify(data.error || data)}`);
    }

    const candidate = data.candidates[0];
    const part = candidate?.content?.parts?.[0]?.text;

    if (!part) {
      throw new Error(`Respuesta inválida de Gemini: ${JSON.stringify(candidate)}`);
    }

    return part;
  }

  async buildContentPrompt(params) {
    const {
      user, count, platforms, category, tone,
      includeHashtags, includeCallToAction, topic
    } = params;

    const biz = user.businessInfo || {};
    const agent = await this.getAgent(user);

    const personality = agent?.communicationStyle?.personality || 'Eres experto en marketing digital.';

    return `Actúa como un experto en marketing de contenidos. Tu personalidad es la siguiente:
${personality}

DATOS DEL CLIENTE:
- Nombre del Negocio: ${biz.name || 'No proporcionado'}
- Industria: ${biz.industry || 'No proporcionada'}
- Descripción: ${biz.description || 'No proporcionada'}
- Biografía: ${biz.bio || 'No proporcionada'}
- Audiencia Objetivo: ${biz.targetAudience || 'Público general'}

TAREA:
Genera ${count} ideas de contenido para ${platforms.join(', ')} sobre el tema: "${topic}".

INSTRUCCIONES:
- Tono: ${tone}
- Categoría: ${category}
- ${includeHashtags ? 'Incluye hashtags.' : 'No incluyas hashtags.'}
- ${includeCallToAction ? 'Incluye una llamada a la acción.' : 'No incluyas llamada a la acción.'}

FORMATO DE SALIDA:
Devuelve ÚNICAMENTE un JSON válido. NO incluyas explicaciones, encabezados ni texto fuera del JSON.
Estructura esperada:
{
  "ideas": [
    {
      "title": "Título atractivo",
      "content": "Texto completo del post...",
      "hashtags": ["#ejemplo1", "#ejemplo2"],
      "cta": "Llamado a la acción"
    }
  ]
}` }

  parseGeneratedContent(text) {
  try {
    console.log('⛳ Respuesta bruta de Gemini:\n', text); // ← AGREGADO

    const match = text.match(/\{[\s\S]*\}/);
    if (!match || !match[0]) {
      throw new Error('No se encontró JSON válido.');
    }

    const json = JSON.parse(match[0]); // ← AQUÍ ES DONDE FALLA
    if (!Array.isArray(json.ideas)) {
      throw new Error('JSON no contiene un arreglo válido en ideas.');
    }

    return json.ideas;
  } catch (error) {
    console.error('Error parsing Gemini output. Usando fallback:', error);
    return text.split('\n').filter(l => l && l.length > 20).slice(0, 3)
      .map((l, i) => ({ content: l.trim(), title: `Idea ${i + 1}` }));
  }
}


  async optimizeContentForPlatform(content, platform) {
    const template = {
      maxLength: 2200,
      hashtagLimit: 30
    };

    let text = content;
    if (text.length > template.maxLength) {
      text = text.slice(0, template.maxLength - 3) + '...';
    }

    const existing = text.match(/#[\w\u00c0-\u024f\u1e00-\u1eff]+/gi) || [];
    let extra = [];
    if (existing.length < template.hashtagLimit) {
      extra = await this.generateHashtags(text, 'instagram', template.hashtagLimit - existing.length);
    }

    return {
      text,
      hashtags: [...existing, ...extra],
      callToAction: this.generateCallToAction('instagram'),
      platform,
      characterCount: text.length,
      estimatedReadTime: Math.ceil(text.split(' ').length / 200),
      suggestedFormat: this.suggestContentFormat(text, 'instagram')
    };
  }

  async generateHashtags(content, platform, count = 5) {
    const base = {
      business: ['#business', '#entrepreneur', '#success'],
      tech: ['#technology', '#innovation', '#tech'],
      lifestyle: ['#lifestyle', '#wellness'],
      marketing: ['#marketing', '#content']
    };
    const category = this.detectContentCategory(content);
    let tags = [...(base[category] || base.business)];

    const kws = this.extractKeywords(content).slice(0, 3)
      .map(w => `#${w.replace(/\s+/g, '').toLowerCase()}`);
    tags.push(...kws);
    return Array.from(new Set(tags)).slice(0, count);
  }

  generateCallToAction(platform) {
    const ctas = [
      '¿Qué opinas? ¡Déjanos tu comentario! 👇',
      '¡Dale like y comparte! ❤️',
      '¡Síguenos para más! 🔔'
    ];
    return ctas[Math.floor(Math.random() * ctas.length)];
  }

  detectContentCategory(content) {
    const kws = {
      business: ['negocio', 'empresa'],
      tech: ['tecnología', 'software'],
      lifestyle: ['vida', 'salud'],
      marketing: ['marketing', 'contenido']
    };
    const low = content.toLowerCase();
    return Object.keys(kws).find(cat =>
      kws[cat].some(w => low.includes(w))
    ) || 'business';
  }

  extractKeywords(content) {
  const stop = new Set(['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'para', 'con', 'por', 'o', 'su', 'al']);
  const wordCounts = content.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/)
    .filter(w => w.length > 3 && !stop.has(w))
    .reduce((acc, w) => {
      acc[w] = (acc[w] || 0) + 1;
      return acc;
    }, {});

  return Object.keys(wordCounts)
    .sort((a, b) => wordCounts[b] - wordCounts[a]); // <-- ahora devuelve array
}


  estimateEngagement(content, platform) {
    let score = 0;
    const patterns = {
      question: /\?/g,
      emoji: /[\u{1F600}-\u{1F64F}]/gu,
      cta: /(comenta|comparte|síguenos)/gi
    };
    Object.values(patterns).forEach(rx => {
      const m = content.match(rx);
      if (m) score += m.length;
    });
    const len = content.length;
    if (len > 150 && len < 400) score += 2;
    return score > 5 ? 'alto' : score > 2 ? 'medio' : 'bajo';
  }

  suggestOptimalPostTime(platform) {
    const times = ['9:00', '11:00', '17:00'];
    return times[Math.floor(Math.random() * times.length)];
  }

  suggestContentFormat(content, platform) {
    const wc = content.split(' ').length;
    return wc < 50 ? 'story' : 'post';
  }
}

module.exports = new IdeasService();
