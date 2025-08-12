const Router = require('express');
const { protect } = require('../middleware/auth');

const {
  createAgent,
  getAgents,
  getAgent,
  updateAgent,
  deleteAgent,
  getAllAgents
} = require('../controllers/agentController');


const routerAgent = Router();


routerAgent.get('/all',protect, getAllAgents);
routerAgent.post('/',createAgent);
routerAgent.get('/', getAgents)
routerAgent.get('/:id', getAgent)
routerAgent.put('/', updateAgent)
routerAgent.delete('/', deleteAgent);

module.exports = routerAgent;
