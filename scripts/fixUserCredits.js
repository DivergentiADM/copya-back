// scripts/fixUserCredits.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Plan = require('../models/Plan');
require('dotenv').config();

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const fixUserCredits = async () => {
  try {
    console.log('Buscando usuarios sin créditos asignados...');
    
    // Buscar usuarios sin plan y sin período de prueba activo
    const users = await User.find({
      $or: [
        { plan: { $exists: false } },
        { plan: null },
        { credits: { $exists: false } },
        { 'credits.total': 0 }
      ]
    });
    
    console.log(`Encontrados ${users.length} usuarios para corregir`);
    
    // Buscar el plan básico para obtener créditos de prueba
    const basicPlan = await Plan.findOne({ name: 'Básico' });
    const trialCredits = basicPlan ? basicPlan.creditsPerMonth : 100;
    
    let fixedCount = 0;
    
    for (const user of users) {
      try {
        // Si el usuario no tiene plan ni período de prueba, activar prueba
        if (!user.plan && !user.isTrialActive) {
          await user.activateTrial(7, trialCredits);
          console.log(`Activado período de prueba para usuario ${user.email} con ${trialCredits} créditos`);
          fixedCount++;
        } 
        // Si el usuario tiene plan pero créditos en cero, reiniciar créditos
        else if (user.plan && user.credits.total === 0) {
          const plan = await Plan.findById(user.plan);
          if (plan) {
            await user.resetCredits(plan.creditsPerMonth);
            console.log(`Asignados ${plan.creditsPerMonth} créditos al usuario ${user.email}`);
            fixedCount++;
          }
        }
      } catch (error) {
        console.error(`Error corrigiendo usuario ${user.email}:`, error.message);
      }
    }
    
    console.log(`Corregidos ${fixedCount} usuarios`);
    console.log('Finalizado el proceso de corrección de créditos');
    
    process.exit(0);
  } catch (error) {
    console.error('Error en el proceso de corrección:', error);
    process.exit(1);
  }
};

fixUserCredits();