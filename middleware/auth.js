const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await User.findById(decoded.userId).select('-password');

      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authorized, user not found' });
      }

      // Activar período de prueba si es la primera vez que el usuario inicia sesión
      if (!req.user.plan && !req.user.isTrialActive && !req.user.trialStartedAt) {
        try {
          // Asignar período de prueba de 7 días con 100 créditos
          await req.user.activateTrial(7, 100);
          console.log(`Período de prueba activado para usuario ${req.user._id}`);
        } catch (trialError) {
          console.error('Error activando período de prueba:', trialError);
        }
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ success: false, error: 'Not authorized' });
    }
  }

  if (!token) {
    res.status(401).json({ success: false, error: 'Not authorized, no token' });
  }
};

module.exports = { protect };