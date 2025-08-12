// services/storytellingService.js
const {generateStory}  = require('./providers/geminiProvider');
const {generateContent}  = require('./providers/openaiProvider');




/**
 * Crea la historia: inyecta sólo los campos del front + agente + metadatos
 * @param {Object} user — objeto Mongoose del usuario
 * @param {Object} opts — req.body con keys: 
 *   provider, content, platform, format, duration, lighting, style, targetAudience, businessContext
 */
async function createStory(  
      agent,
      provider,
      content,
      platform,
      format,
      duration,
      lighting,
      style,
      targetAudience,
      businessContext,) {

  
  // 1. Obtener agente (usa user.agentID o default)
        console.log(provider);
        
 
  // 3. Preparar props EXACTAMENTE con lo que vino del front
  const props = {
    provider,
    agent:          agent,                     
    topic:          content,
    platform:       platform,
    format:         format,
    duration:       duration,
    lighting:       lighting,
    style:           style,
    targetAudience: targetAudience,
    businessContext: businessContext,

    requestId:      `story_${Date.now()}`,
    generatedAt:    new Date(),
  }; 
/** Elige el módulo según el nombre */
let story;
    switch (provider) {
      case 'openai':
        story = await generateContent(props);
        break;
      case 'gemini':
        story = await generateStory(props);
        break;
      default:
        throw new Error('Proveedor de IA no válido. Use openai o gemini.');
    }

  // 5. Enriquecer metadata de forma uniforme
  story.metadata = {
    ...story.metadata,
    generatedBy: provider,
    generatedAt: new Date(),
    requestId:   props.requestId,
  };

  // 6. Devolver solo lo esencial
  return {
    title:        story.title,
    hook:         story.hook,
    scenes:       story.scenes,
    recomendaciones: story.recomendaciones,
    duration:     story.duration,
    cta:          story.cta,
    hashtags:     story.hashtags,
    tags:         story.tags,
    metadata:     story.metadata,
    format:       story.format,
    style:        story.style,
    platform:     story.platform
  };
}

module.exports = { createStory };
