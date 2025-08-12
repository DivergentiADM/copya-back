const {Router} = require('express');

const {
  generateVideoStory,
  getUserStories,
  getStory,
  updateStory,
  deleteStory,
  rateStory,
  getRatings,
  getStorytellingsByUserAndDateRange} = require('../controllers/storytellingController');
const { protect } = require('../middleware/auth');
const { body } = require('express-validator');

// Validation rules
const validateVideoStory = [
  body('content').isString().isLength({ min: 10, max: 1000 }).trim(),
  body('platform').optional().isIn(['instagram', 'tiktok', 'youtube', 'facebook', 'linkedin']),
  body('format').optional().isString(),
  body('duration').optional().isInt({ min: 5, max: 300 }),
  body('lighting').optional().isIn(['natural', 'professional', 'dramatic', 'soft']),
  body('style').optional().isIn(['professional', 'casual', 'dramatic', 'minimal', 'vibrant', 'vintage']),
  body('targetAudience').optional().isString(),
  body('businessContext').optional().isObject(),
  body('provider').optional().isIn(['gemini', 'claude', 'openai'])
];



const validateRating = [
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().isString().isLength({ max: 500 }).trim()
];

const routerStorytelling = Router();
// Routes
routerStorytelling.post('/generate', protect, validateVideoStory, generateVideoStory);



// New routes for managing stored stories
routerStorytelling.get('/storiesByUser/:userId/:fechaInicio/:fechaFin', protect, getStorytellingsByUserAndDateRange);
routerStorytelling.get('/stories', protect, getUserStories);
routerStorytelling.get('/stories/:id', protect, getStory);
routerStorytelling.put('/stories/:id', protect, updateStory);
routerStorytelling.delete('/stories/:id', protect, deleteStory);

// Rating routes
routerStorytelling.post('/stories/:id/rate', protect, validateRating, rateStory);
routerStorytelling.get('/stories/:id/ratings', protect, getRatings);

module.exports = routerStorytelling;