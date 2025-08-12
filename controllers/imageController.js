const Image = require('../models/Image');
const ContentIdea = require('../models/ContentIdea');
const imageGenerationService = require('../services/imageGenerationService');
const logger = require('../utils/logger');
const User = require('../models/User');


const generateImage = async (req, res) => {
  try {
    const { provider, userId, topic, aspectRatio } = req.body;
    logger.debug(`${topic},${userId},${aspectRatio},${provider}`);
    
    if (!topic) {
      return res.status(400).json({
        error: 'El parámetro "topic" es obligatorio.'
      });
    }

    // Verificar límites de uso antes de generar imagen
    const user = await User.findById(userId).populate('plan');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si el usuario tiene suficientes créditos (imágenes cuestan 2 créditos)
    const creditsNeeded = 2;
    if (!user.checkCreditBalance(creditsNeeded)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes suficientes créditos para generar esta imagen. Actualiza tu plan para obtener más.'
      });
    }

    // Verificar límites de uso para generación de imágenes
    const hasLimit = user.checkUsageLimit('imageGenerations');
    if (!hasLimit) {
      return res.status(403).json({
        success: false,
        message: 'Has alcanzado el límite de generación de imágenes de tu plan.'
      });
    }

    const { imageId, imageUrl } = await imageGenerationService.generateImage({
      provider,
      userId,
      topic,
      aspectRatio,
     });

    // Incrementar uso y usar créditos
    await user.incrementUsage('imageGenerations');
    await user.useCredits(creditsNeeded);

    return res.status(201).json({
      message: 'Imagen generada y guardada correctamente',
      imageId,
      imageUrl,
      topic,
      aspectRatio,
      credits: {
        total: user.credits.total,
        used: user.credits.used + creditsNeeded,
        remaining: user.credits.total - user.credits.used - creditsNeeded
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({
      error: err.message || 'Error interno al generar la imagen.'
    });
  }
};


const putUserImages = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'El campo imageUrl es requerido' });
    }

    const updatedIdea = await ContentIdea.findByIdAndUpdate(
      id,
      { imageUrl },
      { new: true } // Devuelve el documento actualizado
    );

    if (!updatedIdea) {
      return res.status(404).json({ error: 'ContentIdea no encontrado' });
    }

    res.json({
      message: 'Imagen actualizada con éxito',
      data: updatedIdea
    });
  } catch (error) {
    console.error('Error actualizando imagen:', error);
    res.status(500).json({ error: 'Error actualizando imagen' });
  }
};



async function getUserImages(req, res) {
  try {
    const { userId, fechaInicio, fechaFin } = req.params; // Recibe todo por params
     const filters = {
      userId,
      createdAt: {
        $gte: new Date(`${fechaInicio}T00:00:00.000Z`),
        $lte: new Date(`${fechaFin}T23:59:59.999Z`)
      }
    };

    const images = await Image.find(filters).sort({ createdAt: -1 });
    const total = await Image.countDocuments(filters);

    res.json({
      success: true,
      data: {
        images,
        total
      }
    });

  } catch (error) {
    logger.error('Error getting user images:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get images'
    });
  }
}

module.exports = getUserImages;



async function getImageById(req, res) {
  try {
    const { imageId } = req.params;
    const userId = req.user.id;

    const image = await Image.findOne({ _id: imageId, userId })
      .populate('agentId', 'name imagePrompt')
      .populate('contentIdeaId', 'title category');

    if (!image) return res.status(404).json({ success: false, message: 'Image not found' });

    res.json({ success: true, data: { image } });

  } catch (error) {
    logger.error('Error getting image:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to get image' });
  }
}

async function deleteImage(req, res) {
  try {
    const { imageId } = req.params;
    const userId = req.user.id;

    const image = await Image.findOneAndDelete({ _id: imageId, userId });
    if (!image) return res.status(404).json({ success: false, message: 'Image not found' });

    if (image.contentIdeaId) {
      await ContentIdea.updateOne(
        { _id: image.contentIdeaId },
        { $pull: { 'media.imageId': image._id } }
      );
    }

    res.json({ success: true, message: 'Image deleted successfully' });

  } catch (error) {
    logger.error('Error deleting image:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete image' });
  }
}


async function getUserStorageImages(req, res) {
  try {
    const userId = req.user.id;
    const { folder = 'generated-images' } = req.query;

    const images = await imageGenerationService.getUserImagesFromStorage(userId, { folder });

    res.json({
      success: true,
      data: {
        images,
        count: images.length
      }
    });

  } catch (error) {
    logger.error('Error getting user storage images:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to get storage images' });
  }
}



module.exports = {
  putUserImages,
  generateImage,
  getUserImages,
  getImageById,
  deleteImage,
  getUserStorageImages,

};
