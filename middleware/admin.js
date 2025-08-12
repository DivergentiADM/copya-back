
const User = require('../models/User');

const admin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Not an admin.' });
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

module.exports = admin;
