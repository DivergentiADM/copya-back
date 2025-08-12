// middleware/trialActivation.js
const User = require('../models/User');
const Plan = require('../models/Plan');

const activateTrial = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Obtener usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }
    
    // Verificar si el usuario ya tiene un plan activo o período de prueba
    if (user.plan || user.isTrialActive) {
      return next();
    }
    
    // Buscar el plan básico para obtener los días de prueba
    const basicPlan = await Plan.findOne({ name: 'Básico' });
    const trialDays = basicPlan ? basicPlan.trialPeriodDays : 7;
    
    // Activar período de prueba
    await user.activateTrial(trialDays);
    
    // Asignar créditos de prueba (100 créditos para probar la plataforma)
    await user.resetCredits(100);
    
    console.log(`Período de prueba activado para usuario ${userId} con ${100} créditos`);
    
    next();
  } catch (error) {
    console.error('Error activating trial:', error);
    next();
  }
};

module.exports = {
  activateTrial
};