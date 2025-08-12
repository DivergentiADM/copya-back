
class BuyerPersonaService {
  constructor() {
    this.personaTemplate = {
      demographics: {
        age: '',
        gender: '',
        location: '',
        income: '',
        education: '',
        occupation: ''
      },
      psychographics: {
        interests: [],
        values: [],
        lifestyle: '',
        personality: '',
        attitudes: []
      },
      behavior: {
        shoppingHabits: [],
        mediaConsumption: [],
        socialMediaUsage: [],
        decisionMakingProcess: '',
        brandLoyalty: ''
      },
      painPoints: [],
      goals: [],
      motivations: [],
      challenges: [],
      preferredCommunication: [],
      buyingTriggers: [],
      objections: []
    };
  }

  /**
   * Genera un buyer persona completo basado en información del negocio
   * @param {object} user - Usuario con información del negocio
   * @param {object} scrapedData - Datos extraídos del sitio web
   * @returns {object} Buyer persona generado
   */
  async generateBuyerPersona(user, scrapedData = {}) {
    try {
      const businessInfo = user.businessInfo || {};
      
      // Construir prompt especializado para buyer persona
      const prompt = this.buildBuyerPersonaPrompt(businessInfo, scrapedData);
      
      // Generar buyer persona usando IA
      const generatedContent = await aiService.generateContentIdeas({
        user,
        count: 1,
        customPrompt: prompt,
        platforms: ['none'],
        category: 'buyer_persona'
      });

      if (!generatedContent || generatedContent.length === 0) {
        throw new Error('No se pudo generar el buyer persona');
      }

      // Parsear y estructurar el buyer persona
      const buyerPersona = this.parseBuyerPersonaResponse(generatedContent[0].content);
      
      // Validar y completar campos faltantes
      const completeBuyerPersona = this.validateAndCompleteBuyerPersona(buyerPersona, businessInfo);
      
      return completeBuyerPersona;

    } catch (error) {
      console.error('Error generando buyer persona:', error);
      
      // Fallback: generar buyer persona básico
      return this.generateFallbackBuyerPersona(user.businessInfo);
    }
  }

  /**
   * Construye un prompt especializado para generar buyer persona
   * @param {object} businessInfo - Información del negocio
   * @param {object} scrapedData - Datos del scraping
   * @returns {string} Prompt construido
   */
  buildBuyerPersonaPrompt(businessInfo, scrapedData) {
    let prompt = `Actúa como un experto en marketing y análisis de audiencias. Basándote en la siguiente información de negocio, genera un buyer persona detallado y realista.

INFORMACIÓN DEL NEGOCIO:
- Nombre: ${businessInfo.name || 'No especificado'}
- Industria: ${businessInfo.industry || 'No especificado'}
- Descripción: ${businessInfo.description || 'No especificado'}
- Sitio web: ${businessInfo.website || 'No especificado'}
- Audiencia objetivo actual: ${businessInfo.targetAudience || 'No especificado'}

`;

    // Agregar información del scraping si está disponible
    if (scrapedData && Object.keys(scrapedData).length > 0) {
      prompt += `INFORMACIÓN EXTRAÍDA DEL SITIO WEB:
- Página principal: ${scrapedData.home || 'No disponible'}
- Productos/Servicios: ${scrapedData.products || 'No disponible'}
- Misión: ${scrapedData.mission || 'No disponible'}
- Beneficios: ${scrapedData.benefits || 'No disponible'}
- Acerca de: ${scrapedData.about || 'No disponible'}

`;
    }

    prompt += `INSTRUCCIONES:
Genera un buyer persona en formato JSON con la siguiente estructura exacta:

{
  "name": "Nombre del persona (ej: María Empresaria)",
  "tagline": "Descripción breve en una línea",
  "demographics": {
    "age": "Rango de edad (ej: 28-35 años)",
    "gender": "Género predominante",
    "location": "Ubicación geográfica",
    "income": "Rango de ingresos",
    "education": "Nivel educativo",
    "occupation": "Ocupación principal"
  },
  "psychographics": {
    "interests": ["interés1", "interés2", "interés3"],
    "values": ["valor1", "valor2", "valor3"],
    "lifestyle": "Descripción del estilo de vida",
    "personality": "Rasgos de personalidad principales",
    "attitudes": ["actitud1", "actitud2"]
  },
  "behavior": {
    "shoppingHabits": ["hábito1", "hábito2"],
    "mediaConsumption": ["medio1", "medio2"],
    "socialMediaUsage": ["plataforma1", "plataforma2"],
    "decisionMakingProcess": "Cómo toma decisiones de compra",
    "brandLoyalty": "Nivel de lealtad a marcas"
  },
  "painPoints": ["dolor1", "dolor2", "dolor3"],
  "goals": ["objetivo1", "objetivo2", "objetivo3"],
  "motivations": ["motivación1", "motivación2"],
  "challenges": ["desafío1", "desafío2"],
  "preferredCommunication": ["canal1", "canal2"],
  "buyingTriggers": ["trigger1", "trigger2"],
  "objections": ["objeción1", "objeción2"],
  "contentPreferences": {
    "formats": ["formato1", "formato2"],
    "topics": ["tema1", "tema2"],
    "tone": "Tono de comunicación preferido",
    "frequency": "Frecuencia de comunicación preferida"
  },
  "customerJourney": {
    "awareness": "Cómo descubre el problema",
    "consideration": "Cómo evalúa soluciones",
    "decision": "Qué lo convence de comprar",
    "retention": "Qué lo mantiene como cliente"
  }
}

IMPORTANTE:
- Sé específico y realista
- Basa las respuestas en la industria y tipo de negocio
- Incluye detalles que ayuden a crear contenido relevante
- Usa datos demográficos coherentes con el mercado objetivo
- Asegúrate de que el JSON sea válido`;

    return prompt;
  }

  /**
   * Parsea la respuesta de IA y extrae el buyer persona
   * @param {string} response - Respuesta de la IA
   * @returns {object} Buyer persona parseado
   */
  parseBuyerPersonaResponse(response) {
    try {
      // Buscar JSON en la respuesta
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Si no hay JSON válido, intentar extraer información manualmente
      throw new Error('No se encontró JSON válido en la respuesta');

    } catch (error) {
      console.error('Error parseando buyer persona:', error);
      
      // Retornar estructura básica si falla el parsing
      return {
        name: 'Cliente Ideal',
        tagline: 'Cliente objetivo principal',
        demographics: {},
        psychographics: {},
        behavior: {},
        painPoints: [],
        goals: [],
        motivations: [],
        challenges: [],
        preferredCommunication: [],
        buyingTriggers: [],
        objections: []
      };
    }
  }

  /**
   * Valida y completa campos faltantes del buyer persona
   * @param {object} buyerPersona - Buyer persona a validar
   * @param {object} businessInfo - Información del negocio
   * @returns {object} Buyer persona validado y completado
   */
  validateAndCompleteBuyerPersona(buyerPersona, businessInfo) {
    // Asegurar que todos los campos requeridos existan
    const validatedPersona = {
      ...this.personaTemplate,
      ...buyerPersona,
      generatedAt: new Date(),
      basedOn: {
        businessName: businessInfo.name,
        industry: businessInfo.industry,
        hasWebsiteData: !!businessInfo.website
      }
    };

    // Validar y limpiar arrays
    ['painPoints', 'goals', 'motivations', 'challenges', 'preferredCommunication', 'buyingTriggers', 'objections'].forEach(field => {
      if (!Array.isArray(validatedPersona[field])) {
        validatedPersona[field] = [];
      }
    });

    // Validar objetos anidados
    ['demographics', 'psychographics', 'behavior'].forEach(field => {
      if (typeof validatedPersona[field] !== 'object') {
        validatedPersona[field] = this.personaTemplate[field];
      }
    });

    return validatedPersona;
  }

  /**
   * Genera un buyer persona básico como fallback
   * @param {object} businessInfo - Información del negocio
   * @returns {object} Buyer persona básico
   */
  generateFallbackBuyerPersona(businessInfo = {}) {
    const industry = businessInfo.industry || 'general';
    
    // Plantillas básicas por industria
    const industryTemplates = {
      'tecnología': {
        name: 'Alex Innovador',
        tagline: 'Profesional tech que busca soluciones eficientes',
        demographics: {
          age: '25-40 años',
          gender: 'Mixto',
          location: 'Ciudades principales',
          income: '$50,000 - $100,000',
          education: 'Universitaria',
          occupation: 'Profesional en tecnología'
        },
        painPoints: ['Falta de tiempo', 'Necesidad de eficiencia', 'Mantenerse actualizado'],
        goals: ['Optimizar procesos', 'Crecer profesionalmente', 'Innovar']
      },
      'salud': {
        name: 'Carmen Bienestar',
        tagline: 'Persona consciente de su salud y bienestar',
        demographics: {
          age: '30-50 años',
          gender: 'Femenino predominante',
          location: 'Urbano y suburbano',
          income: '$40,000 - $80,000',
          education: 'Universitaria',
          occupation: 'Profesional'
        },
        painPoints: ['Falta de tiempo para cuidarse', 'Estrés', 'Información confusa'],
        goals: ['Mejorar salud', 'Reducir estrés', 'Vivir mejor']
      },
      'educación': {
        name: 'Luis Aprendiz',
        tagline: 'Estudiante o profesional en constante aprendizaje',
        demographics: {
          age: '20-45 años',
          gender: 'Mixto',
          location: 'Global',
          income: '$20,000 - $60,000',
          education: 'En proceso o completada',
          occupation: 'Estudiante o profesional'
        },
        painPoints: ['Tiempo limitado', 'Costo de educación', 'Calidad del contenido'],
        goals: ['Adquirir nuevas habilidades', 'Avanzar en carrera', 'Certificarse']
      }
    };

    const template = industryTemplates[industry.toLowerCase()] || industryTemplates['general'] || {
      name: 'Cliente Ideal',
      tagline: 'Cliente objetivo principal del negocio',
      demographics: {
        age: '25-45 años',
        gender: 'Mixto',
        location: 'Urbano',
        income: '$30,000 - $70,000',
        education: 'Secundaria/Universitaria',
        occupation: 'Profesional'
      },
      painPoints: ['Necesidad no satisfecha', 'Falta de tiempo', 'Presupuesto limitado'],
      goals: ['Resolver problema', 'Mejorar situación', 'Obtener valor']
    };

    return {
      ...this.personaTemplate,
      ...template,
      generatedAt: new Date(),
      basedOn: {
        businessName: businessInfo.name || 'Negocio',
        industry: industry,
        hasWebsiteData: false,
        isFallback: true
      }
    };
  }

  /**
   * Actualiza el buyer persona del usuario en la base de datos
   * @param {object} user - Usuario
   * @param {object} buyerPersona - Buyer persona generado
   * @returns {object} Usuario actualizado
   */
  async updateUserBuyerPersona(user, buyerPersona) {
    try {
      // Actualizar información del negocio con el buyer persona
      user.businessInfo = {
        ...user.businessInfo,
        buyerPersona: buyerPersona,
        targetAudience: buyerPersona.tagline || user.businessInfo.targetAudience,
        lastPersonaUpdate: new Date()
      };

      await user.save();
      return user;

    } catch (error) {
      console.error('Error actualizando buyer persona del usuario:', error);
      throw new Error('Error guardando buyer persona');
    }
  }

  /**
   * Genera insights de contenido basados en el buyer persona
   * @param {object} buyerPersona - Buyer persona
   * @returns {object} Insights para creación de contenido
   */
  generateContentInsights(buyerPersona) {
    return {
      recommendedTopics: this.extractRecommendedTopics(buyerPersona),
      contentFormats: this.extractContentFormats(buyerPersona),
      communicationTone: this.extractCommunicationTone(buyerPersona),
      postingFrequency: this.extractPostingFrequency(buyerPersona),
      hashtagSuggestions: this.extractHashtagSuggestions(buyerPersona),
      callToActionTypes: this.extractCTATypes(buyerPersona)
    };
  }

  /**
   * Extrae temas recomendados del buyer persona
   * @private
   */
  extractRecommendedTopics(buyerPersona) {
    const topics = [];
    
    // Basado en intereses
    if (buyerPersona.psychographics?.interests) {
      topics.push(...buyerPersona.psychographics.interests);
    }
    
    // Basado en pain points
    if (buyerPersona.painPoints) {
      topics.push(...buyerPersona.painPoints.map(pain => `Soluciones para ${pain}`));
    }
    
    // Basado en objetivos
    if (buyerPersona.goals) {
      topics.push(...buyerPersona.goals.map(goal => `Cómo lograr ${goal}`));
    }
    
    return [...new Set(topics)].slice(0, 10); // Eliminar duplicados y limitar
  }

  /**
   * Extrae formatos de contenido recomendados
   * @private
   */
  extractContentFormats(buyerPersona) {
    const formats = ['posts', 'stories'];
    
    // Basado en consumo de medios
    if (buyerPersona.behavior?.mediaConsumption?.includes('video')) {
      formats.push('reels', 'videos');
    }
    
    if (buyerPersona.behavior?.mediaConsumption?.includes('lectura')) {
      formats.push('carousels', 'infografías');
    }
    
    return formats;
  }

  /**
   * Extrae tono de comunicación recomendado
   * @private
   */
  extractCommunicationTone(buyerPersona) {
    const personality = buyerPersona.psychographics?.personality?.toLowerCase() || '';
    
    if (personality.includes('profesional') || personality.includes('serio')) {
      return 'profesional';
    }
    
    if (personality.includes('casual') || personality.includes('relajado')) {
      return 'casual';
    }
    
    if (personality.includes('amigable') || personality.includes('cercano')) {
      return 'amigable';
    }
    
    return 'equilibrado';
  }

  /**
   * Extrae frecuencia de publicación recomendada
   * @private
   */
  extractPostingFrequency(buyerPersona) {
    const socialUsage = buyerPersona.behavior?.socialMediaUsage || [];
    
    if (socialUsage.includes('diario') || socialUsage.includes('frecuente')) {
      return 'diaria';
    }
    
    if (socialUsage.includes('semanal')) {
      return 'semanal';
    }
    
    return 'moderada'; // 3-4 veces por semana
  }

  /**
   * Extrae sugerencias de hashtags
   * @private
   */
  extractHashtagSuggestions(buyerPersona) {
    const hashtags = [];
    
    // Basado en intereses
    if (buyerPersona.psychographics?.interests) {
      hashtags.push(...buyerPersona.psychographics.interests.map(interest => 
        `#${interest.replace(/\s+/g, '').toLowerCase()}`
      ));
    }
    
    // Basado en industria
    if (buyerPersona.basedOn?.industry) {
      hashtags.push(`#${buyerPersona.basedOn.industry.replace(/\s+/g, '').toLowerCase()}`);
    }
    
    return hashtags.slice(0, 15);
  }

  /**
   * Extrae tipos de call-to-action recomendados
   * @private
   */
  extractCTATypes(buyerPersona) {
    const ctas = [];
    
    // Basado en triggers de compra
    if (buyerPersona.buyingTriggers?.includes('urgencia')) {
      ctas.push('urgencia');
    }
    
    if (buyerPersona.buyingTriggers?.includes('descuento')) {
      ctas.push('oferta');
    }
    
    // CTAs por defecto
    ctas.push('engagement', 'información', 'contacto');
    
    return [...new Set(ctas)];
  }
}

module.exports = new BuyerPersonaService();

