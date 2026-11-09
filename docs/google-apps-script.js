/**
 * Google Apps Script - Web App Jerárquica y Recursiva para ClipFlow Studio
 * 100% Gratuito, sin necesidad de cuenta de Google Cloud ni tarjetas de crédito.
 * 
 * Soporta:
 * 1. Carpetas directas de campaña (recorre recursivamente cualquier subcarpeta interna).
 * 2. Carpetas padre con subcarpetas (detecta automáticamente cada subcarpeta inmediata como
 *    una Campaña/Cliente y recorre recursivamente todas sus subcarpetas internas).
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

  // 1. Archivos directos en esta carpeta
  var files = folderObj.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    var mime = file.getMimeType();
    var name = file.getName();

    // Filtrar vídeos por MIME type o por extensiones de vídeo estándar
    if (mime.indexOf('video') !== -1 || name.match(/\.(mp4|mov|avi|mkv|webm|m4v)$/i)) {
      var fileId = file.getId();
      var cleanName = name.replace(/\.[^/.]+$/, '');
      var finalTitle = pathPrefix ? pathPrefix + ' / ' + cleanName : cleanName;

      videoList.push({
        id: fileId,
        name: finalTitle,
        mimeType: mime,
        thumbnailLink: 'https://lh3.googleusercontent.com/d/' + fileId + '=w600',
        duration: '00:45',
        createdTime: file.getDateCreated().toISOString()
      });
    }
  }

  // 2. Subcarpetas internas dentro de esta misma carpeta (recursión)
  var innerFolders = folderObj.getFolders();
  while (innerFolders.hasNext()) {
    var inner = innerFolders.next();
    var innerPrefix = pathPrefix ? pathPrefix + ' / ' + inner.getName() : inner.getName();
    var nestedVideos = getVideosRecursively(inner, innerPrefix);
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

    // 1. Vídeos directos en la raíz
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
          thumbnailLink: 'https://lh3.googleusercontent.com/d/' + fileId + '=w600',
          duration: '00:45',
          createdTime: file.getDateCreated().toISOString()
        });
      }
    }

    // 2. Subcarpetas inmediatas (cada subcarpeta inmediata = Campaña / Cliente)
    var subfolderIter = folder.getFolders();
    var subfolderList = [];

    while (subfolderIter.hasNext()) {
      var sub = subfolderIter.next();
      // Dentro de cada campaña, recorremos recursivamente todas sus subcarpetas
      var subVideos = getVideosRecursively(sub, '');
      subfolderList.push({
        id: sub.getId(),
        name: sub.getName(),
        totalFiles: subVideos.length,
        files: subVideos
      });
    }

    // Si la carpeta consultada NO tiene subcarpetas hijas (es una campaña directa),
    // exploramos recursivamente todas sus posibles subcarpetas internas
    if (subfolderList.length === 0) {
      directFiles = getVideosRecursively(folder, '');
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
