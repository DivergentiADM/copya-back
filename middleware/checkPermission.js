const User = require('../models/User');
const Plan = require('../models/Plan');

const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ msg: 'No autenticado, no se puede verificar el permiso' });
      }

      const user = await User.findById(req.user.id).populate('plan');

      if (!user || !user.plan) {
        return res.status(403).json({ msg: 'Usuario o plan no encontrado' });
      }

      // Verificar si el plan ha expirado
      if (user.planExpiresAt && user.planExpiresAt < new Date()) {
        return res.status(403).json({ msg: 'Tu plan ha expirado. Por favor, actualiza tu suscripción.' });
      }

      const hasPermission = user.plan.permissions.includes(requiredPermission);

      if (hasPermission) {
        next();
      } else {
        return res.status(403).json({ msg: 'Acceso denegado. Permisos insuficientes.' });
      }
    } catch (error) {
      console.error('Error en el middleware de permisos:', error);
      res.status(500).send('Error del servidor al verificar permisos');
    }
  };
};

module.exports = checkPermission;
