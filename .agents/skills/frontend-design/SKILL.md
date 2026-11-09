---
name: frontend-design
description: This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.
---

# Frontend Design

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:

1. **Identify the Core Aesthetic**: Is it Minimalist/Swiss, Brutalist, Glassmorphism, Neumorphism, High-Fashion/Editorial, or Neo-Memphis? Don't pick "modern." Pick a specific high-design movement.
2. **Define the Mood**: Sophisticated, aggressive, playful, calm, or experimental?
3. **Commit to Details**: Decide on specific border radii (0px or 40px, never 8px), specific font pairings, and exact motion curves.

## Frontend Aesthetics Guidelines

### 1. Typography as Hero
*   **Contrast**: Use extreme scale differences. Hero headers should be huge (7rem+) or tiny and tracked out.
*   **Character**: Choose fonts with personality. Avoid overusing Inter/Roboto unless for small UI labels. Use serifs for sophistication or monospaced fonts for technical feel.
*   **Wait, Don't Center**: Left-align for editorial feel. Use asymmetrical layouts to create tension and interest.

### 2. Space and Rhythm
*   **generous Padding**: Double the padding you think you need. White space is a luxury.
*   **Intentional Tension**: Use tight spacing in specific clusters to create functional groups, surrounded by vast empty space.
*   **Grid Breaks**: Occasionally let an element break the container grid to create a "crafted" feel.

### 3. Color and Texture
*   **Beyond Hex**: Use HSL for better control. Avoid "default" grays; add a tiny bit of site brand color to your neutrals.
*   **Grain and Noise**: Sub-perceptual grain (2-3% opacity) can add "analog" warmth to digital surfaces.
*   **Interactive Depth**: Use layering (z-index) and subtle shadows to create a physical sense of hierarchy.

### 4. Motion and Interaction
*   **Custom Easings**: Never use `ease-in-out`. Use custom cubic-beziers (e.g., `0.23, 1, 0.32, 1`).
*   **Staggered Entrances**: Animate list items or sections one-by-one with a tiny delay (20ms) between them.
*   **Micro-feedback**: Every interaction (hover, click, focus) should have a unique, subtle visual response.

## Execution Strategy

1.  **Skeleton First**: Build the layout structure with placeholder colors to verify the "bones" of the design.
2.  **Thematic Skinning**: Apply the chosen aesthetic direction across all components.
3.  **Refinement Loop**: Look at the result. If it looks like a generic SaaS template, "break" something—change a font, remove a standard border, or add a weird layout quirk—to make it distinctive.

Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.
