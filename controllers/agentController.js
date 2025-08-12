const Agent = require('../models/Agent');
const User = require('../models/User');

// @desc    Create an agent
// @route   POST /api/agents
// @access  Private
const createAgent = async (req, res) => {
  try {
    const {
      name,
      agentType,
      professionalProfile,
      communicationStyle,
      technicalExpertise,
      promptInfo,
      status,
    } = req.body;

    const agentData = {
      user: req.user.id,
      name,
      agentType,
      professionalProfile,
      communicationStyle,
      technicalExpertise,
      promptInfo,
      status,
      avatar: req.body.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=150`
    };

    const agent = await Agent.create(agentData);

    res.status(201).json({ success: true, data: agent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all agents for a user
// @route   GET /api/agents
// @access  Private
const getAgents = async (req, res) => {
  try {
    const agents = await Agent.find({ user: req.user.id });
    res.status(200).json({ success: true, data: agents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
const getAllAgents = async (req, res) => {
  try {
    // Si quieres limitar campos sensibles, puedes usar `.select(...)`
    const agents = await Agent.find().lean();

    if (!agents || agents.length === 0) {
      return res.status(404).json({ success: false, message: 'No se encontraron agentes' });
    }

    res.status(200).json({ success: true, data: agents });
  } catch (error) {
    console.error('Error al obtener los agentes:', error);
    res.status(500).json({ success: false, message: 'Error del servidor', error: error.message });
  }
};

// @desc    Get a single agent
// @route   GET /api/agents/:id
// @access  Private
const getAgent = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id)
      .populate('agenteID'); // nombre del campo en tu schema

    if (!user || !user.agenteID) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    // Devolver solo el agente
    res.status(200).json({ success: true, data: [user.agenteID] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};



// @desc    Update an agent
// @route   PUT /api/agents/:id
// @access  Private
const updateAgent = async (req, res) => {
  try {
    const agent = await Agent.findOne({ _id: req.params.id, user: req.user.id });

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const updatedAgent = await Agent.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: updatedAgent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete an agent
// @route   DELETE /api/agents/:id
// @access  Private
const deleteAgent = async (req, res) => {
  try {
    const agent = await Agent.findOneAndDelete({ _id: req.params.id, user: req.user.id });

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllAgents,
  createAgent,
  getAgents,
  getAgent,
  updateAgent,
  deleteAgent
};
