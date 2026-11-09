# ClipFlow Studio - Dashboard de Clipping & Gestión de Vídeos

Aplicación web profesional, ligera y mobile-first para creadores y editores de contenido que gestionan campañas de clipping a partir de carpetas de Google Drive y distribución multiplataforma (YouTube, TikTok, Instagram y Facebook).

---

## Características Principales

1. **Gestión de Campañas y Clientes**:
   - Carpetas de Google Drive vinculadas a campañas con nombres y colores distintivos editables.
   - **Soporte de Carpeta Padre y Subcarpetas Hijas**: Puedes ingresar el enlace de una carpeta raíz que contenga subcarpetas para cada cliente o campaña; ClipFlow detectará e importará automáticamente todas las campañas hijas de una sola vez.
   - Sincronización inteligente que preserva los estados (`isEdited`, plataformas marcadas, notas y URLs) de vídeos ya guardados.
2. **Catálogo Jerárquico (Nivel 1 y Nivel 2)**:
   - **Nivel 1 (Índice de Carpetas)**: Tarjetas visuales de cada campaña con barra de progreso, ratio de subidas y acceso rápido.
   - **Nivel 2 (Dentro de la Campaña)**: Barra contextual con botón para volver a todas las campañas, sincronización individual de la carpeta y edición directa.
3. **Barra de Filtros por Estado (Tabs / Pills)**:
   - Filtros horizontales rápidos con conteo dinámico: Todos, ⏳ Sin editar, ✂️ Editados, 🚀 Listos para publicar, ▶️ YouTube, 🎵 TikTok, 📸 Instagram, 👥 Facebook, ✨ En todas las redes.
4. **Control Rápido de Estados**:
   - Edición de vídeo (`Editado: Sí / No`).
   - Publicación independiente por plataforma: YouTube, TikTok, Instagram y Facebook.
   - Campos para notas de edición y enlace a la publicación oficial.
5. **Reproductor Integrado**:
   - Visualización directa del clip en un iframe oficial de Google Drive (`https://drive.google.com/file/d/ID/preview`) con los controles de estado y redes debajo.
6. **Panel de Estadísticas y Analítica (Dashboard)**:
   - KPIs: Total de clips, editados, pendientes de corte y total de publicaciones.
   - Barras de progreso por campaña.
   - Gráfico de dona con distribución por plataforma (Chart.js).
   - Lista prioritaria de vídeos pendientes de publicar (editados con 0 subidas).
   - Historial de actividad reciente auditado con fecha y hora.
7. **Vistas Intercambiables**:
   - Alternancia en un toque entre vista en **Cuadrícula Visual (9:16)** y vista en **Tabla Compacta**.
8. **Seguridad y Autenticación**:
   - Autenticación para el creador con contraseña protegida por `scrypt` y sal criptográfica.
   - Sesiones seguras mediante tokens HMAC-SHA256 con expiración y opción de "Mantener sesión iniciada".
   - Protección contra fuerza bruta con limitador de intentos (bloqueo tras 5 intentos fallidos durante 15 minutos).
   - Persistencia atómica en archivo JSON (`data/db.json`) libre de corrupción.

---

## Arquitectura y Stack Tecnológico

- **Frontend**: HTML5 semántico, CSS3 vanilla (arquitectura BEM, variables `:root`, tema oscuro glassmorphism estilo Linear/Raycast) y JavaScript ES2022+ en módulos nativos (`type="module"`).
- **Backend**: Node.js con Express, CORS y Dotenv.
- **Librerías externas por CDN**:
  - `Chart.js`: Renderizado de gráficos de datos sin necesidad de bundlers.
  - `Lucide Icons`: Iconografía SVG moderna y consistente.
  - Google Fonts: `Plus Jakarta Sans` para tipografía de interfaz y `JetBrains Mono` para cifras, datos técnicos y duraciones.

---

## Instalación y Puesta en Marcha

### 1. Clonar e Instalar Dependencias
```bash
npm install
```

### 2. Configurar Variables de Entorno
Copia el archivo `.env.example` como `.env`:
```bash
cp .env.example .env
```

Por defecto, el entorno viene preparado con las siguientes credenciales:
- **Usuario**: `admin`
- **Contraseña**: `clip2026`

Si deseas cambiar la contraseña, ejecuta el generador de hash seguro:
```bash
node scripts/hash-password.js tu_nueva_contraseña
```
Copia el hash resultante y actualiza la variable `ADMIN_PASSWORD_HASH` en tu archivo `.env`.

### 3. Iniciar el Servidor de Desarrollo
```bash
npm start
```
Abre en tu navegador favorito:
```
http://localhost:3000
```

---

## Conexión con Google Drive para Sincronización Automática

ClipFlow Studio te permite sincronizar automáticamente todos los vídeos contenidos en tus carpetas de Google Drive mediante dos métodos:

### Opción A: Google Apps Script Web App (100% Gratis y Recomendada)
> **Ventajas**: Sin cuenta de Google Cloud, sin tarjeta de crédito, sin configuración compleja de cuotas y funciona de inmediato con cualquier cuenta de Google (incluidas cuentas personales de Gmail y Google Workspace).

1. Abre [script.google.com](https://script.google.com) en tu navegador e inicia sesión con tu cuenta de Google.
2. Pulsa en **"Nuevo proyecto"** (New project).
3. Borra el código de ejemplo y pega el contenido completo de [`docs/google-apps-script.js`](docs/google-apps-script.js) (o pulsa el botón *"Copiar código de Apps Script"* dentro del modal de ClipFlow).
4. Arriba a la derecha, haz clic en **Implementar (Deploy)** > **Nueva implementación (New deployment)**:
   - Haz clic en el engranaje ⚙️ y selecciona **"Aplicación web"** (Web app).
   - En *Descripción*, escribe: `ClipFlow Drive API v2 (con soporte para subcarpetas)`.
   - En *Ejecutar como*, selecciona: **Yo (tu correo)**.
   - En *Quién tiene acceso*, selecciona: **Cualquier usuario (Anyone)**.
5. Pulsa en **Implementar**, acepta la autorización de lectura a Google Drive y copia la **URL de la aplicación web** generada (empieza por `https://script.google.com/macros/s/.../exec`).
6. En ClipFlow Studio, pulsa en el botón **Google Drive** del encabezado, pega tu URL y haz clic en **"Guardar Configuración"**. ¡Listo! A partir de ese momento, la sincronización leerá directamente tus vídeos y miniaturas reales.

### Opción B: Google Drive API Key (Google Cloud Console)
> Para usuarios avanzados o empresas con un proyecto creado en Google Cloud Console.

1. Accede a [Google Cloud Console](https://console.cloud.google.com).
2. Habilita la **Google Drive API v3**.
3. En la sección **Credenciales**, crea una nueva **Clave de API (API Key)**.
4. Pega la clave en el modal de ClipFlow Studio o establécela en la variable `GOOGLE_DRIVE_API_KEY` del archivo `.env`.

*Nota:* Si no configuras ninguna de las dos opciones, ClipFlow Studio opera en **Modo Simulación Local**, permitiéndote probar toda la interfaz y flujo de trabajo sin requerir conexión externa.

---

## Despliegue en Producción

La aplicación no requiere ningún paso de compilación (`build`) y está lista para desplegarse en cualquier servicio de Node.js (Railway, Render, Fly.io, VPS o servidor propio):

```bash
NODE_ENV=production npm start
```

Asegúrate de definir en tu proveedor de hosting las variables de entorno de producción:
- `PORT`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `SESSION_SECRET`
- `GOOGLE_APPS_SCRIPT_URL` (Opcional, URL de tu Web App gratuita de Apps Script).
- `GOOGLE_DRIVE_API_KEY` (Opcional, para carpetas públicas de Google Drive con API v3).

