const Router = require('express');
const { protect } = require('../middleware/auth');
const { 
  generateImage,
  getUserImages,
  getImageById,
  deleteImage,
  putUserImages,
  getUserStorageImages,

} = require('../controllers/imageController');

const routerImagen = Router();

// Rutas protegidas
routerImagen.use(protect);

// Rutas de información y configuración
routerImagen.get('/storage', getUserStorageImages);

// Rutas de generación de imágenes
routerImagen.post('/generate', generateImage);


// Rutas de gestión de imágenes
routerImagen.get('/:userId/:fechaInicio/:fechaFin', getUserImages);
routerImagen.put('/:id', putUserImages);
routerImagen.get('/:imageId', getImageById);
routerImagen.delete('/:imageId', deleteImage);

module.exports = routerImagen;