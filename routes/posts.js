
const {Router}= require('express');


const {getScheduledPosts,schedulePost,deleteScheduledPost,updateScheduledPost} = require('../controllers/postController');
const { protect } = require('../middleware/auth'); // Importa el middleware de protección


const postRouter= Router();
// GET /api/posts/scheduled - Obtener todos los posts programados del usuario
postRouter.get('/scheduled', protect, getScheduledPosts);

// POST /api/posts/schedule - Programar un nuevo post
postRouter.post('/schedule', protect, schedulePost);

// PUT /api/posts/:id - Actualizar un post programado
postRouter.put('/:id', protect, updateScheduledPost);

// DELETE /api/posts/:id - Eliminar un post programado
postRouter.delete('/:id', protect,   deleteScheduledPost);

module.exports = postRouter;