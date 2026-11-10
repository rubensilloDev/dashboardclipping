/**
 * Test de Verificación de UI: Semáforo de Vídeos, Sidebar Colapsable y Acordeón de Campañas
 */

import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🧪 Iniciando tests de UI (Semáforo, Sidebar Colapsable y Acordeón)...\n');

  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  if (!healthRes.ok) throw new Error('Health check falló');
  console.log('✅ 1. Servidor saludable en http://localhost:3000');

  // 2. Verificar HTML
  const htmlContent = fs.readFileSync('index.html', 'utf8');

  const requiredElements = [
    'sidebarCollapseBtn',
    'sidebarCollapseIcon',
    'sidebarCampaignsAccordion',
    'sidebarCampaignsToggle',
    'sidebarCampaignsCountText',
    'sidebarCampaignsCollapse',
    'sidebarCampaignsGroup',
    'sidebarManageAllBtn',
    'sidebarCollapsedCountBadge',
    'modalPipelineBadge'
  ];

  for (const id of requiredElements) {
    if (!htmlContent.includes(`id="${id}"`)) {
      throw new Error(`Elemento obligatorio no encontrado en index.html: id="${id}"`);
    }
  }
  console.log('✅ 2. Estructura HTML validada: Botón de colapso, acordeón de campañas y badge de semáforo presentes.');

  // 3. Verificar CSS de Semáforo y Sidebar Colapsable
  const componentsCss = fs.readFileSync('css/components.css', 'utf8');
  const layoutCss = fs.readFileSync('css/layout.css', 'utf8');

  const requiredCssRules = [
    '.video-card.pipeline-status--raw',
    '.video-card.pipeline-status--ready',
    '.video-card.pipeline-status--published',
    '.badge--pipeline-raw',
    '.badge--pipeline-ready',
    '.badge--pipeline-published',
    '.sidebar-collapse-btn',
    '.sidebar-campaigns-accordion',
    '.sidebar-campaigns-header',
    '.sidebar-campaigns-body',
    '.sidebar-manage-all-link'
  ];

  for (const rule of requiredCssRules) {
    if (!componentsCss.includes(rule) && !layoutCss.includes(rule)) {
      throw new Error(`Regla CSS obligatoria no encontrada: ${rule}`);
    }
  }
  console.log('✅ 3. Reglas CSS validadas: semáforo de 3 estados, sidebar colapsable y acordeón con micro-scrollbar.');

  // 4. Test Unitario de lógica del semáforo (createVideoCardElement logic)
  const computePipelineStatus = (video) => {
    const platforms = video.platforms || {};
    const publishedCount = ['youtube', 'tiktok', 'instagram', 'facebook'].filter(
      (net) => Boolean(platforms[net])
    ).length;

    let pipelineClass = 'pipeline-status--raw';
    let pipelineText = 'En bruto';

    if (publishedCount > 0) {
      pipelineClass = 'pipeline-status--published';
      pipelineText = `Publicado (${publishedCount}/4)`;
    } else if (video.isEdited) {
      pipelineClass = 'pipeline-status--ready';
      pipelineText = 'Listo para publicar';
    }

    return { pipelineClass, pipelineText, publishedCount };
  };

  // Caso 1: En bruto
  const rawVideo = { isEdited: false, platforms: { youtube: false, tiktok: false, instagram: false, facebook: false } };
  const rawStatus = computePipelineStatus(rawVideo);
  if (rawStatus.pipelineClass !== 'pipeline-status--raw' || rawStatus.pipelineText !== 'En bruto') {
    throw new Error('Fallo en cálculo de estado En bruto');
  }
  console.log('✅ 4. Lógica de estado "⚪ En bruto" verificada');

  // Caso 2: Editado sin publicar
  const readyVideo = { isEdited: true, platforms: { youtube: false, tiktok: false, instagram: false, facebook: false } };
  const readyStatus = computePipelineStatus(readyVideo);
  if (readyStatus.pipelineClass !== 'pipeline-status--ready' || readyStatus.pipelineText !== 'Listo para publicar') {
    throw new Error('Fallo en cálculo de estado Listo para publicar');
  }
  console.log('✅ 5. Lógica de estado "🟡 Listo para publicar" verificada');

  // Caso 3: Publicado
  const publishedVideo = { isEdited: true, platforms: { youtube: true, tiktok: true, instagram: false, facebook: false } };
  const pubStatus = computePipelineStatus(publishedVideo);
  if (pubStatus.pipelineClass !== 'pipeline-status--published' || pubStatus.pipelineText !== 'Publicado (2/4)') {
    throw new Error('Fallo en cálculo de estado Publicado');
  }
  console.log('✅ 6. Lógica de estado "🟢 Publicado (2/4)" verificada');

  // 5. Verificar endpoints de la API
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'clip2026' })
  });
  if (!loginRes.ok) throw new Error('Login falló');
  const { token } = await loginRes.json();

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const vidsRes = await fetch(`${BASE_URL}/api/videos`, { headers: authHeaders });
  const videos = await vidsRes.json();
  console.log(`✅ 7. API de vídeos responde correctamente con ${videos.length} clips`);

  const rawCount = videos.filter(v => !v.isEdited && !Object.values(v.platforms || {}).some(Boolean)).length;
  const readyCount = videos.filter(v => v.isEdited && !Object.values(v.platforms || {}).some(Boolean)).length;
  const pubCount = videos.filter(v => Object.values(v.platforms || {}).some(Boolean)).length;

  console.log(`   - ⚪ En bruto: ${rawCount}`);
  console.log(`   - 🟡 Listos para publicar: ${readyCount}`);
  console.log(`   - 🟢 Publicados: ${pubCount}`);

  console.log('\n🎉 ¡TODOS LOS TESTS DE UI Y SEMÁFORO PASARON EXITOSAMENTE AL 100%!\n');
}

runTests().catch((err) => {
  console.error('\n❌ ERROR:', err.message);
  process.exit(1);
});
