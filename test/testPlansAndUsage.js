// test/testPlansAndUsage.js
const mongoose = require('mongoose');
const Plan = require('../models/Plan');
const User = require('../models/User');
require('dotenv').config();

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const testPlansAndUsage = async () => {
  try {
    console.log('Testing plans and usage tracking...');
    
    // Obtener un rol de prueba (necesitamos crear un rol básico para el test)
    // Por ahora, simplemente probaremos la lógica de planes y créditos
    
    // Obtener planes
    const plans = await Plan.find({});
    console.log('Available plans:', plans.map(p => `${p.name} - ${p.creditsPerMonth} credits`));
    
    // Probar la estructura de un plan
    const basicPlan = plans.find(p => p.name === 'Básico');
    if (basicPlan) {
      console.log(`\n${basicPlan.name} Plan Details:`);
      console.log(`- Price: $${basicPlan.price.USD} USD`);
      console.log(`- Credits per month: ${basicPlan.creditsPerMonth}`);
      console.log(`- Buyer Personas: ${basicPlan.buyerPersonas}`);
      console.log(`- AI Agents: ${basicPlan.agentesIA}`);
      console.log(`- Generation: ${basicPlan.generacion}`);
      console.log(`- AI Models: ${basicPlan.modelosIA}`);
      console.log(`- Storytelling Scripts: ${basicPlan.guionesStorytelling.included} included, ${basicPlan.guionesStorytelling.additional} additional`);
      console.log(`- Analytics: ${basicPlan.analytics}`);
      console.log(`- Collaboration: ${basicPlan.colaboracion}`);
      console.log(`- Publishing: ${basicPlan.publicacion}`);
      console.log(`- Customer Support: ${basicPlan.customerSupportPerDay} queries per day`);
      console.log(`- Support: ${basicPlan.soporte}`);
      console.log(`- Trial Period: ${basicPlan.trialPeriodDays} days`);
    }
    
    console.log('\nTest completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
};

testPlansAndUsage();