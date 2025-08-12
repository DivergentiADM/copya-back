// services/instagramService.js

class InstagramService {
  constructor() {
    this.baseUrl = 'https://graph.facebook.com/v22.0';
    this.appId = process.env.INSTAGRAM_CLIENT_ID;
    this.appSecret = process.env.INSTAGRAM_CLIENT_SECRET;
    this.scopes = [
      'instagram_basic',
      'instagram_content_publish',
      'pages_show_list',
      'business_management'
    ];
  }

  // URL de autorización de Instagram
  getAuthorizationUrl() {
 
    return `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=1922499995218741&redirect_uri=https://poweredia-copya-api.vercel.app/api/social/connect/instagram/callback&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights`;
  }

  // Intercambia código por token largo
 async exchangeCode(code, redirectUri) {
  // 1. Obtener token corto desde endpoint de Instagram
  const params1 = new URLSearchParams({
    client_id: this.appId,
    client_secret: this.appSecret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code
  });

  const resp1 = await fetch(`https://api.instagram.com/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params1
  });
  const data1 = await resp1.json();

  
  // --- CÓDIGO MÁS ROBUSTO ---
  // Verifica el estado de la respuesta Y que el token exista.
  if (!resp1.ok || !data1.access_token) {
    // Usa el mensaje de error de la API si existe, si no, un mensaje genérico.
    const errorMessage = data1.error_message || data1.error?.message || 'Error al obtener el token de corta duración de Instagram.';
    throw new Error(errorMessage);
  }

  const shortToken = data1.access_token;

  // 2. Obtener token largo vía Graph API
  const params2 = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: this.appSecret,
    access_token: shortToken
  });

  // El endpoint para intercambiar tokens es graph.instagram.com
  const resp2 = await fetch(`https://graph.instagram.com/access_token?${params2}`);
  const data2 = await resp2.json();
    
  if (!resp2.ok) {
    const errorMessage = data2.error?.message || 'Error al intercambiar por un token de larga duración.';
    throw new Error(errorMessage);
  }

  const longToken = data2.access_token;
  const expiresIn = data2.expires_in;

  // 3. Info de cuenta IG Business
  const accountInfo = await this.getAccountInfo(longToken);

  return {
    accessToken: longToken,
    refreshToken: null,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    ...accountInfo
  };
}

  // Info de usuario y cuenta IG Business conectada
  async getAccountInfo(longToken) {
    console.log(longToken);
    
    const resp = await fetch(`${this.baseUrl}/me/accounts?access_token=${longToken}`);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message);

    const page = (data.data || []).find(p => p.connected_instagram_account);
    if (!page) throw new Error('No se encontró cuenta de Instagram conectada');

    return {
      user: { id: page.id, name: page.name },
      instagramBusinessAccountId: page.connected_instagram_account.id
    };
  }

  // Publicar en Instagram Business
  async publishToInstagram(accessToken, instagramBusinessAccountId, content) {
    const { text, imageUrl } = content;

    // Crear contenedor de media
    const containerResp = await fetch(`${this.baseUrl}/${instagramBusinessAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: text,
        access_token: accessToken
      })
    });
    const containerData = await containerResp.json();
    if (!containerResp.ok) throw new Error(containerData.error?.message);

    // Publicar contenedor
    const publishResp = await fetch(`${this.baseUrl}/${instagramBusinessAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerData.id,
        access_token: accessToken
      })
    });
    const publishData = await publishResp.json();
    if (!publishResp.ok) throw new Error(publishData.error?.message);

    return {
      success: true,
      platform: 'instagram',
      postId: publishData.id,
      publishedAt: new Date()
    };
  }

  // Métricas de publicación de Instagram
  async getPostMetrics(accessToken, postId) {
    const fields = 'id,media_type,media_url,permalink,timestamp,like_count,comments_count';
    const resp = await fetch(`${this.baseUrl}/${postId}?access_token=${accessToken}&fields=${fields}`);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message);
    return { platform: 'instagram', postId, metrics: data };
  }
}

module.exports = InstagramService;
