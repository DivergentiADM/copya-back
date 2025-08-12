const {Router} = require('express');
const {getContentIdeas,
  generateContentIdeas,
  updateContentIdea,
  deleteContentIdea,
  duplicateContentIdea,
  getContentIdeasByUser
  } = require('../controllers/contentController')
const { protect } = require('../middleware/auth');
const { optimizeIdea } = require('../controllers/postController');

const routerContent = Router();

// Get content statistics
routerContent.get('/content/stats/overview',protect, getContentIdeas);

routerContent.get('/ideas/:userId/:fechaInicio/:fechaFin',protect, getContentIdeasByUser);

// Generate AI-driven content
routerContent.post( '/ideas/generate',protect,   generateContentIdeas);

// Duplicate idea
routerContent.post( '/content/:ideaId/duplicate', protect,  duplicateContentIdea);

// Optimize for specific platform
routerContent.post('/content/:ideaId/optimize', protect, optimizeIdea);


// Routes for individual idea operations
routerContent.put('/content/:ideaId', protect,  updateContentIdea);

routerContent.delete('/content/:ideaId', protect, deleteContentIdea );

module.exports = routerContent;
