// services/firebaseStorageService.js

const admin = require('../../firebase/firebase'); // Usar la configuración principal de Firebase

/**
 * Sube una imagen (buffer) a Firebase Storage organizada por usuario.
 * @param {Buffer} buffer - Buffer de la imagen.
 * @param {string} fileName - Nombre del archivo a guardar.
 * @param {string} userId - ID del usuario para organizar en carpetas.
 * @returns {Promise<string>} - URL firmada para acceder a la imagen.
 */
async function uploadToFirebase(buffer, fileName, userId) {
  try {
    // Verificar que Firebase esté inicializado
    if (!admin.initialized) {
      admin.initialize();
    }

    const bucket = admin.getApp().storage().bucket();
    
    // Crear estructura de carpetas: userId/generated-images/filename
    const filePath = `${userId}/generated-images/${fileName}`;
    const file = bucket.file(filePath);

    await file.save(buffer, {
      metadata: {
        contentType: 'image/png',
        metadata: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString()
        }
      },
      resumable: false,
    });

    // Hacer que el archivo no sea público, pero se pueda acceder con una URL firmada
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // +1 año
    });

    console.log(`✅ Imagen guardada en Firebase Storage: ${filePath}`);
    return url;

  } catch (error) {
    console.error('❌ Error subiendo imagen a Firebase Storage:', error);
    throw new Error('Error al subir imagen a Firebase Storage');
  }
}

/**
 * Obtiene todas las imágenes de un usuario específico desde Firebase Storage.
 * @param {string} userId - ID del usuario.
 * @param {string} folder - Carpeta específica (por defecto: generated-images).
 * @returns {Promise<Array>} - Lista de archivos con sus URLs.
 */
async function getUserImages(userId, folder = 'generated-images') {
  try {
    // Verificar que Firebase esté inicializado
    if (!admin.initialized) {
      admin.initialize();
    }

    const bucket = admin.getApp().storage().bucket();
    const prefix = `${userId}/${folder}/`;

    const [files] = await bucket.getFiles({ prefix });
    
    const images = await Promise.all(
      files.map(async (file) => {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
        });
        
        return {
          name: file.name,
          url,
          size: file.metadata.size,
          contentType: file.metadata.contentType,
          updated: file.metadata.updated,
          folder: folder
        };
      })
    );

    return images;

  } catch (error) {
    console.error('❌ Error obteniendo imágenes del usuario:', error);
    throw new Error('Error al obtener imágenes de Firebase Storage');
  }
}

/**
 * Elimina una imagen específica de Firebase Storage.
 * @param {string} userId - ID del usuario.
 * @param {string} fileName - Nombre del archivo.
 * @param {string} folder - Carpeta donde está almacenado.
 * @returns {Promise<void>}
 */
async function deleteUserImage(userId, fileName, folder = 'generated-images') {
  try {
    // Verificar que Firebase esté inicializado
    if (!admin.initialized) {
      admin.initialize();
    }

    const bucket = admin.getApp().storage().bucket();
    const filePath = `${userId}/${folder}/${fileName}`;
    
    await bucket.file(filePath).delete();
    
    console.log(`✅ Imagen eliminada: ${filePath}`);

  } catch (error) {
    console.error('❌ Error eliminando imagen:', error);
    throw new Error('Error al eliminar imagen de Firebase Storage');
  }
}

module.exports = { 
  uploadToFirebase, 
  getUserImages, 
  deleteUserImage 
};
