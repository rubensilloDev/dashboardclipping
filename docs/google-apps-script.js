/**
 * Google Apps Script - Web App Jerárquica y Recursiva para ClipFlow Studio
 * 100% Gratuito, sin necesidad de cuenta de Google Cloud ni tarjetas de crédito.
 * 
 * Soporta:
 * 1. Carpetas directas de campaña (recorre recursivamente cualquier subcarpeta interna
 *    asociando cada vídeo con su subcarpeta correspondiente).
 * 2. Carpetas padre con subcarpetas (detecta automáticamente cada subcarpeta inmediata como
 *    una Campaña/Cliente y recorre recursivamente todas sus subcarpetas internas).
 * 3. Miniaturas oficiales y estables de Google Drive:
 *    https://drive.google.com/thumbnail?id={fileId}&sz=w600
 * 
 * INSTRUCCIONES DE INSTALACIÓN:
 * 1. Ve a https://script.google.com y abre tu proyecto.
 * 2. Reemplaza todo el código existente por este archivo completo.
 * 3. Guarda (Ctrl + S).
 * 4. Pulsa en "Implementar" (Deploy) > "Administrar implementaciones" (Manage deployments).
 * 5. Haz clic en el ícono del lápiz ✏️ (Editar), en Versión elige "Nueva versión" y pulsa "Implementar".
 */

function getVideosRecursively(folderObj, pathPrefix) {
  var videoList = [];
  pathPrefix = pathPrefix || '';

  // 1. Archivos de vídeo directos en esta carpeta
  var files = folderObj.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    var mime = file.getMimeType();
    var name = file.getName();

    // Filtrar vídeos por MIME type o por extensiones de vídeo estándar
    if (mime.indexOf('video') !== -1 || name.match(/\.(mp4|mov|avi|mkv|webm|m4v)$/i)) {
      var fileId = file.getId();
      var cleanName = name.replace(/\.[^/.]+$/, '');

      videoList.push({
        id: fileId,
        name: cleanName,
        mimeType: mime,
        subfolder: pathPrefix || null,
        thumbnailLink: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w600',
        duration: '00:45',
        createdTime: file.getDateCreated().toISOString()
      });
    }
  }

  // 2. Subcarpetas internas dentro de esta misma carpeta (recursión para subcarpetas de campaña)
  var innerFolders = folderObj.getFolders();
  while (innerFolders.hasNext()) {
    var inner = innerFolders.next();
    var nextPrefix = pathPrefix ? (pathPrefix + ' / ' + inner.getName()) : inner.getName();
    var nestedVideos = getVideosRecursively(inner, nextPrefix);
    videoList = videoList.concat(nestedVideos);
  }

  return videoList;
}

function doGet(e) {
  try {
    var folderId = e && e.parameter ? e.parameter.folderId : null;

    if (!folderId) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', error: 'Parámetro folderId no proporcionado.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var folder = DriveApp.getFolderById(folderId);

    // 1. Vídeos directos en la raíz consultada (sin subcarpeta)
    var directFiles = [];
    var files = folder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      var mime = file.getMimeType();
      var name = file.getName();
      if (mime.indexOf('video') !== -1 || name.match(/\.(mp4|mov|avi|mkv|webm|m4v)$/i)) {
        var fileId = file.getId();
        directFiles.push({
          id: fileId,
          name: name.replace(/\.[^/.]+$/, ''),
          mimeType: mime,
          subfolder: null,
          thumbnailLink: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w600',
          duration: '00:45',
          createdTime: file.getDateCreated().toISOString()
        });
      }
    }

    // 2. Subcarpetas inmediatas (Hijas de primer nivel)
    var subfolderIter = folder.getFolders();
    var subfolderList = [];

    while (subfolderIter.hasNext()) {
      var sub = subfolderIter.next();
      // Dentro de cada carpeta, recorremos recursivamente sus vídeos anotando subcarpetas
      var subVideos = getVideosRecursively(sub, '');
      subfolderList.push({
        id: sub.getId(),
        name: sub.getName(),
        totalFiles: subVideos.length,
        files: subVideos
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        folderId: folderId,
        folderName: folder.getName(),
        totalFiles: directFiles.length,
        files: directFiles,
        totalSubfolders: subfolderList.length,
        subfolders: subfolderList
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        error: err.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
