const { ApifyClient } = require("apify-client");

class ScrapingService {
  constructor() {
    this.client = new ApifyClient({
      token: process.env.APIFY_API_TOKEN,
    });
  }

  /**
   * Ejecuta un actor de Apify para extraer datos de una URL.
   * @param {string} startUrl - La URL desde la que se iniciará el scraping.
   * @param {string} actorId - El ID del actor de Apify a ejecutar.
   * @param {object} input - Objeto de entrada para el actor.
   * @returns {Promise<Array>} Los datos extraídos por el actor.
   */
  async scrapeWebsite(startUrl, actorId = process.env.APIFY_ACTOR_ID, input = {}) {
    if (!this.client.token) {
      throw new Error("APIFY_API_TOKEN no está configurado en las variables de entorno.");
    }
    if (!actorId) {
      throw new Error("APIFY_ACTOR_ID no está configurado o no se proporcionó.");
    }

    console.log(`Iniciando scraping de ${startUrl} con el actor ${actorId}...`);

    try {
      const run = await this.client.actor(actorId).call({
        startUrls: [{ url: startUrl }],
        ...input,
      });

      console.log(`Scraping completado. Run ID: ${run.id}`);

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
      console.log(`Datos extraídos: ${items.length} ítems.`);
      return items;
    } catch (error) {
      console.error("Error durante el scraping:", error);
      throw new Error(`Fallo en el scraping: ${error.message}`);
    }
  }

  /**
   * Extrae textos clave de los datos scrapeados.
   * Esta es una implementación básica y debería ser mejorada con IA para un análisis más profundo.
   * @param {Array} scrapedData - Datos obtenidos del scraping.
   * @returns {object} Un objeto con los textos clave extraídos.
   */
  extractKeyTexts(scrapedData) {
    let homeText = "";
    let productsText = "";
    let missionText = "";
    let benefitsText = "";
    let contactText = "";
    let aboutText = "";

    // Asumiendo que scrapedData es un array de objetos, donde cada objeto representa una página o sección.
    // Aquí se necesitaría una lógica más sofisticada para identificar y clasificar el contenido.
    // Por ejemplo, buscar por selectores CSS específicos, o usar IA para clasificar el texto.

    for (const item of scrapedData) {
      if (item.url && item.url.includes("home")) {
        homeText += item.text || "";
      }
      if (item.url && (item.url.includes("products") || item.url.includes("servicios"))) {
        productsText += item.text || "";
      }
      if (item.url && (item.url.includes("mission") || item.url.includes("mision"))) {
        missionText += item.text || "";
      }
      // Esto es muy básico, en un caso real se necesitaría más inteligencia
      if (item.text && (item.text.toLowerCase().includes("beneficios") || item.text.toLowerCase().includes("ventajas"))) {
        benefitsText += item.text || "";
      }
      if (item.url && (item.url.includes("contact") || item.url.includes("contacto"))) {
        contactText += item.text || "";
      }
      if (item.url && (item.url.includes("about") || item.url.includes("nosotros"))) {
        aboutText += item.text || "";
      }
      // Si no hay URL específica, agregar al texto general
      if (!item.url) {
        homeText += item.text || "";
      }
    }

    return {
      home: homeText.trim(),
      products: productsText.trim(),
      mission: missionText.trim(),
      benefits: benefitsText.trim(),
      contact: contactText.trim(),
      about: aboutText.trim(),
    };
  }
}

module.exports = new ScrapingService();

