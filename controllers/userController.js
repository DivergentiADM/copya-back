const User = require('../models/User');

const getMe = async (req, res) => {
  try {
  const user = await User.findById(req.user.id).select('-password');
  res.status(200).json({ success: true, data: { user } });   
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateMe = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
res.status(200).json({ success: true, data: { user } });   
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}


const getUserWithPopulatedFields = async (req, res) => {
  try {
    const userId = req.params.id;

    // Incluimos '+password' porque por defecto password viene con select: false
    const user = await User.findById(userId)
      .select('+password')
      .populate('agenteID')           // Agente asignado
      .populate('role')                // Rol
      .populate('plan')                // Plan
      .populate('socialAccounts')      // Virtual
      .populate('agents');             // Virtual

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Creamos la variable buyerPersona con los campos solicitados
    const buyerPersona = {
      name:           user.name,
      email:          user.email,
      password:       user.password,       // ahora disponible gracias a .select('+password')
      emailVerified:  user.emailVerified,
      businessInfo: {
        name:           user.businessInfo?.name,
        industry:       user.businessInfo?.industry,
        description:    user.businessInfo?.description,
        bio:            user.businessInfo?.bio,
        targetAudience: user.businessInfo?.targetAudience,
        website:        user.businessInfo?.website,
        logo:           user.businessInfo?.logo,
        brandColors:    user.businessInfo?.brandColors,
        referencias:    user.businessInfo?.referencias,
        competenciaDirecta: user.businessInfo?.competenciaDirecta
      },
      preferences: {
        publishingDays: user.preferences?.publishingDays,
        publishingTime: user.preferences?.publishingTime,
        timezone:       user.preferences?.timezone,
        contentTypes:   user.preferences?.contentTypes,
        notifications:  user.preferences?.notifications
      }
    };

    // Devolvemos tanto el documento completo como el buyerPersona
    res.status(200).json({ 
      user,
      buyerPersona
    });

  } catch (err) {
    console.error('Error al obtener usuario:', err);
    res.status(500).json({ message: 'Error al obtener el usuario' });
  }
};




const getPreferences = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Initialize preferences if doesn't exist
    if (!user.preferences) {
      user.preferences = {};
    }

    res.json({ success: true, data: user.preferences });
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const updatePreferences = async (req, res) => {
  try {
    const { selectedAgent, theme, language, notifications, timezone, ...otherPreferences } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Initialize preferences if doesn't exist
    if (!user.preferences) {
      user.preferences = {};
    }

    // Update provided preferences
    if (selectedAgent !== undefined) {
      user.preferences.selectedAgent = selectedAgent;
    }
    if (theme !== undefined) {
      user.preferences.theme = theme;
    }
    if (language !== undefined) {
      user.preferences.language = language;
    }
    if (notifications !== undefined) {
      user.preferences.notifications = notifications;
    }
    if (timezone !== undefined) {
      user.preferences.timezone = timezone;
    }

    // Handle any additional preferences
    Object.keys(otherPreferences).forEach(key => {
      user.preferences[key] = otherPreferences[key];
    });

    await user.save();

    res.json({ success: true, data: user.preferences });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

module.exports  = {
  getMe,
  updateMe,
  getPreferences,
  updatePreferences,
  getUserWithPopulatedFields

}