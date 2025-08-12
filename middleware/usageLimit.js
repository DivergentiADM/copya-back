// middleware/usageLimit.js
const User = require('../models/User');
const Plan = require('../models/Plan');

const checkUsageLimit = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const operationType = req.body.operationType || req.query.operationType;
    
    // Obtener usuario con plan
    const user = await User.findById(userId).populate('plan');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }
    
    // Verificar si está en período de prueba
    if (user.isTrialPeriod()) {
      // Durante el período de prueba, verificar límites de prueba
      const hasLimit = user.checkUsageLimit(operationType);
      if (!hasLimit) {
        return res.status(403).json({ 
          success: false, 
          message: 'Has alcanzado el límite de tu período de prueba' 
        });
      }
      
      // Incrementar uso y continuar
      await user.incrementUsage(operationType);
      req.userCredits = user.credits;
      return next();
    }
    
    // Si no tiene plan activo
    if (!user.plan) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes un plan activo. Actualiza tu plan para continuar.' 
      });
    }
    
    // Verificar si el plan ha expirado
    if (user.planExpiresAt && new Date() > user.planExpiresAt) {
      return res.status(403).json({ 
        success: false, 
        message: 'Tu plan ha expirado. Renueva tu plan para continuar.' 
      });
    }
    
    // Verificar límites por tipo de operación
    const hasLimit = user.checkUsageLimit(operationType);
    if (!hasLimit) {
      return res.status(403).json({ 
        success: false, 
        message: 'Has alcanzado el límite de tu plan' 
      });
    }
    
    // Verificar créditos (si aplica)
    if (operationType === 'generations' || operationType === 'imageGenerations') {
      const creditsNeeded = operationType === 'generations' ? 1 : 2; // Imágenes cuestan más créditos
      if (!user.checkCreditBalance(creditsNeeded)) {
        return res.status(403).json({ 
          success: false, 
          message: 'No tienes suficientes créditos. Actualiza tu plan para obtener más.' 
        });
      }
      
      // Usar créditos
      await user.useCredits(creditsNeeded);
    }
    
    // Incrementar uso
    await user.incrementUsage(operationType);
    
    // Pasar información de créditos al siguiente middleware
    req.userCredits = user.credits;
    
    next();
  } catch (error) {
    console.error('Error checking usage limit:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error verificando límites de uso' 
    });
  }
};

// Middleware específico para verificación de créditos
const checkCredits = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const creditsNeeded = req.body.creditsNeeded || req.query.creditsNeeded || 1;
    
    const user = await User.findById(userId).populate('plan');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }
    
    // Verificar si está en período de prueba
    if (user.isTrialPeriod()) {
      // Permitir operaciones durante prueba
      req.userCredits = user.credits;
      return next();
    }
    
    // Si no tiene plan activo
    if (!user.plan) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes un plan activo' 
      });
    }
    
    // Verificar créditos
    if (!user.checkCreditBalance(creditsNeeded)) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes suficientes créditos' 
      });
    }
    
    // Usar créditos
    await user.useCredits(creditsNeeded);
    
    req.userCredits = user.credits;
    next();
  } catch (error) {
    console.error('Error checking credits:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error verificando créditos' 
    });
  }
};

module.exports = {
  checkUsageLimit,
  checkCredits
};