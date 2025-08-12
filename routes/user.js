const Router = require('express');

const { protect } = require('../middleware/auth');
const {getMe,getPreferences,updateMe,updatePreferences,getUserWithPopulatedFields} = require('../controllers/userController');

const routerUser = Router();

routerUser.get('/profile/:id', protect, getUserWithPopulatedFields);
routerUser.get('/me', protect, getMe);
routerUser.put('/me', protect, updateMe);
routerUser.get('/preferences', protect, getPreferences);
routerUser.put('/preferences', protect, updatePreferences);

module.exports = routerUser;