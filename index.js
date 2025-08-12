const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const logger = require('./utils/logger');
const connectDB = require('./config/database');
const firebaseConfig = require('./firebase/firebase');
const schedulerService = require('./services/schedulerService');

// Import routes
const index = require('./routes/index');

const app = express();

// Indica a Express que confíe en el primer proxy (ngrok) por el que pasa la solicitud.
app.set('trust proxy', 1);
// Initialize Firebase
try {
  if (firebaseConfig.isConfigured()) {
    firebaseConfig.initialize();
    console.log('🔥 Firebase inicializado correctamente');
  } else {
    console.warn('⚠️  Firebase no configurado - funcionando en modo de desarrollo');
  }
} catch (error) {
  console.error('❌ Error inicializando Firebase:', error.message);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Connect to database
connectDB().then(async () => {
  console.log('✅ Base de datos conectada');
  
  // Initialize scheduler service
  try {
    await schedulerService.initialize();
    console.log('✅ Scheduler service inicializado');
  } catch (error) {
    console.error('❌ Error inicializando scheduler:', error);
  }
}).catch(err => {
  console.error('❌ Error conectando a la base de datos:', err);
  process.exit(1);
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL
    ];

  

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS: Origin ${origin} not allowed`);
      callback(null, true); // Allow in development, restrict in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Firebase-Token'
  ]
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ 
  limit: process.env.MAX_FILE_SIZE || '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_FILE_SIZE || '10mb' 
}));


// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Request ID middleware for tracking
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});




// Routes

app.use('/api', index);


// Health check endpoint
app.get('/api/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    message: 'Content Automation API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: 'connected', // You could add actual DB health check here
      firebase: firebaseConfig.isConfigured() ? 'configured' : 'not_configured'
    }
  };

  res.status(200).json({
    success: true,
    data: healthCheck
  });
});


// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(`Error ${req.id}:`, err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field} ya existe`,
      field
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expirado'
    });
  }

  // Firebase errors
  if (err.code && err.code.startsWith('auth/')) {
    return res.status(401).json({
      success: false,
      message: 'Error de autenticación Firebase',
      code: err.code
    });
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    requestId: req.id,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err
    })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

const PORT = process.env.PORT 

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`n🚀 Servidor Copya ejecutándose en puerto ${PORT} en modo ${process.env.NODE_ENV}
  📱 API URL: http://localhost:${PORT}/api🔥 Firebase: ${firebaseConfig.isConfigured() ? 'Configurado' : 'No configurado'}n📊 Health Check: http://localhost:${PORT}/api/healthn${process.env.NODE_ENV === 'development' ? `📖 Docs: http://localhost:${PORT}/api/docs` : ''}n🔑 JWT_SECRET (first 5 chars): ${process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 5) : 'NOT_SET'}n`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Puerto ${PORT} ya está en uso`);
    process.exit(1);
  } else {
    console.error('❌ Error del servidor:', err);
    process.exit(1);
  }
});

module.exports = app;

