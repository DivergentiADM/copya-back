const cron = require('node-cron');
const ScheduledPost = require('../models/ScheduledPost');
const User = require('../models/User');
const socialMediaService = require('./socialMediaService');

class SchedulerService {
  constructor() {
    this.activeTasks = new Map();
    this.isInitialized = false;
  }

  /**
   * Inicializa el servicio de programación
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⏰ Scheduler ya está inicializado');
      return;
    }

    try {
      console.log('⏰ Inicializando Scheduler Service...');

      // Programar tareas recurrentes
      this.scheduleRecurringTasks();

      // Cargar publicaciones programadas existentes
      await this.loadScheduledPosts();

      // Programar generación automática de contenido mensual
      this.scheduleMonthlyContentGeneration();

      this.isInitialized = true;
      console.log('✅ Scheduler Service inicializado correctamente');

    } catch (error) {
      console.error('❌ Error inicializando Scheduler Service:', error);
      throw error;
    }
  }

  /**
   * Programa tareas recurrentes del sistema
   * @private
   */
  scheduleRecurringTasks() {
    // Verificar publicaciones programadas cada 5 minutos
    const checkScheduledPosts = cron.schedule('*/5 * * * *', async () => {
      await this.checkAndExecuteScheduledPosts();
    }, {
      scheduled: false,
      timezone: 'America/Mexico_City'
    });

    // Limpiar publicaciones completadas cada día a medianoche
    const cleanupPosts = cron.schedule('0 0 * * *', async () => {
      await this.cleanupCompletedPosts();
    }, {
      scheduled: false,
      timezone: 'America/Mexico_City'
    });

    // Generar reportes semanales los lunes a las 9 AM
    const weeklyReports = cron.schedule('0 9 * * 1', async () => {
      await this.generateWeeklyReports();
    }, {
      scheduled: false,
      timezone: 'America/Mexico_City'
    });

    // Iniciar todas las tareas
    checkScheduledPosts.start();
    cleanupPosts.start();
    weeklyReports.start();

    this.activeTasks.set('checkScheduledPosts', checkScheduledPosts);
    this.activeTasks.set('cleanupPosts', cleanupPosts);
    this.activeTasks.set('weeklyReports', weeklyReports);

    console.log('⏰ Tareas recurrentes programadas');
  }

  /**
   * Programa la generación automática de contenido mensual
   * @private
   */
  scheduleMonthlyContentGeneration() {
    // Generar contenido mensual el día 1 de cada mes a las 6 AM
    const monthlyGeneration = cron.schedule('0 6 1 * *', async () => {
      await this.generateMonthlyContentForAllUsers();
    }, {
      scheduled: false,
      timezone: 'America/Mexico_City'
    });

    monthlyGeneration.start();
    this.activeTasks.set('monthlyGeneration', monthlyGeneration);

    console.log('📅 Generación mensual de contenido programada');
  }

  /**
   * Carga publicaciones programadas existentes al iniciar
   * @private
   */
  async loadScheduledPosts() {
    try {
      const scheduledPosts = await ScheduledPost.find({
        status: 'scheduled',
        scheduledDate: { $gte: new Date() }
      });

      console.log(`📋 Cargadas ${scheduledPosts.length} publicaciones programadas`);

      // Programar cada publicación individual
      for (const post of scheduledPosts) {
        await this.scheduleIndividualPost(post);
      }

    } catch (error) {
      console.error('Error cargando publicaciones programadas:', error);
    }
  }

  /**
   * Programa una publicación individual
   * @param {object} scheduledPost - Publicación programada
   */
  async scheduleIndividualPost(scheduledPost) {
    try {
      const now = new Date();
      const scheduledTime = new Date(scheduledPost.scheduledDate);

      if (scheduledTime <= now) {
        // Si la fecha ya pasó, ejecutar inmediatamente
        await this.executeScheduledPost(scheduledPost._id);
        return;
      }

      // Calcular tiempo hasta la ejecución
      const delay = scheduledTime.getTime() - now.getTime();

      // Programar la ejecución
      const timeout = setTimeout(async () => {
        await this.executeScheduledPost(scheduledPost._id);
        this.activeTasks.delete(`post_${scheduledPost._id}`);
      }, delay);

      this.activeTasks.set(`post_${scheduledPost._id}`, timeout);

      console.log(`⏰ Publicación programada para ${scheduledTime.toLocaleString()}: ${scheduledPost.title}`);

    } catch (error) {
      console.error(`Error programando publicación ${scheduledPost._id}:`, error);
    }
  }

  /**
   * Verifica y ejecuta publicaciones programadas
   * @private
   */
  async checkAndExecuteScheduledPosts() {
    try {
      const now = new Date();
      const postsToExecute = await ScheduledPost.find({
        status: 'scheduled',
        scheduledDate: { $lte: now }
      });

      for (const post of postsToExecute) {
        await this.executeScheduledPost(post._id);
      }

    } catch (error) {
      console.error('Error verificando publicaciones programadas:', error);
    }
  }

  /**
   * Ejecuta una publicación programada
   * @param {string} postId - ID de la publicación
   */
  async executeScheduledPost(postId) {
    try {
      const scheduledPost = await ScheduledPost.findById(postId).populate('userId');
      
      if (!scheduledPost || scheduledPost.status !== 'scheduled') {
        console.log(`⚠️ Publicación ${postId} no encontrada o ya ejecutada`);
        return;
      }

      console.log(`🚀 Ejecutando publicación: ${scheduledPost.title}`);

      // Marcar como en proceso
      scheduledPost.status = 'publishing';
      scheduledPost.executionStarted = new Date();
      await scheduledPost.save();

      // Obtener información de la cuenta social
      const user = scheduledPost.userId;
      const socialAccount = user.socialAccounts?.find(
        account => account.platform === scheduledPost.platform
      );

      if (!socialAccount || !socialAccount.isActive) {
        throw new Error(`Cuenta de ${scheduledPost.platform} no encontrada o inactiva`);
      }

      // Preparar contenido para publicación
      const content = {
        text: scheduledPost.content,
        imageUrl: scheduledPost.media?.imageUrl,
        link: scheduledPost.media?.link
      };

      // Publicar en la plataforma correspondiente
      let publishResult;
      switch (scheduledPost.platform) {
        case 'instagram':
          publishResult = await socialMediaService.publishToInstagram(
            socialAccount.accessToken,
            socialAccount.accountId,
            content
          );
          break;

        case 'facebook':
          publishResult = await socialMediaService.publishToFacebook(
            socialAccount.accessToken,
            socialAccount.accountId,
            content
          );
          break;

        case 'linkedin':
          publishResult = await socialMediaService.publishToLinkedIn(
            socialAccount.accessToken,
            socialAccount.accountId,
            content
          );
          break;

        default:
          throw new Error(`Plataforma no soportada: ${scheduledPost.platform}`);
      }

      // Actualizar estado de la publicación
      scheduledPost.status = 'published';
      scheduledPost.publishedAt = new Date();
      scheduledPost.platformPostId = publishResult.postId;
      scheduledPost.publishResult = publishResult;
      await scheduledPost.save();

      // Actualizar estadísticas del usuario
      await this.updateUserPublishingStats(user, scheduledPost.platform);

      console.log(`✅ Publicación ejecutada exitosamente: ${scheduledPost.title}`);

    } catch (error) {
      console.error(`❌ Error ejecutando publicación ${postId}:`, error);

      // Marcar como fallida
      try {
        await ScheduledPost.findByIdAndUpdate(postId, {
          status: 'failed',
          error: error.message,
          failedAt: new Date()
        });
      } catch (updateError) {
        console.error('Error actualizando estado de publicación fallida:', updateError);
      }
    }
  }

  /**
   * Programa una nueva publicación
   * @param {object} postData - Datos de la publicación
   * @returns {object} Publicación programada
   */
  async schedulePost(postData) {
    try {
      const {
        userId,
        title,
        content,
        platform,
        scheduledDate,
        media = {},
        metadata = {}
      } = postData;

      // Validar fecha programada
      const scheduledTime = new Date(scheduledDate);
      const now = new Date();

      if (scheduledTime <= now) {
        throw new Error('La fecha programada debe ser en el futuro');
      }

      // Crear publicación programada
      const scheduledPost = new ScheduledPost({
        userId,
        title,
        content,
        platform,
        scheduledDate: scheduledTime,
        media,
        metadata,
        status: 'scheduled',
        createdAt: new Date()
      });

      await scheduledPost.save();

      // Programar la ejecución
      await this.scheduleIndividualPost(scheduledPost);

      console.log(`📅 Nueva publicación programada: ${title} para ${scheduledTime.toLocaleString()}`);

      return scheduledPost;

    } catch (error) {
      console.error('Error programando publicación:', error);
      throw new Error(`Error programando publicación: ${error.message}`);
    }
  }

  /**
   * Cancela una publicación programada
   * @param {string} postId - ID de la publicación
   */
  async cancelScheduledPost(postId) {
    try {
      const scheduledPost = await ScheduledPost.findById(postId);
      
      if (!scheduledPost) {
        throw new Error('Publicación no encontrada');
      }

      if (scheduledPost.status !== 'scheduled') {
        throw new Error(`No se puede cancelar una publicación con estado: ${scheduledPost.status}`);
      }

      // Cancelar la tarea programada
      const taskKey = `post_${postId}`;
      if (this.activeTasks.has(taskKey)) {
        clearTimeout(this.activeTasks.get(taskKey));
        this.activeTasks.delete(taskKey);
      }

      // Actualizar estado
      scheduledPost.status = 'cancelled';
      scheduledPost.cancelledAt = new Date();
      await scheduledPost.save();

      console.log(`❌ Publicación cancelada: ${scheduledPost.title}`);

      return scheduledPost;

    } catch (error) {
      console.error('Error cancelando publicación:', error);
      throw new Error(`Error cancelando publicación: ${error.message}`);
    }
  }

  /**
   * Obtiene publicaciones programadas de un usuario
   * @param {string} userId - ID del usuario
   * @param {object} filters - Filtros opcionales
   * @returns {Array} Publicaciones programadas
   */
  async getUserScheduledPosts(userId, filters = {}) {
    try {
      const {
        status = null,
        platform = null,
        startDate = null,
        endDate = null,
        limit = 50
      } = filters;

      const query = { userId };

      if (status) {
        query.status = status;
      }

      if (platform) {
        query.platform = platform;
      }

      if (startDate || endDate) {
        query.scheduledDate = {};
        if (startDate) query.scheduledDate.$gte = new Date(startDate);
        if (endDate) query.scheduledDate.$lte = new Date(endDate);
      }

      const posts = await ScheduledPost.find(query)
        .sort({ scheduledDate: 1 })
        .limit(limit);

      return posts;

    } catch (error) {
      console.error('Error obteniendo publicaciones programadas:', error);
      throw new Error(`Error obteniendo publicaciones: ${error.message}`);
    }
  }

  /**
   * Genera contenido mensual para todos los usuarios
   * @private
   */
  async generateMonthlyContentForAllUsers() {
    try {
      console.log('📅 Iniciando generación mensual de contenido para todos los usuarios...');

      // Obtener usuarios activos con plan básico
      const users = await User.find({
        'subscription.plan': 'basic',
        'subscription.status': 'active',
        'businessInfo.buyerPersona': { $exists: true }
      });

      console.log(`👥 Encontrados ${users.length} usuarios elegibles`);

      let successCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          const result = await contentGenerationService.generateMonthlyContent(user);
          
          if (result.success) {
            successCount++;
            console.log(`✅ Contenido generado para usuario ${user.email}`);
          }

        } catch (error) {
          errorCount++;
          console.error(`❌ Error generando contenido para usuario ${user.email}:`, error.message);
        }
      }

      console.log(`📊 Generación mensual completada: ${successCount} éxitos, ${errorCount} errores`);

    } catch (error) {
      console.error('Error en generación mensual automática:', error);
    }
  }

  /**
   * Limpia publicaciones completadas antiguas
   * @private
   */
  async cleanupCompletedPosts() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await ScheduledPost.deleteMany({
        status: { $in: ['published', 'failed', 'cancelled'] },
        $or: [
          { publishedAt: { $lt: thirtyDaysAgo } },
          { failedAt: { $lt: thirtyDaysAgo } },
          { cancelledAt: { $lt: thirtyDaysAgo } }
        ]
      });

      console.log(`🧹 Limpieza completada: ${result.deletedCount} publicaciones eliminadas`);

    } catch (error) {
      console.error('Error en limpieza de publicaciones:', error);
    }
  }

  /**
   * Genera reportes semanales
   * @private
   */
  async generateWeeklyReports() {
    try {
      console.log('📊 Generando reportes semanales...');

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Estadísticas de publicaciones de la semana
      const weeklyStats = await ScheduledPost.aggregate([
        {
          $match: {
            createdAt: { $gte: oneWeekAgo }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      console.log('📈 Estadísticas semanales:', weeklyStats);

      // Aquí se podría enviar el reporte por email o guardarlo en la base de datos

    } catch (error) {
      console.error('Error generando reportes semanales:', error);
    }
  }

  /**
   * Actualiza estadísticas de publicación del usuario
   * @private
   */
  async updateUserPublishingStats(user, platform) {
    try {
      if (!user.stats) {
        user.stats = {};
      }
      if (!user.stats.publishing) {
        user.stats.publishing = {};
      }

      // Incrementar contador total
      user.stats.totalPublishedPosts = (user.stats.totalPublishedPosts || 0) + 1;

      // Incrementar contador por plataforma
      user.stats.publishing[platform] = (user.stats.publishing[platform] || 0) + 1;

      // Actualizar última publicación
      user.stats.lastPublishedAt = new Date();

      await user.save();

    } catch (error) {
      console.error('Error actualizando estadísticas de usuario:', error);
    }
  }

  /**
   * Obtiene estadísticas del scheduler
   * @returns {object} Estadísticas
   */
  async getSchedulerStats() {
    try {
      const stats = {
        activeTasks: this.activeTasks.size,
        scheduledPosts: await ScheduledPost.countDocuments({ status: 'scheduled' }),
        publishedToday: await ScheduledPost.countDocuments({
          status: 'published',
          publishedAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }),
        failedToday: await ScheduledPost.countDocuments({
          status: 'failed',
          failedAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }),
        isInitialized: this.isInitialized
      };

      return stats;

    } catch (error) {
      console.error('Error obteniendo estadísticas del scheduler:', error);
      return {
        error: error.message,
        isInitialized: this.isInitialized
      };
    }
  }

  /**
   * Detiene el servicio de programación
   */
  async shutdown() {
    try {
      console.log('⏰ Deteniendo Scheduler Service...');

      // Cancelar todas las tareas activas
      for (const [key, task] of this.activeTasks) {
        if (typeof task.destroy === 'function') {
          task.destroy(); // Para tareas cron
        } else {
          clearTimeout(task); // Para timeouts
        }
      }

      this.activeTasks.clear();
      this.isInitialized = false;

      console.log('✅ Scheduler Service detenido correctamente');

    } catch (error) {
      console.error('❌ Error deteniendo Scheduler Service:', error);
    }
  }
}

module.exports = new SchedulerService();

