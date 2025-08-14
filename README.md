# Content Automation Backend

API completa para plataforma de automatización de contenido desarrollada con Node.js, Express y MongoDB. Integra múltiples servicios de inteligencia artificial para generar contenido, gestionar redes sociales y automatizar publicaciones.

## Descripción del Proyecto

Este backend proporciona una solución completa para la automatización de contenido digital, permitiendo a los usuarios generar contenido mediante IA, gestionar múltiples cuentas de redes sociales, programar publicaciones y manejar suscripciones de pago.

### Características Principales

- **Generación de Contenido con IA**: Integración con OpenAI GPT-4, Anthropic Claude y Google Gemini
- **Gestión de Redes Sociales**: Conecta y publica en Facebook, Instagram y LinkedIn
- **Programación de Publicaciones**: Sistema completo de scheduling
- **Generación de Imágenes**: Creación de imágenes usando IA
- **Sistema de Pagos**: Integración completa con MercadoPago
- **Autenticación Segura**: Firebase Authentication y JWT
- **Web Scraping**: Extracción automática de contenido web
- **Sistema de Suscripciones**: Planes con límites de uso y créditos

## Tecnologías Utilizadas

### Backend Core
- **Node.js** (>=18.0.0) - Runtime de JavaScript
- **Express.js** - Framework web
- **MongoDB** - Base de datos NoSQL
- **Mongoose** - ODM para MongoDB

### Autenticación y Seguridad
- **Firebase Admin SDK** - Autenticación
- **JSON Web Tokens (JWT)** - Manejo de sesiones
- **Helmet** - Headers de seguridad
- **CORS** - Control de acceso
- **Rate Limiting** - Limitación de requests

### Servicios de IA
- **OpenAI API** - Generación de texto e imágenes
- **Anthropic Claude** - Procesamiento de lenguaje natural
- **Google Gemini** - Modelos de IA de Google

### Servicios Externos
- **Firebase Storage** - Almacenamiento de archivos
- **MercadoPago API** - Procesamiento de pagos
- **Apify** - Web scraping
- **Social Media APIs** (Facebook, Instagram, LinkedIn)

### Desarrollo y Monitoreo
- **Winston** - Sistema de logging
- **Express Validator** - Validación de datos
- **Nodemon** - Desarrollo en tiempo real

## Requisitos del Sistema

### Requisitos Previos
- Node.js versión 18.0.0 o superior
- npm versión 9.0.0 o superior
- MongoDB (local o MongoDB Atlas)
- Cuenta activa de Firebase
- API Keys de los servicios de IA que desees utilizar

### Cuentas y Servicios Necesarios
- **Firebase Project** - Para autenticación y storage
- **MongoDB** - Base de datos (local o Atlas)
- **OpenAI Account** - Para GPT-4 y DALL-E (opcional)
- **Anthropic Account** - Para Claude (opcional)
- **Google Cloud** - Para Gemini API (opcional)
- **MercadoPago** - Para pagos (opcional)
- **Social Media Developer Accounts** - Facebook, LinkedIn (opcional)

## Instalación y Configuración

### Paso 1: Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd content_api_clean
```

### Paso 2: Instalar Dependencias

```bash
npm install
```

### Paso 3: Configuración de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto basado en `.env.example`:

```bash
cp .env.example .env
```

Edita el archivo `.env` con las siguientes configuraciones:

#### Configuración del Servidor
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/content-automation
JWT_SECRET=tu-clave-secreta-jwt-muy-segura-minimo-32-caracteres
```

#### Configuración de Firebase
Opción A - Usando archivo de credenciales:
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./ruta/a/firebase-adminsdk.json
```

Opción B - Variables individuales:
```env
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_PRIVATE_KEY_AQUI\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=tu-client-id
FIREBASE_PRIVATE_KEY_ID=tu-private-key-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40tu-proyecto.iam.gserviceaccount.com
```

#### APIs de Servicios de IA
```env
SYSTEM_OPENAI_API_KEY=sk-tu-clave-openai
ANTHROPIC_API_KEY=sk-ant-tu-clave-claude
GOOGLE_AI_API_KEY=AItu-clave-gemini
```

#### Redes Sociales
```env
FACEBOOK_APP_ID=tu-facebook-app-id
FACEBOOK_APP_SECRET=tu-facebook-app-secret
LINKEDIN_CLIENT_ID=tu-linkedin-client-id
LINKEDIN_CLIENT_SECRET=tu-linkedin-client-secret
```

#### Sistema de Pagos
```env
MERCADOPAGO_ACCESS_TOKEN=tu-token-mercadopago
MERCADOPAGO_PUBLIC_KEY=tu-public-key-mercadopago
MERCADOPAGO_WEBHOOK_SECRET=tu-webhook-secret
```

#### Web Scraping
```env
APIFY_API_TOKEN=tu-token-apify
APIFY_ACTOR_ID=tu-actor-id-apify
```

#### Seguridad y Rendimiento
```env
ENCRYPTION_KEY=tu-clave-encriptacion-32-caracteres
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=10mb
```

#### CORS
```env
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000,https://tudominio.com
```

### Paso 4: Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita Authentication y selecciona los proveedores que necesites
4. Ve a Configuración del Proyecto > Cuentas de Servicio
5. Genera una nueva clave privada y descarga el archivo JSON
6. Coloca el archivo en tu proyecto o usa las variables individuales

### Paso 5: Configurar MongoDB

#### Para MongoDB Local:
```bash
# Instalar MongoDB
# En Ubuntu/Debian:
sudo apt install mongodb

# Iniciar servicio
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Para MongoDB Atlas:
1. Ve a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crea un cluster gratuito
3. Configura un usuario de base de datos
4. Obtén la cadena de conexión
5. Reemplaza en `MONGODB_URI`

### Paso 6: Inicializar la Base de Datos

```bash
npm run seed:plans
```

Este comando creará los planes de suscripción iniciales en la base de datos.

## Ejecutar la Aplicación

### Modo Desarrollo
```bash
npm run dev
```
Esto iniciará el servidor con nodemon para recarga automática en el puerto 3000.

### Modo Producción
```bash
npm start
```

### Verificar la Instalación
Ve a `http://localhost:3000/api/health` para verificar que el servidor esté funcionando correctamente.

## Estructura del Proyecto

```
content_api_clean/
├── config/
│   ├── database.js          # Configuración de MongoDB
│   └── firebase.js          # Configuración de Firebase
├── controllers/
│   ├── adminController.js   # Gestión de administradores
│   ├── authController.js    # Autenticación
│   ├── chatController.js    # Sistema de chat con IA
│   ├── contentController.js # Generación de contenido
│   ├── imageController.js   # Generación de imágenes
│   ├── paymentController.js # Gestión de pagos
│   ├── planController.js    # Planes de suscripción
│   ├── postController.js    # Programación de posts
│   ├── scrapingController.js# Web scraping
│   ├── socialController.js  # Redes sociales
│   ├── storyController.js   # Storytelling
│   └── userController.js    # Gestión de usuarios
├── middleware/
│   ├── admin.js             # Middleware de administrador
│   ├── auth.js              # Middleware de autenticación
│   ├── rateLimiter.js       # Limitación de requests
│   └── validation.js        # Validación de datos
├── models/
│   ├── Admin.js             # Modelo de administradores
│   ├── ContentIdea.js       # Modelo de ideas de contenido
│   ├── Image.js             # Modelo de imágenes
│   ├── Payment.js           # Modelo de pagos
│   ├── Plan.js              # Modelo de planes
│   ├── Role.js              # Modelo de roles
│   ├── ScheduledPost.js     # Modelo de posts programados
│   ├── SocialAccount.js     # Modelo de cuentas sociales
│   ├── Story.js             # Modelo de historias
│   └── User.js              # Modelo de usuarios
├── routes/
│   └── [archivos-de-rutas]  # Definiciones de endpoints
├── services/
│   ├── providers/           # Proveedores de IA
│   ├── aiService.js         # Servicio principal de IA
│   ├── imageService.js      # Servicio de imágenes
│   ├── paymentService.js    # Servicio de pagos
│   ├── scrapingService.js   # Servicio de scraping
│   ├── socialMediaService.js# Servicio de redes sociales
│   └── storyService.js      # Servicio de storytelling
├── utils/
│   ├── encryption.js        # Utilidades de encriptación
│   ├── logger.js            # Sistema de logging
│   └── helpers.js           # Funciones auxiliares
├── firebase/
│   └── firebaseAuth.js      # Autenticación Firebase
├── logs/                    # Archivos de log
├── .env.example            # Plantilla de variables
├── index.js                # Punto de entrada
└── package.json            # Dependencias y scripts
```

## Descripción de Componentes

### Controladores (Controllers)
Los controladores manejan las peticiones HTTP y coordinan entre los servicios:

- **authController**: Maneja login, registro y autenticación
- **contentController**: Generación de ideas de contenido con IA
- **imageController**: Creación de imágenes usando servicios de IA
- **socialController**: Gestión de cuentas de redes sociales
- **postController**: Programación y publicación de contenido
- **paymentController**: Procesamiento de pagos y suscripciones

### Modelos (Models)
Definen la estructura de datos en MongoDB:

- **User**: Información del usuario, créditos y límites
- **Plan**: Planes de suscripción con características
- **ContentIdea**: Ideas de contenido generadas por IA
- **ScheduledPost**: Posts programados para publicación
- **SocialAccount**: Cuentas conectadas de redes sociales

### Servicios (Services)
Contienen la lógica de negocio y integraciones:

- **aiService**: Coordina entre diferentes proveedores de IA
- **socialMediaService**: Maneja publicaciones en redes sociales
- **paymentService**: Integración con MercadoPago
- **scrapingService**: Extracción de contenido web

### Middleware
Funciones que procesan las peticiones:

- **auth**: Verificación de tokens JWT
- **admin**: Verificación de permisos de administrador
- **rateLimiter**: Limitación de peticiones por IP
- **validation**: Validación de datos de entrada

## API Endpoints

### Autenticación
```
POST /api/firebase/authenticate    # Autenticar con Firebase
GET  /api/user/me                  # Obtener usuario actual
PUT  /api/user/me                  # Actualizar perfil
```

### Generación de Contenido
```
POST /api/content/ideas/generate   # Generar ideas de contenido
GET  /api/content/content/stats/overview # Estadísticas de contenido
PUT  /api/content/content/:ideaId  # Actualizar idea
DELETE /api/content/content/:ideaId # Eliminar idea
```

### Generación de Imágenes
```
POST /api/imagen/generate          # Generar imágenes con IA
GET  /api/imagen/:userId/:fechaInicio/:fechaFin # Obtener imágenes por fecha
PUT  /api/imagen/:id               # Actualizar imagen
DELETE /api/imagen/:imageId        # Eliminar imagen
```

### Redes Sociales
```
GET  /api/social/accounts          # Cuentas conectadas
POST /api/social/connect/:platform # Conectar cuenta
DELETE /api/social/disconnect/:platform # Desconectar cuenta
GET  /api/social/status            # Estado de conexiones
```

### Programación de Posts
```
GET  /api/posts/scheduled          # Posts programados
POST /api/posts/schedule           # Programar post
PUT  /api/posts/:id                # Actualizar post programado
DELETE /api/posts/:id              # Cancelar post
```

### Sistema de Pagos
```
GET  /api/payments/                # Historial de pagos
POST /api/payments/                # Crear preferencia de pago
POST /api/payments/webhook/mercadopago # Webhook de MercadoPago
```

### Planes de Suscripción
```
GET  /api/plans/                   # Obtener planes disponibles
POST /api/plans/                   # Crear plan (Admin)
PUT  /api/plans/:id                # Actualizar plan (Admin)
```

### Sistema de Chat
```
POST /api/chat/message             # Enviar mensaje al chat IA
GET  /api/chat/history             # Historial de conversación
```

## Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Iniciar con nodemon
npm run debug        # Iniciar con debugging

# Producción
npm start            # Iniciar servidor

# Base de datos
npm run seed:plans   # Inicializar planes
npm run migrate      # Ejecutar migraciones

# Testing
npm test             # Ejecutar tests
npm run test:watch   # Tests en modo watch
npm run test:coverage # Reporte de cobertura

# Calidad de código
npm run lint         # Verificar estilo
npm run lint:fix     # Corregir problemas de estilo

# Docker
npm run docker:build # Construir imagen
npm run docker:run   # Ejecutar contenedor
```

## Configuración de Servicios Externos

### Firebase Setup
1. Crear proyecto en Firebase Console
2. Habilitar Authentication
3. Configurar Storage (opcional)
4. Descargar credenciales de servicio
5. Configurar variables de entorno

### OpenAI Setup
1. Crear cuenta en platform.openai.com
2. Generar API key
3. Configurar límites de uso
4. Agregar key al archivo .env

### MercadoPago Setup
1. Crear cuenta de desarrollador
2. Obtener credenciales de producción/sandbox
3. Configurar webhook endpoint
4. Agregar credenciales al .env

### Configuración de Redes Sociales

#### Facebook/Instagram
1. Crear aplicación en developers.facebook.com
2. Configurar productos necesarios
3. Establecer URLs de callback
4. Obtener App ID y App Secret

#### LinkedIn
1. Crear aplicación en developer.linkedin.com
2. Configurar OAuth 2.0
3. Solicitar permisos necesarios
4. Obtener Client ID y Secret

## Sistema de Seguridad

### Autenticación
- Firebase Authentication para registro/login
- JWT tokens para mantener sesiones
- Refresh tokens para renovación automática

### Autorización
- Sistema de roles (usuario, admin)
- Middleware de verificación de permisos
- Control de acceso basado en suscripción

### Seguridad de API
- Rate limiting por IP
- Validación de entrada en todos los endpoints
- Headers de seguridad con Helmet
- CORS configurado para orígenes específicos
- Encriptación de API keys sensibles

## Sistema de Logging y Monitoreo

### Logging
- Winston para logging estructurado
- Diferentes niveles (error, warn, info, debug)
- Archivos separados para errores y logs generales
- Tracking de request ID para debugging

### Health Check
Endpoint `/api/health` que reporta:
- Estado del servidor
- Conexión a base de datos
- Configuración de Firebase
- Tiempo de actividad
- Versión de la aplicación

### Monitoreo de Errores
- Captura centralizada de errores
- Stack traces detallados
- Alertas automáticas en producción

## Deployment

### Variables de Entorno de Producción
Asegúrate de configurar todas las variables necesarias:
```env
NODE_ENV=production
JWT_SECRET=clave-super-segura-para-produccion
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/produccion
# ... resto de variables
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Vercel Deployment
1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Deploy automático desde main branch

### Checklist de Producción
-  Variables de entorno configuradas
-  Base de datos de producción lista
-  Firebase configurado para producción
-  SSL certificado instalado
-  Monitoreo configurado
-  Backups de base de datos programados
-  Rate limiting apropiado
-  Logs de producción configurados

## Troubleshooting

### Problemas Comunes

#### Error de Conexión a MongoDB
```bash
# Verificar que MongoDB esté corriendo
sudo systemctl status mongod

# Verificar cadena de conexión
echo $MONGODB_URI
```

#### Error de Autenticación Firebase
```bash
# Verificar que el archivo de credenciales existe
ls -la firebase-adminsdk.json

# Verificar variables de entorno
echo $FIREBASE_PROJECT_ID
```

#### Puerto en Uso
```bash
# Encontrar proceso usando el puerto
lsof -i :3000

# Terminar proceso
kill -9 <PID>
```

### Debug Mode
```bash
# Activar logs detallados
DEBUG=app:* npm run dev

# Logs específicos
DEBUG=app:auth,app:content npm run dev
```

## Contribución

### Guías de Desarrollo
1. Fork el repositorio
2. Crear rama para nueva funcionalidad
3. Seguir patrones de código existentes
4. Escribir tests para nuevas funciones
5. Actualizar documentación
6. Crear Pull Request

### Estándares de Código
- Usar nombres descriptivos para variables y funciones
- Comentar código complejo
- Mantener funciones pequeñas y específicas
- Seguir patrones de error handling existentes
- Validar todas las entradas de usuario

### Testing
- Escribir unit tests para nueva funcionalidad
- Tests de integración para endpoints
- Verificar cobertura de código
- Probar escenarios de error

