const Router = require('express');


const { getPlans, createPlan,updatePlan } = require('../controllers/planController');

const pĺanRoter = Router()

pĺanRoter.get('/', getPlans)
pĺanRoter.post('/',createPlan);
pĺanRoter.put('/:id',updatePlan);

module.exports = pĺanRoter;