## NORMAS DE CÓDIGO Y STACK (tienen prioridad sobre cualquier indicación anterior que las contradiga)

### Stack
- HTML5, CSS3 y JavaScript vanilla (ES2022+). Sin frameworks (nada de React, Vue, Angular, etc.).
- Se permiten librerías externas puntuales por CDN cuando aporten valor real (por ejemplo Chart.js para gráficos o una librería de iconos). Indica cuál usas y por qué.
- Sin pasos de compilación ni bundlers: el proyecto debe funcionar abriendo los archivos o sirviéndolos como estáticos.
- JavaScript organizado en módulos ES (`type="module"`).

### Autenticación
- Autenticación simple con usuario y contraseña. Sin Firebase, sin Google Sign-In y sin servicios de terceros de autenticación.
- Un único usuario (yo). Las credenciales NUNCA van escritas en el código del frontend: se guardan en el servidor/entorno como variables de entorno, con la contraseña hasheada (bcrypt, scrypt o equivalente).
- Tras el login se emite un token de sesión (JWT firmado o cookie HttpOnly) con caducidad razonable y opción de "mantener sesión iniciada".
- Incluye protección básica contra fuerza bruta (límite de intentos) y cierre de sesión.

### Idioma
- Todos los nombres en INGLÉS: clases CSS, ids, variables, funciones, clases JS, archivos, carpetas, claves de datos y commits.
- Todos los comentarios en ESPAÑOL.
- Los textos visibles de la interfaz en español.

### Convenciones de nombres
- Archivos y carpetas: kebab-case (`video-card.js`, `dashboard.css`).
- Variables y funciones: camelCase, con nombres descriptivos y verbos para las funciones (`fetchVideos`, `toggleUploadStatus`).
- Clases JS: PascalCase (`VideoRepository`).
- Constantes: UPPER_SNAKE_CASE (`MAX_LOGIN_ATTEMPTS`).
- Clases CSS: metodología BEM (`video-card__title`, `status-badge--uploaded`).
- Ids solo cuando sean necesarios (para JS o accesibilidad); para estilos usar siempre clases.
- Booleanos con prefijo `is`, `has` o `can` (`isEdited`, `hasUploads`).

### Arquitectura
- Separación clara de responsabilidades: servicios (acceso a datos y API), estado, componentes de interfaz y utilidades en archivos distintos.
- Cada función hace una sola cosa y es corta. Preferir funciones puras cuando sea posible.
- Sin variables globales: todo encapsulado en módulos.
- Sin código duplicado (principio DRY) y sin "números mágicos": usar constantes con nombre.
- Estructura de carpetas sugerida: `/css`, `/js/services`, `/js/components`, `/js/utils`, `/assets`.

### JavaScript
- Usar `const` por defecto, `let` solo si hay reasignación, nunca `var`.
- `async/await` en lugar de cadenas de `.then()`.
- Gestión de errores explícita con `try/catch` y mensajes claros para el usuario (nunca fallos silenciosos).
- Modo estricto, comparaciones con `===` y sin código muerto ni `console.log` olvidados.
- Manipulación del DOM segura: no usar `innerHTML` con datos externos (evitar XSS); usar `textContent` o elementos creados con `createElement`.
- Delegación de eventos cuando haya listas dinámicas.

### CSS
- Mobile-first con media queries por breakpoints.
- Variables CSS (`:root`) para colores, espaciados, radios, sombras y tipografía. Tema oscuro definido solo desde variables.
- Layout con Flexbox y Grid. Sin `!important` y sin estilos en línea.
- Unidades relativas (`rem`, `%`, `clamp()`) en lugar de `px` fijos cuando proceda.
- Zonas táctiles de al menos 44x44 px en móvil.

### HTML
- Etiquetas semánticas (`header`, `nav`, `main`, `section`, `article`, `footer`).
- Accesibilidad básica: atributos `alt`, `aria-label` en botones de solo icono, foco visible, contraste suficiente y navegación con teclado.
- Meta viewport y etiquetas meta correctas.

### Comentarios
- Comentar el "por qué", no lo obvio. Cada archivo empieza con un comentario breve que explica su propósito.
- Cada función pública lleva un comentario JSDoc en español (descripción, parámetros y valor devuelto).
- Secciones largas separadas con comentarios de bloque.

### Seguridad y calidad
- Validar y sanear toda entrada de usuario, tanto en frontend como en servidor.
- Ningún secreto (claves, contraseñas, tokens) en el código ni en el repositorio: usar variables de entorno y un archivo `.env.example`.
- Incluir un `README.md` con instalación, configuración y despliegue.

### Formato de entrega
- Código completo de cada archivo, sin omisiones ni "resto del código aquí".
- Indica la ruta de cada archivo antes de su código.
- Si tienes que asumir algo, dilo antes de empezar.

