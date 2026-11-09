Actúa como un desarrollador web senior especializado en apps ligeras, gratuitas y mobile-first. Quiero que construyas una aplicación web completa y funcional, lista para desplegar, siguiendo estas especificaciones. No me des solo ideas: entrégame el código completo y las instrucciones para ponerla en marcha.

## OBJETIVO
Una web personal para gestionar mis campañas de clipping. Leo mis vídeos desde carpetas de Google Drive y, para cada vídeo, marco su estado de edición y en qué plataformas lo he subido. Debo poder usarla igual desde móvil y PC, con los datos sincronizados.

## FUNCIONALIDADES
1. **Login con Google** (una sola cuenta, la mía). Los datos se guardan en Firestore bajo mi UID, para verlos igual en móvil y PC.
2. **Carpetas = campañas/clientes**: puedo añadir varias carpetas de Drive (pegando el enlace o ID de la carpeta). Cada carpeta es una campaña con nombre editable y color. Puedo añadirlas, renombrarlas y quitarlas.
3. **Sincronización automática con Drive**: al abrir la app (y con un botón "Actualizar") lista los vídeos de cada carpeta (nombre, miniatura, duración si está disponible, fecha). Los vídeos nuevos aparecen automáticamente con estado "Pendiente". Los estados ya guardados no se pierden al sincronizar.
4. **Estados por vídeo** (se pueden marcar y desmarcar con un toque):
   - Editado (sí/no)
   - Subido en: YouTube, TikTok, Instagram, Facebook (cada plataforma por separado, multiselección)
   - Opcional: campo de nota y enlace del post publicado por plataforma.
5. **Reproductor integrado**: al tocar un vídeo, se abre una vista con el reproductor embebido de Drive (iframe de preview) y los controles de estado debajo.
6. **Filtros y buscador**: por campaña, por estado (pendiente, editado, subido en X, subido en todas), y búsqueda por nombre.
7. **Panel de estadísticas (dashboard)**:
   - Totales: vídeos, editados, pendientes de editar, subidos.
   - Progreso por campaña (barras de progreso).
   - Gráfico de subidas por plataforma.
   - Vídeos editados pero sin subir en ninguna plataforma (lista de "pendientes de publicar").
   - Actividad reciente (guardar fecha de cada cambio de estado).

## DISEÑO
Oscuro y moderno, estilo dashboard: fondo casi negro, tarjetas con bordes sutiles, un color de acento vivo, tipografía limpia (Inter o similar), animaciones suaves, iconos para cada plataforma. Navegación inferior en móvil y barra lateral en escritorio. Usa la skill de @[c:\Users\usuario\Desktop\Carpetas\Proyectos\dashboard-clipping\.agents\skills\ui-design-system] para el diseño, apoyate en ella, que sea un diseño espectacular.

Si algo no está claro, asume la opción más simple y gratuita y avísame. Trabaja por fases: primero el esqueleto con login y lectura de Drive, y luego el resto de funciones, pero entrégamelo todo en esta misma respuesta si es posible.

