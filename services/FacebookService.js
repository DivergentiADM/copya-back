// services/facebookService.js

class FacebookService {
  constructor() {
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    this.appId = process.env.FACEBOOK_APP_ID;
    this.appSecret = process.env.FACEBOOK_APP_SECRET;
    this.scopes = [
      'pages_manage_posts',
      'pages_show_list',
      'publish_to_groups',
      'email'
    ];
  }

  // URL de autorización de Facebook
  getAuthorizationUrl(redirectUri) {
    const scopes = this.scopes.join(',');
    return `https://www.facebook.com/v18.0/dialog/oauth` +
           `?client_id=${this.appId}` +
           `&redirect_uri=${encodeURIComponent(redirectUri)}` +
           `&scope=${scopes}` +
           `&response_type=code`;
  }

  // Intercambia código por token largo
  async exchangeCode(code, redirectUri) {
    // 1. Obtener token corto
    const params1 = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: redirectUri,
      code
    });
    const resp1 = await fetch(`${this.baseUrl}/oauth/access_token?${params1}`);
    const data1 = await resp1.json();
    if (!resp1.ok) throw new Error(data1.error?.message);

    const shortToken = data1.access_token;

    // 2. Token largo
    const params2 = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: shortToken
    });
    const resp2 = await fetch(`${this.baseUrl}/oauth/access_token?${params2}`);
    const data2 = await resp2.json();
    if (!resp2.ok) throw new Error(data2.error?.message);

    const longToken = data2.access_token;
    const expiresIn = data2.expires_in;

    // 3. Info de cuenta
    const accountInfo = await this.getAccountInfo(longToken);

    return {
      accessToken: longToken,
      refreshToken: null,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      ...accountInfo
    };
  }

  // Info de usuario y páginas asociadas
  async getAccountInfo(accessToken) {
    const userResp = await fetch(`${this.baseUrl}/me?access_token=${accessToken}&fields=id,name,email`);
    const user = await userResp.json();
    if (!userResp.ok) throw new Error(user.error?.message);

    const pagesResp = await fetch(`${this.baseUrl}/me/accounts?access_token=${accessToken}`);
    const pages = await pagesResp.json();
    if (!pagesResp.ok) throw new Error(pages.error?.message);

    return { user, pages: pages.data || [] };
  }

  // Publicar en Facebook
  async publishToFacebook(accessToken, pageId, content) {
    const { text, imageUrl, link } = content;
    const postData = { message: text, access_token: accessToken };
    if (imageUrl || link) postData.link = imageUrl || link;

    const resp = await fetch(`${this.baseUrl}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData)
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message);
    return { success: true, platform: 'facebook', postId: data.id, publishedAt: new Date() };
  }

  // Métricas de publicación de Facebook
  async getPostMetrics(accessToken, postId) {
    const fields = 'id,message,created_time,likes.summary(true),comments.summary(true),shares';
    const resp = await fetch(`${this.baseUrl}/${postId}?access_token=${accessToken}&fields=${fields}`);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message);
    return { platform: 'facebook', postId, metrics: data };
  }
}

module.exports = FacebookService;
