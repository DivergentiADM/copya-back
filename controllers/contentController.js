const ContentIdea = require('../models/ContentIdea');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const {generateContentIdeasOpenAi} = require('../services/ideasContenido/openAIServicesIdea');
const {generateContentIdeasGemini} = require('../services/ideasContenido/geminiAiServicesIdea');
const logger = require('../utils/logger');
const Agent = require('../models/Agent');
const { checkUsageLimit } = require('../middleware/usageLimit');
// Obtener todas las ideas de contenido del usuario
const getContentIdeas = async (req, res) => {
  try {
    const userId = req.user._id;

    const {
      page = 1,
      limit = 9,
      category,
      status,
      platform,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filters = { userId };
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (platform) filters.platforms = { $in: [platform] };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [ideas, totalCount] = await Promise.all([
      ContentIdea.find(filters)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'name businessInfo'),
      ContentIdea.countDocuments(filters)
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.status(200).json({
      success: true,
      data: {
        ideas,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo ideas de contenido:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
};

const getContentIdea = async (req, res) => {
  try {
    const { ideaId } = req.params;
    const userId = req.user._id;

    const idea = await ContentIdea.findOne({ _id: ideaId, userId })
      .populate('userId', 'name businessInfo');

    if (!idea) return res.status(404).json({ success: false, message: 'Idea de contenido no encontrada' });

    res.status(200).json({ success: true, data: { idea } });
  } catch (error) {
    console.error('Error obteniendo idea de contenido:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
};
const generateContentIdeas = async (req, res) => {
  logger.info('Generating content ideas', {
    topic: req.body.topic,
    provider: req.body.proveedor
  });

  try {
    const userId = req.user._id;
    const { proveedor, topic, count = 3, platforms = ['instagram'] } = req.body;

    logger.info('Request body received', { proveedor, topic, count, platforms });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    if (!proveedor || !topic) {
      return res.status(400).json({
        success: false,
        message: 'El proveedor y el topic son obligatorios.'
      });
    }

    // Verificar límites de uso antes de generar contenido
    const user = await User.findById(userId).populate('plan');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si el usuario tiene suficientes créditos
    const creditsNeeded = count; // 1 crédito por idea de contenido
    if (!user.checkCreditBalance(creditsNeeded)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes suficientes créditos para generar este contenido. Actualiza tu plan para obtener más.'
      });
    }

    // Verificar límites de uso
    const hasLimit = user.checkUsageLimit('generations');
    if (!hasLimit) {
      return res.status(403).json({
        success: false,
        message: 'Has alcanzado el límite de generaciones de contenido de tu plan.'
      });
    }

    const agent = await Agent.findById(user.agenteID);
    const agentStyle = agent?.communicationStyle || {};
    logger.info('User and agentStyle retrieved', { userId, agentStyle });

    // Parámetros comunes para los servicios
    const serviceParams = {
      user,
      agentStyle,
      count: Math.min(count, 3),
      customPrompt: topic,
      platforms,
      contentTypes: user.preferences.contentTypes
    };
    logger.info('Parameters being passed to AI service', serviceParams);

    // Llamada al servicio correspondiente
    let generatedIdeas;
    switch (proveedor.toLowerCase()) {
      case 'openai':
        generatedIdeas = await generateContentIdeasOpenAi(serviceParams);
        break;
      
      case 'gemini':
        generatedIdeas = await generateContentIdeasGemini(serviceParams);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Proveedor de IA no válido. Use openai, claude o gemini.'
        });
    }

    logger.debug('Generated ideas from service', { generatedIdeas });

    // Guardar cada idea en la base de datos
    const savedIdeas = [];
    for (const ideaData of generatedIdeas) {
      const ideaDoc = new ContentIdea({
        userId,
        ...ideaData,
        platforms,
        generationData: {
          aiModel: proveedor.toLowerCase(),
          prompt: topic,
          temperature: ideaData.temperature ?? 0.7,
          generatedAt: new Date()
        }
      });
      const saved = await ideaDoc.save();
      savedIdeas.push(saved);
    }

    // Incrementar uso y usar créditos
    await user.incrementUsage('generations', count);
    await user.useCredits(creditsNeeded);

    const ideasToReturn = savedIdeas.map(doc => doc.toObject({ virtuals: true }));

    return res.status(201).json({
      success: true,
      message: `${savedIdeas.length} ideas generadas exitosamente con ${proveedor}`,
      data: { ideas: ideasToReturn },
      credits: {
        total: user.credits.total,
        used: user.credits.used + creditsNeeded,
        remaining: user.credits.total - user.credits.used - creditsNeeded
      }
    });

  } catch (error) {
    logger.error('Error generating content ideas', {
      message: error.message,
      stack: error.stack,
      userId: req.user._id,
      provider: req.body.proveedor
    });
    return res.status(500).json({
      success: false,
      message: 'Error generando contenido',
      error: error.message
    });
  }
};



const updateContentIdea = async (req, res) => {
  try {
    const { ideaId } = req.params;
    const userId = req.user._id;
    const updateData = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });

    const idea = await ContentIdea.findOneAndUpdate(
      { _id: ideaId, userId },
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!idea) return res.status(404).json({ success: false, message: 'Idea no encontrada' });

    res.status(200).json({ success: true, message: 'Idea actualizada', data: { idea } });
  } catch (error) {
    console.error('Error actualizando idea:', error);
    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
};

const deleteContentIdea = async (req, res) => {
  try {
    const { ideaId } = req.params;
    const userId = req.user._id;

    const idea = await ContentIdea.findOneAndDelete({ _id: ideaId, userId });

    if (!idea) return res.status(404).json({ success: false, message: 'Idea no encontrada' });

    res.status(200).json({ success: true, message: 'Idea eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando idea:', error);
    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
};

const duplicateContentIdea = async (req, res) => {
  try {
    const { ideaId } = req.params;
    const userId = req.user._id;

    const originalIdea = await ContentIdea.findOne({ _id: ideaId, userId });
    if (!originalIdea) return res.status(404).json({ success: false, message: 'Idea no encontrada' });

    const duplicatedIdea = new ContentIdea({
      userId,
      title: `${originalIdea.title} (Copia)`,
      content: originalIdea.content,
      hashtags: [...originalIdea.hashtags],
      category: originalIdea.category,
      platforms: [...originalIdea.platforms],
      platformContent: { ...originalIdea.platformContent },
      status: 'draft',
      generationData: { aiModel: 'manual', generatedAt: new Date() }
    });

    const savedIdea = await duplicatedIdea.save();

    res.status(201).json({ success: true, message: 'Idea duplicada', data: { idea: savedIdea } });
  } catch (error) {
    console.error('Error duplicando idea:', error);
    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
};

const getContentStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await ContentIdea.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalIdeas: { $sum: 1 },
          draftIdeas: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
          approvedIdeas: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          publishedIdeas: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
          usedIdeas: { $sum: { $cond: ['$isUsed', 1, 0] } },
          totalEngagement: { $sum: { $add: ['$metrics.likes', '$metrics.comments', '$metrics.shares'] } }
        }
      }
    ]);

    const categoryStats = await ContentIdea.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgEngagement: { $avg: { $add: ['$metrics.likes', '$metrics.comments', '$metrics.shares'] } }
        }
      }
    ]);

    const platformStats = await ContentIdea.aggregate([
      { $match: { userId } },
      { $unwind: '$platforms' },
      {
        $group: {
          _id: '$platforms',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {
          totalIdeas: 0,
          draftIdeas: 0,
          approvedIdeas: 0,
          publishedIdeas: 0,
          usedIdeas: 0,
          totalEngagement: 0
        },
        byCategory: categoryStats,
        byPlatform: platformStats
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
};

const optimizeForPlatform = async (req, res) => {
  try {
    const { ideaId } = req.params;
    const { platform } = req.body;
    const userId = req.user._id;

    const idea = await ContentIdea.findOne({ _id: ideaId, userId });
    if (!idea) return res.status(404).json({ success: false, message: 'Idea no encontrada' });

    const optimizedContent = await ideasService.optimizeContentForPlatform({
      content: idea.content,
      platform,
      hashtags: idea.hashtags,
      category: idea.category
    });

    idea.platformContent = idea.platformContent || {};
    idea.platformContent[platform] = optimizedContent;
    await idea.save();

    res.status(200).json({ success: true, message: `Contenido optimizado para ${platform}`, data: { idea, optimizedContent } });
  } catch (error) {
    console.error('Error optimizando contenido:', error);
    res.status(500).json({ success: false, message: 'Error optimizando contenido', error: error.message });
  }
};

const generateImageForIdea = async (req, res) => {
  try {
    const { ideaId } = req.params;
    const userId = req.user._id;

    const idea = await ContentIdea.findOne({ _id: ideaId, userId });
    if (!idea) return res.status(404).json({ success: false, message: 'Idea no encontrada' });

    const user = await User.findById(userId).populate('preferences.selectedAgent');

    const imageData = await imageService.generateImage({
      businessInfo: user.businessInfo,
      buyerPersona: user.businessInfo.buyerPersona
    });

    idea.media = idea.media || [];
    idea.media.push({ type: 'image', url: imageData.url, alt: idea.title, generated: true, generationTime: imageData.generationTime });
    await idea.save();

    const populatedIdea = await ContentIdea.findById(idea._id).populate('userId', 'name businessInfo');

    res.status(200).json({ success: true, message: 'Imagen generada exitosamente', data: { idea: populatedIdea } });
  } catch (error) {
    console.error('Error generando imagen:', error);
    res.status(500).json({ success: false, message: 'Error generando la imagen', error: error.message });
  }
};



// Obtener ideas de contenido por userId con filtros opcionales
const getContentIdeasByUser = async (req, res) => {
  try {
    const {userId, fechaInicio, fechaFin } = req.params;
       

    // Validación obligatoria de todos los parámetros
    if (!userId || !fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        error: 'Los parámetros "id", "fechaInicio" y "fechaFin" son obligatorios en la URL'
      });
    }

    const filters = {
      userId,
      createdAt: {
        $gte: new Date(`${fechaInicio}T00:00:00.000Z`),
        $lte: new Date(`${fechaFin}T23:59:59.999Z`)
      }
    };

    const ideas = await ContentIdea.find(filters)
      .sort({ createdAt: -1 }); // Orden más reciente primero

    res.status(200).json({
      success: true,
      count: ideas.length,
      data: ideas
    });

  } catch (error) {
    console.error('Error fetching content ideas:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};






module.exports = {
  getContentIdeas,
  getContentIdea,
  generateContentIdeas,
  updateContentIdea,
  deleteContentIdea,
  duplicateContentIdea,
  getContentStats,
  optimizeForPlatform,
  generateImageForIdea,
  getContentIdeasByUser
};
