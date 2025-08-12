const {Router}  = require('express');

const {authenticateWithFirebase} = require('../firebase/firebaseAuthController');

const routerFirebase = Router();


routerFirebase.post('/authenticate', authenticateWithFirebase);

module.exports = routerFirebase;