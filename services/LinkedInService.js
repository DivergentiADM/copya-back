// services/linkedinService.js

class LinkedInService {
  constructor() {
    this.baseUrl = 'https://api.linkedin.com/v2';
    this.clientId = process.env.LINKEDIN_CLIENT_ID;
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    // CAMBIO: Se usan los nuevos scopes de OpenID Connect.
    this.requiredScopes = ['openid', 'profile', 'email'];
  }

  /**
   * Construye la URL de autorización de LinkedIn.
   * La lógica interna no cambia, pero usa los nuevos scopes.
   */
  getAuthorizationUrl(redirectUri) {
    const scopes = this.requiredScopes.join('%20');
    return `https://www.linkedin.com/oauth/v2/authorization?client_id=${this.clientId}` +
           `&response_type=code` +
           `&redirect_uri=${encodeURIComponent(redirectUri)}` +
           `&scope=${scopes}`;
  }

  /**
   * Intercambia un código de autorización por un token de acceso.
   * Ahora también solicita la información del usuario con el nuevo flujo.
   */
  async exchangeCode(code, redirectUri) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret
    });

    const resp = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    const tokenData = await resp.json();
    if (!resp.ok) {
      console.error('Error al intercambiar el código de LinkedIn:', tokenData);
      throw new Error(tokenData.error_description || 'Error al intercambiar código de LinkedIn');
    }

    const { access_token, expires_in, id_token } = tokenData;

    // CAMBIO CLAVE: Usamos el access_token para llamar al nuevo endpoint /userinfo
    // en lugar del antiguo /me.
    const user = await this.getUserInfo(access_token);
    
    // El id_token es un JWT que también contiene la info del usuario.
    // Podrías decodificarlo y validarlo si quisieras evitar la llamada a /userinfo,
    // pero llamar a ese endpoint es más sencillo y está recomendado.
    console.log("ID Token recibido (JWT):", id_token);

    return {
      accessToken: access_token,
      refreshToken: null,
      expiresAt: new Date(Date.now() + expires_in * 1000),
      user, // El objeto user ya viene formateado desde getUserInfo
      pages: [] 
    };
  }

  /**
   * NUEVO MÉTODO (REFACTORIZADO): Obtiene la información del perfil del usuario usando el endpoint de OIDC.
   */
  async getUserInfo(accessToken) {
    const userResp = await fetch(`${this.baseUrl}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const userData = await userResp.json();
    if (!userResp.ok) {
      throw new Error(userData.message || 'Error al obtener userinfo de LinkedIn');
    }
    
    // Transformamos la respuesta para que sea consistente con lo que espera el resto de tu app.
    // El 'sub' (subject) es el ID de usuario único y persistente.
    return {
        id: userData.sub,
        name: userData.name,
        givenName: userData.given_name,
        familyName: userData.family_name,
        picture: userData.picture,
        email: userData.email,
        emailVerified: userData.email_verified,
        locale: userData.locale
    };
  }

  /**
   * Publica contenido en LinkedIn.
   */
  async publish(accessToken, personUrn, content) {
    const { text, imageUrl } = content;
    const postData = {
      author: `urn:li:person:${personUrn}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: imageUrl ? 'IMAGE' : 'NONE'
        }
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
    };
    
    if (imageUrl) {
      postData.specificContent['com.linkedin.ugc.ShareContent'].media = [{
        status: 'READY',
        description: { text: 'Imagen compartida' },
        originalUrl: imageUrl,
        title: { text: 'Publicación' }
      }];
    }

    const resp = await fetch(`${this.baseUrl}/ugcPosts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(postData)
    });

    if (!resp.ok) {
      const errorData = await resp.json();
      throw new Error(errorData.message || 'Error al publicar en LinkedIn');
    }

    return { success: true, platform: 'linkedin', postId: resp.headers.get('x-restli-id'), publishedAt: new Date() };
  }

  /**
   * Obtiene métricas (placeholder para LinkedIn).
   */
  async getPostMetrics(accessToken, postId) {
    return { platform: 'linkedin', postId, metrics: { note: 'LinkedIn metrics require additional permissions and a more complex API flow.' } };
  }
}

module.exports = LinkedInService;