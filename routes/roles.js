const {Router}= require('express');
const roleController = require('../controllers/roleController');


const routerRoles = Router();


routerRoles.post('/', roleController.createRole);
routerRoles.get('/', roleController.getRoles);

module.exports = routerRoles;
