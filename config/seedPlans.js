// config/seedPlans.js
const Plan = require('../models/Plan');
const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const plans = [
  {
    name: 'Básico',
    price: {
      USD: 30,
      COP: 120000
    },
    buyerPersonas: '1 personalizado',
    agentesIA: '1 genérico + prueba especializado',
    creditsPerMonth: 1000,
    generacion: '3 ideas + 3 imágenes',
    modelosIA: '1 (OpenAI, Gemini o Anthropic)',
    guionesStorytelling: {
      included: 3,
      additional: 0
    },
    analytics: 'Básicas',
    colaboracion: 'Solo usuario',
    publicacion: 'Vista previa 9:16',
    customerSupportPerDay: 10,
    soporte: 'Webinar mensual',
    trialPeriodDays: 7,
    isActive: true
  },
  {
    name: 'Professional',
    price: {
      USD: 60,
      COP: 240000
    },
    buyerPersonas: '3 diferentes',
    agentesIA: 'Todos los especializados',
    creditsPerMonth: 2500,
    generacion: '3 ideas + 3 imágenes + variaciones',
    modelosIA: '2 simultáneos (ej: OpenAI + Gemini)',
    guionesStorytelling: {
      included: 3,
      additional: 5
    },
    analytics: 'Avanzadas + reportes',
    colaboracion: 'Hasta 3 usuarios',
    publicacion: 'Programación automática',
    customerSupportPerDay: 20,
    soporte: 'Webinars semanales + lives YouTube',
    trialPeriodDays: 7,
    isActive: true
  },
  {
    name: 'Enterprise',
    price: {
      USD: 99,
      COP: 396000
    },
    buyerPersonas: '5 con segmentación avanzada',
    agentesIA: 'Todos + CAG personalizado',
    creditsPerMonth: 5000,
    generacion: 'Generación en lotes + automatización',
    modelosIA: 'Todos los modelos disponibles',
    guionesStorytelling: {
      included: 3,
      additional: 15
    },
    analytics: 'Reportes exportables por segmentos',
    colaboracion: 'Equipos ilimitados + roles',
    publicacion: 'Instagram + LinkedIn diferenciado',
    customerSupportPerDay: 50,
    soporte: 'Todo anterior + onboarding 1:1',
    trialPeriodDays: 7,
    isActive: true
  }
];

const seedPlans = async () => {
  try {
    // Eliminar planes existentes
    await Plan.deleteMany({});
    console.log('Planes anteriores eliminados');
    
    // Insertar nuevos planes
    const createdPlans = await Plan.insertMany(plans);
    console.log('Planes creados:', createdPlans.map(plan => plan.name));
    
    console.log('Seeding completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding plans:', error);
    process.exit(1);
  }
};

seedPlans();