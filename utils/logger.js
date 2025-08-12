// utils/logger.js
const winston = require('winston');

// 1. Define niveles y colores personalizados
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'blue',
    http: 'magenta',
    debug: 'green',
  },
};

// 2. Agrega colores personalizados a Winston
winston.addColors(customLevels.colors);

// 3. Detecta si se puede escribir en el sistema de archivos
const isFileSystemWritable = process.env.NODE_ENV !== 'production' && !process.env.VERCEL;

// 4. Configura el array de transports
const transports = [];

// Transport para consola, ahora en formato JSON + colorize
transports.push(
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'debug',
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.metadata({ fillExcept: ['timestamp', 'level', 'message', 'label'] }),
      winston.format.printf(({ timestamp, level, message, metadata, stack }) => {
        const metaString = Object.keys(metadata).length
          ? ' ' + JSON.stringify(metadata)
          : '';
        if (stack) {
          return `${timestamp} ${level}: ${message}${metaString}\n${stack}`;
        }
        return `${timestamp} ${level}: ${message}${metaString}`;
      })
    )
  })
);

// Transportes para archivo (solo si es posible escribir en disco)
if (isFileSystemWritable) {
  const path = require('path');
  const fs = require('fs');

  const logDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    })
  );
}

// 5. Crear el logger con configuración completa
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || 'debug',
  defaultMeta: { service: 'copya-api' },
  transports
});

module.exports = logger;
