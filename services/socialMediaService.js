// services/socialMediaService.js

const FacebookService = require('./FacebookService');
const LinkedInService = require('./LinkedInService');
const InstagramService = require('./InstagramService')
class SocialMediaService {
  constructor() {
    // Instancia los servicios específicos de cada plataforma
    this.instagramService = new InstagramService();
    this.facebookService = new FacebookService();
    this.linkedinService = new LinkedInService();
  }

  /**
   * Genera la URL de autorización para una plataforma.
   */
  generateAuthUrl(platform, userId) {
    const redirectUri = `${process.env.BASE_URL}/api/social/connect/${platform}/callback`; 
    
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    let authUrl;

    switch (platform) {
      case 'instagram':
         authUrl = this.instagramService.getAuthorizationUrl(platform, redirectUri);
        break;
      case 'facebook':
        authUrl = this.facebookService.getAuthorizationUrl(platform, redirectUri);
        break;
      case 'linkedin':
        authUrl = this.linkedinService.getAuthorizationUrl(redirectUri);
        break;
      default:
        throw new Error(`Plataforma no soportada: ${platform}`);
    }
    return `${authUrl}&state=${encodeURIComponent(state)}`;
  }

  /**
   * Intercambia el código de autorización por un token de acceso.
   */
  exchangeCodeForTokens(platform, code) {
    const redirectUri = `${process.env.BASE_URL}/api/social/connect/${platform}/callback`; 
    
    switch (platform) {
      case 'instagram':
        return this.instagramService.exchangeCode(code, redirectUri);
      case 'facebook':
        return this.facebookService.exchangeCode(code, redirectUri);
      case 'linkedin':
        return this.linkedinService.exchangeCode(code, redirectUri);
      default:
        throw new Error(`Plataforma no soportada: ${platform}`);
    }
  }

  /**
   * Publica contenido en la plataforma especificada.
   */
  publish(platform, accessToken, accountId, content) {
    switch (platform) {
      case 'facebook':
        // accountId para Facebook es el ID de la página
        return this.facebookService.publishToFacebook(accessToken, accountId, content);
      case 'instagram':
        // accountId para Instagram es el ID de la cuenta de Instagram Business
        return this.facebookService.publishToInstagram(accessToken, accountId, content);
      case 'linkedin':
        // accountId para LinkedIn es el URN de la persona (ej: 'abCDeF123')
        return this.linkedinService.publish(accessToken, accountId, content);
      default:
        throw new Error(`Plataforma no soportada: ${platform}`);
    }
  }

  /**
   * Obtiene las métricas de una publicación.
   */
  getPostMetrics(platform, accessToken, postId) {
    switch (platform) {
      case 'instagram':
      case 'facebook':
        return this.facebookService.getPostMetrics(platform, accessToken, postId);
      case 'linkedin':
        return this.linkedinService.getPostMetrics(accessToken, postId);
      default:
        throw new Error(`Métricas no soportadas para ${platform}`);
    }
  }

  // Puedes añadir más métodos fachada si los necesitas, como verifyToken, schedulePost, etc.
}

// Exporta una única instancia del servicio (Singleton Pattern)
module.exports = new SocialMediaService();