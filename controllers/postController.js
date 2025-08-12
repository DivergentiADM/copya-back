const ScheduledPost = require('../models/ScheduledPost');
const mongoose = require('mongoose');

// Obtener todos los posts programados para el usuario autenticado
const getScheduledPosts = async (req, res) => {
  try {
    // Suponiendo que el ID de usuario está en req.user.id (del middleware de autenticación)
    const posts = await ScheduledPost.find({ userId: req.user.id }).sort({ publishAt: 1 });
    res.status(200).json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener los posts programados', error: error.message });
  }
};

// Programar un nuevo post
const schedulePost = async (req, res) => {
  try {
    const { content, publishAt, platforms, imageUrl } = req.body;
    if (!content || !publishAt || !platforms) {
      return res.status(400).json({ success: false, message: 'Faltan campos requeridos: content, publishAt, platforms.' });
    }

    const newPost = new ScheduledPost({
      userId: req.user.id,
      content,
      publishAt,
      platforms,
      imageUrl,
      status: 'scheduled'
    });

    await newPost.save();
    res.status(201).json({ success: true, data: newPost });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al programar el post', error: error.message });
  }
};

// Actualizar un post programado
const updateScheduledPost = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'ID de post inválido' });
    }

    const post = await ScheduledPost.findOneAndUpdate(
      { _id: id, userId: req.user.id }, // Asegura que el post pertenece al usuario
      updates,
      { new: true, runValidators: true }
    );

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post no encontrado o no tienes permiso para actualizarlo' });
    }

    res.status(200).json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar el post', error: error.message });
  }
};


// Eliminar un post programado
const deleteScheduledPost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'ID de post inválido' });
    }

    const post = await ScheduledPost.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post no encontrado o no tienes permiso para eliminarlo' });
    }

    res.status(200).json({ success: true, message: 'Post eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar el post', error: error.message });
  }
};
// Duplicar un post programado como una nueva idea de contenido
const duplicateContentIdea = async (req, res) => {
  try {
    const { id } = req.params;
    const { publishAt } = req.body; // Permite definir nueva fecha si se desea

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID de post inválido' });
    }

    // Buscar el post original
    const originalPost = await ScheduledPost.findOne({ _id: id, userId: req.user.id });

    if (!originalPost) {
      return res.status(404).json({ success: false, message: 'Post original no encontrado o no tienes permiso' });
    }

    // Crear el nuevo post duplicado
    const duplicatedPost = new ScheduledPost({
      userId: req.user.id,
      content: originalPost.content,
      publishAt: publishAt || new Date(Date.now() + 60 * 60 * 1000), // por defecto 1h después de ahora
      platforms: originalPost.platforms,
      imageUrl: originalPost.imageUrl,
      status: 'scheduled',
      // Puedes agregar campo opcional: originId: originalPost._id,
    });

    await duplicatedPost.save();

    res.status(201).json({ success: true, data: duplicatedPost });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al duplicar el post', error: error.message });
  }
};

// Optimizar un post programado usando IA
const optimizeIdea = async (req, res) => {
  try {
    const { id } = req.params;
    const { platform = 'instagram' } = req.body; // opcional, por defecto instagram

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID de post inválido' });
    }

    const post = await ScheduledPost.findOne({ _id: id, userId: req.user.id });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post no encontrado o no tienes permiso' });
    }

    // Llamada a tu servicio de IA para optimizar el contenido
    const optimized = await aiService.optimizeContentForPlatform(post.content, platform);

    // Guardamos el resultado en el documento
    post.optimizedContent = optimized; 
    // Opcional: podrías actualizar también post.content = optimized.text si quieres reemplazarlo
    await post.save();

    return res.status(200).json({
      success: true,
      data: {
        originalContent: post.content,
        optimizedContent: optimized
      }
    });
  } catch (error) {
    console.error('Error al optimizar el post:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al optimizar el post',
      error: error.message
    });
  }
};





module.exports = {
  getScheduledPosts,
  schedulePost,
  updateScheduledPost,
  deleteScheduledPost,
  duplicateContentIdea,
  optimizeIdea
};