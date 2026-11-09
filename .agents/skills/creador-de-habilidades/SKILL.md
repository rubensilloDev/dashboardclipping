---
name: creador-de-habilidades
description: Crea nuevas habilidades (skills) para el agente siguiendo la documentación oficial de Antigravity. Úsalo cuando el usuario pida explícitamente crear una nueva skill, habilidad, o herramienta para la IA.
---

# Creador de Habilidades (Skill Creator)

Esta habilidad te enseña cómo crear nuevas habilidades (skills) para ti mismo o para otros agentes de Antigravity, cumpliendo estrictamente con la documentación oficial.

## Reglas Fundamentales para Crear una Habilidad
Toda nueva habilidad debe cumplir con las siguientes reglas:

1. **Ubicación:** 
   - Específicas del proyecto: `<raíz-del-proyecto>/.agents/skills/<nombre-de-la-habilidad>/` (Recomendado por defecto si estás en un workspace).
   - Globales: `~/.gemini/antigravity/skills/<nombre-de-la-habilidad>/`.
2. **Estructura de Carpetas:** Debes crear una carpeta con el `<nombre-de-la-habilidad>`.
3. **Archivo Obligatorio `SKILL.md`:** Dentro de la carpeta, debe existir un archivo llamado exactamente `SKILL.md`. Este archivo debe contener las instrucciones principales para el agente.
4. **Frontmatter YAML:** El archivo `SKILL.md` DEBE comenzar con un bloque YAML (entre `---`) con los siguientes campos obligatorios:
   - `name`: Un identificador único, en minúsculas y separado por guiones (ej. `mi-nueva-habilidad`).
   - `description`: Una descripción clara, concisa y detallada que explique **cuándo** y **por qué** el agente debe activar esta habilidad. Esta es la parte más crítica para el descubrimiento automático.
5. **Idioma:** Todas las habilidades creadas que sigan este proceso deben redactarse **100% en español**, a menos que el usuario especifique explícitamente lo contrario.
6. **Enfoque Único:** Cada habilidad debe estar diseñada para hacer una sola cosa extremadamente bien.

## Pasos para Crear una Habilidad

Cuando el usuario te pida crear una nueva habilidad, sigue este proceso autónomamente:

1. **Analiza el requerimiento:** Entiende exactamente qué tarea debe realizar la habilidad. Si es muy compleja, divídela en pasos secuenciales o usa árboles de decisión.
2. **Define el `name` y la `description`:** Escribe un nombre en minúsculas con guiones y una excelente descripción.
3. **Elige la ubicación:** Crea la carpeta necesaria en el espacio de trabajo local (ej. `.agents/skills/mi-skill`) usando tus herramientas del sistema de archivos.
4. **Crea el archivo `SKILL.md`:** Redacta y crea el archivo empleando la siguiente plantilla base:

```markdown
---
name: nombre-de-la-habilidad
description: Descripción de cuándo y para qué debe activarse esta habilidad.
---

# Nombre de la Habilidad

## Propósito
[Explica brevemente qué hace esta habilidad y su objetivo principal]

## Instrucciones de Uso
1. Paso uno a seguir por el agente (Ej. "Primero, revisa X archivo").
2. Paso dos (Ej. "Luego, ejecuta Y comando usando Run Command").
3. Paso tres...

## Mejores Prácticas y Condiciones Adicionales
- [Si ocurre la condición A, aplica esta regla oculta...]
- [Precauciones a tener en cuenta al ejecutar...]
```

5. **(Opcional) Crea scripts auxiliares:** Si un comando bash es demasiado largo o la tarea requiere un script Python específico, genéralo (como un archivo `.py`, `.sh`, `.bat`) dentro de la misma carpeta de la habilidad, y documenta detalladamente en el `SKILL.md` que el agente debe ejecutar ese script ("caja negra").

## Lista de Verificación Final
Antes de notificar al usuario que has creado su nueva habilidad, comprueba mentalmente:
- [ ] ¿La carpeta tiene el guionizado correcto, sin espacios?
- [ ] ¿El archivo se llama obligatoriamente `SKILL.md`?
- [ ] ¿Empieza con un Frontmatter YAML válido que incluya `name` y `description`?
- [ ] ¿Las instrucciones están dirigidas expresamente al modelo de IA, guiándole de forma clara, directa y paso a paso?
- [ ] ¿El idioma empleado es el español, tanto en la cabecera como en el cuerpo?
