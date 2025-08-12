// services/geminiServiceImagen.js
import { GoogleGenAI, Modality } from "@google/genai";
import logger from "../../utils/logger.js";
import { OpenAI } from "openai";

// Prompt base para la generación de imagen
const SYSTEM_IMAGE_PROMPT = `Eres un experto artista visual especializado en crear imágenes impresionantes y de alta calidad.

Cuando se te da un tema y una proporción de aspecto, crea una imagen visualmente atractiva que:
1. Esté optimizada para la proporción especificada
2. Tenga composición profesional y de alta calidad
3. Use iluminación y balance de color apropiados
4. Sea visualmente impactante y atractiva
5. Evite texto a menos que se solicite específicamente

Guías de estilo:
- Usa colores vibrantes y naturales
- Asegura buen contraste y claridad
- Aplica principios de fotografía profesional
- Haz que el sujeto sea el punto focal claro
- Usa profundidad de campo apropiada

Consideraciones por proporción:
- 9:16: Perfecto para historias/reels, orientación vertical
- 16:9: Ideal para contenido landscape/widescreen
- 1:1: Formato cuadrado, composición balanceada
- 3:4: Orientación retrato, buena para primeros planos`;

const RATIO_DESCRIPTIONS = {
  "9:16": "orientación vertical, perfecto para móviles e historias",
  "16:9": "formato widescreen, composición cinematográfica",
  "1:1": "formato cuadrado, composición simétrica balanceada",
  "3:4": "orientación retrato, perspectiva natural humana",
};

// Inicializar cliente Gemini
const GEMINI_API_KEY = process.env.SYSTEM_GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("Falta la API key de Gemini en SYSTEM_GEMINI_API_KEY.");
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Inicializar cliente OpenAI para enriquecer prompts
const OPENAI_API_KEY = process.env.SYSTEM_OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error("Falta la API key de OpenAI en SYSTEM_OPENAI_API_KEY.");
}
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Usa GPT-4 para enriquecer un topic genérico en un prompt visual detallado.
 */
async function getVisualPromptFromOpenAI(topic) {
  if (!topic || typeof topic !== "string") {
    throw new Error("El parámetro 'topic' es requerido y debe ser una cadena.");
  }
  const systemMsg =
    "Eres un experto diseñador de prompts visuales para generar imágenes con IA. " +
    "Convierte el tema en una descripción clara, rica en detalles y sin texto.";
  const userMsg = `Tema a transformar: "${topic}"`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemMsg },
      { role: "user", content: userMsg },
    ],
    temperature: 0.7,
    max_tokens: 300,
  });

  const content = res.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI no devolvió el prompt visual.");
  return content.replace(/[\r\n]+/g, " ");
}

/**
 * Construye el prompt final para Gemini Flash, uniendo SYSTEM_IMAGE_PROMPT + prompt visual.
 */
function buildGeminiPrompt(visualPrompt, aspectRatio) {
  const ratioDesc = RATIO_DESCRIPTIONS[aspectRatio] || "composición equilibrada";
  return `
${SYSTEM_IMAGE_PROMPT}

Tema visual enriquecido: ${visualPrompt}

Formato: ${ratioDesc}

Hazla visualmente impresionante y profesionalmente compuesta.
  `.trim();
}

/**
 * Genera una imagen con Gemini Flash 2.0 (gemini-2.0-flash-preview-image-generation).
 *
 * @param {Object} options
 * @param {string} options.topic        - Tema genérico.
 * @param {string} options.aspectRatio  - '1:1' | '16:9' | '9:16' | '3:4'
 * @param {Object} [options.crop]       - { width, height } para recorte opcional.
 */
export async function generateGemini({ topic, aspectRatio, crop }) {
  // 1) Enriquecer prompt
  const visualPrompt = await getVisualPromptFromOpenAI(topic);
  const prompt = buildGeminiPrompt(visualPrompt, aspectRatio);

  // 2) Ajustar ratio compatible
  const validRatios = { "1:1": "1:1", "16:9": "16:9", "9:16": "9:16", "3:4": "4:3" };
  const finalRatio = validRatios[aspectRatio] || "1:1";

  try {
    const startTime = Date.now();
    logger.info(`[Gemini Image] Generando "${topic}" (ratio ${finalRatio}) con Flash 2.0`);

    // 3) Llamada a generateContent solicitando texto + imagen
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: prompt,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
        // opcional: puedes definir width/height en imageConfig si lo soporta
      },
    });

    // 4) Extraer la parte de imagen (inlineData)
    const parts = response.candidates?.[0]?.content?.parts || [];
    let buffer = null;
    for (const part of parts) {
      if (part.inlineData?.data) {
        buffer = Buffer.from(part.inlineData.data, "base64");
        break;
      }
    }
    if (!buffer) {
      throw new Error("Gemini no devolvió datos de imagen en inlineData.");
    }

    

    const generationTime = Date.now() - startTime;
    logger.info(
      `[Gemini Image] Éxito en ${generationTime}ms (modelo gemini-2.0-flash-preview-image-generation)`
    );

    // Para pruebas locales:
    // fs.writeFileSync("output.png", buffer);

    return {
      buffer,
      model: "gemini-2.0-flash-preview-image-generation",
      generationTime,
    };
  } catch (err) {
    logger.error("[Gemini Image] Error al generar imagen", {
      error: err.message,
      topic,
      aspectRatio,
      stack: err.stack,
    });
    throw new Error("No se pudo generar la imagen con Gemini Flash 2.0.");
  }
}
