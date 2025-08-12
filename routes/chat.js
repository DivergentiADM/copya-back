// routes/chat.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { processChatMessage, getChatHistory } = require('../controllers/chatController');

// Protected routes
router.use(protect);

// Process chat message
router.post('/message', processChatMessage);

// Get chat history
router.get('/history', getChatHistory);

module.exports = router;