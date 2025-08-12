// controllers/storytellingController.js
const { validationResult } = require('express-validator');
const { createStory } = require('../services/storytellingService');
const Storytelling    = require('../models/Storytelling');
const User            = require('../models/User');
const Agent           = require('../models/Agent');
const logger          = require('../utils/logger');

/**
 * Genera un storytelling de video, lo guarda en BD y devuelve el resultado.
 */
async function generateVideoStory(req, res) {
  logger.info('→ generateVideoStory inicio', { userId: req.user._id, body: req.body });

  const {
    provider, content, platform, format,
    duration, lighting, style, targetAudience, businessContext
  } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      logger.warn('Usuario no encontrado en DB', { userId: req.user._id });
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    logger.debug('Usuario cargado', { userId: user._id });

    const agent = await Agent.findById(user.agenteID);
    logger.debug('Agente obtenido', { agentId: user.agenteID, exists: !!agent });

    // Validación de inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Datos inválidos en req.body', { errors: errors.array() });
      return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });
    }

    logger.info('Llamando a createStory', { provider, content, platform, format });
  
    
    const storyResult = await createStory(agent,  provider, content, platform, format, duration, lighting, style, targetAudience, businessContext);    
    console.log(storyResult);
                                              
    logger.info('createStory completado', { requestId: storyResult.metadata?.requestId || 'story_' + Date.now() });

    // Convertir script a string si es array
    let scriptText = '';
    if (typeof storyResult.script === 'string') {
      scriptText = storyResult.script;
    } else if (Array.isArray(storyResult.script)) {
      scriptText = storyResult.script.map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object') return item.narration || item.scene || JSON.stringify(item);
        return String(item);
      }).join('\n');
    } else {
      scriptText = JSON.stringify(storyResult.script || '');
    }

    

    

  
    const doc = await Storytelling.create({
      userId:         user._id,
      
      title:          storyResult.title,
      hook:           storyResult.hook,
      scenes:         storyResult.scenes,
      recomendaciones: storyResult.recomendaciones, 
      duration:       storyResult.duration, 
      cta:            storyResult.cta,
      hashtags:       storyResult.hashtags,
      tags:           storyResult.tags,
  
      
      provider:       storyResult.metadata.generatedBy || provider,
      metadata:       storyResult.metadata,
      
      format:         storyResult.format,
      style:          storyResult.style,
      platform:       storyResult.platform,
         
      
      
      
      
   
   
    });
    logger.info('Storytelling guardado en BD', { storytellingId: doc._id });

    return res.status(201).json({
      success: true,
      message: 'Storytelling generado exitosamente',
      data: { storytellingId: doc._id, ...storyResult }
    });

  } catch (error) {
    logger.error('Error generando storytelling', { error: error.stack });
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
}

/**
 * Estima tiempo de producción, equipo, dificultad y tips.
 */
async function estimateProduction(req, res) {
  logger.info('→ estimateProduction inicio', { body: req.body });
  try {
    const { storyboard, lighting, style } = req.body;
    const estimation = {
      productionTime: Storytelling.estimateProductionTime(storyboard),
      equipment:      Storytelling.getEquipmentList(lighting, style),
      difficulty:     Storytelling.calculateDifficulty(storyboard, lighting, style),
      recommendations: Storytelling.getProductionTips('instagram', 'reel')
    };
    logger.info('estimateProduction completado', { estimation });
    return res.status(200).json({ success: true, data: { estimation } });
  } catch (error) {
    logger.error('Error estimando producción', { error: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Error estimando producción',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Obtiene historias del usuario con paginación y stats.
 */
async function getUserStories(req, res) {
  logger.info('→ getUserStories inicio', { userId: req.user._id, query: req.query });
  try {
    const userId = req.user._id;
    const { status, platform, page = 1, limit = 10 } = req.query;
    const query = { userId };
    if (status)   query.status   = status;
    if (platform) query.platform = platform;

    const skip = (page - 1) * limit;
    const stories = await Storytelling.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    logger.debug('Historias obtenidas', { count: stories.length });

    const storiesWithStats = stories.map(story => {
      const obj = story.toObject();
      obj.userRating  = story.getUserRating(userId);
      obj.ratingStats = { average: story.averageRating, total: story.totalRatings };
      return obj;
    });
    const total = await Storytelling.countDocuments(query);

    logger.info('getUserStories completado', { total });
    return res.status(200).json({
      success: true,
      data: {
        stories: storiesWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages:  Math.ceil(total / limit),
          total,
          hasNextPage: skip + storiesWithStats.length < total,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    logger.error('Error obteniendo historias del usuario', { error: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo historias del usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Obtiene una historia específica del usuario.
 */
async function getStory(req, res) {
  logger.info('→ getStory inicio', { userId: req.user._id, storyId: req.params.id });
  try {
    const { id }    = req.params;
    const userId    = req.user._id;
    const story     = await Storytelling.findOne({ _id: id, userId });
    if (!story) {
      logger.warn('Historia no encontrada', { storyId: id, userId });
      return res.status(404).json({ success: false, message: 'Historia no encontrada' });
    }
    const obj = story.toObject();
    obj.userRating  = story.getUserRating(userId);
    obj.ratingStats = { average: story.averageRating, total: story.totalRatings };

    logger.info('getStory completado', { storyId: id });
    return res.status(200).json({ success: true, data: { story: obj } });
  } catch (error) {
    logger.error('Error obteniendo historia', { error: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo historia',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Actualiza una historia existente.
 */
async function updateStory(req, res) {
  logger.info('→ updateStory inicio', { userId: req.user._id, storyId: req.params.id, updates: req.body });
  try {
    const { id }      = req.params;
    const userId      = req.user._id;
    const updates     = req.body;
    const story       = await Storytelling.findOneAndUpdate({ _id: id, userId }, updates, { new: true });
    if (!story) {
      logger.warn('Historia no encontrada para actualizar', { storyId: id, userId });
      return res.status(404).json({ success: false, message: 'Historia no encontrada' });
    }

    logger.info('updateStory completado', { storyId: id });
    return res.status(200).json({
      success: true,
      message: 'Historia actualizada exitosamente',
      data: { story }
    });
  } catch (error) {
    logger.error('Error actualizando historia', { error: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Error actualizando historia',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Elimina una historia.
 */
async function deleteStory(req, res) {
  logger.info('→ deleteStory inicio', { userId: req.user._id, storyId: req.params.id });
  try {
    const { id }   = req.params;
    const userId   = req.user._id;
    const story    = await Storytelling.findOneAndDelete({ _id: id, userId });
    if (!story) {
      logger.warn('Historia no encontrada para eliminar', { storyId: id, userId });
      return res.status(404).json({ success: false, message: 'Historia no encontrada' });
    }

    logger.info('deleteStory completado', { storyId: id });
    return res.status(200).json({ success: true, message: 'Historia eliminada exitosamente' });
  } catch (error) {
    logger.error('Error eliminando historia', { error: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Error eliminando historia',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Califica una historia.
 */
async function rateStory(req, res) {
  logger.info('→ rateStory inicio', { userId: req.user._id, storyId: req.params.id, body: req.body });
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { rating, comment } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Datos inválidos en rateStory', { errors: errors.array() });
      return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });
    }

    const story = await Storytelling.findById(id);
    if (!story) {
      logger.warn('Historia no encontrada para calificar', { storyId: id });
      return res.status(404).json({ success: false, message: 'Historia no encontrada' });
    }

    await story.addRating(userId, rating, comment);
    logger.info('rateStory completado', { storyId: id, rating });

    return res.status(200).json({
      success: true,
      message: 'Calificación guardada exitosamente',
      data: {
        averageRating: story.averageRating,
        totalRatings: story.totalRatings,
        userRating:    { rating, comment }
      }
    });
  } catch (error) {
    logger.error('Error calificando historia', { error: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Error calificando historia',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Obtiene las calificaciones de una historia.
 */
async function getRatings(req, res) {
  logger.info('→ getRatings inicio', { storyId: req.params.id });
  try {
    const { id } = req.params;
    const story  = await Storytelling.findById(id).populate('ratings.userId', 'name avatar');
    if (!story) {
      logger.warn('Historia no encontrada en getRatings', { storyId: id });
      return res.status(404).json({ success: false, message: 'Historia no encontrada' });
    }

    logger.info('getRatings completado', { storyId: id, totalRatings: story.ratings.length });
    return res.status(200).json({
      success: true,
      data: {
        averageRating: story.averageRating,
        totalRatings:  story.totalRatings,
        ratings:       story.ratings
      }
    });
  } catch (error) {
    logger.error('Error obteniendo calificaciones', { error: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo calificaciones',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Obtiene storytellings filtrados por rango de fechas.
 */
async function getStorytellingsByUserAndDateRange(req, res) {
  logger.info('→ getStorytellingsByUserAndDateRange inicio', { params: req.params });
  try {
    const { userId, fechaInicio, fechaFin } = req.params;
    if (!userId || !fechaInicio || !fechaFin) {
      logger.warn('Parámetros faltantes en getStorytellingsByUserAndDateRange', { params: req.params });
      return res.status(400).json({
        success: false,
        error: 'Los parámetros "id", "fechaInicio" y "fechaFin" son obligatorios en la URL (formato: YYYY-MM-DD)'
      });
    }

    const startDate = new Date(`${fechaInicio}T00:00:00.000Z`);
    const endDate   = new Date(`${fechaFin}T23:59:59.999Z`);
    if (isNaN(startDate) || isNaN(endDate)) {
      logger.warn('Formato de fecha inválido', { fechaInicio, fechaFin });
      return res.status(400).json({
        success: false,
        error: 'Formato de fecha inválido. Usa YYYY-MM-DD'
      });
    }

    const filters = {
      userId,
      createdAt: { $gte: startDate, $lte: endDate }
    };
    const items = await Storytelling.find(filters).sort({ createdAt: -1 });
    logger.info('getStorytellingsByUserAndDateRange completado', { count: items.length });

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (err) {
    logger.error('Error fetching storytelling items', { error: err.stack });
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

module.exports = {
  generateVideoStory,
  estimateProduction,
  getUserStories,
  getStory,
  updateStory,
  deleteStory,
  rateStory,
  getRatings,
  getStorytellingsByUserAndDateRange
};
