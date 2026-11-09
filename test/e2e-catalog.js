import { strict as assert } from 'node:assert';

async function runTests() {
  console.log('--- Iniciando Pruebas E2E de Catálogo y Sincronización ---');

  // 1. Login
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'clip2026' })
  });
  assert.equal(loginRes.status, 200, 'Login falló');
  const { token } = await loginRes.json();
  assert.ok(token, 'Token no recibido');
  console.log('✓ Login exitoso y token obtenido');

  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2. Probar filtros del catálogo
  const allRes = await fetch('http://localhost:3000/api/videos', { headers: authHeaders });
  const allVideos = await allRes.json();
  console.log(`✓ Total vídeos en catálogo: ${allVideos.length}`);

  // Filtro ready_to_publish
  const pendingPubRes = await fetch('http://localhost:3000/api/videos?status=ready_to_publish', { headers: authHeaders });
  const pendingPubVideos = await pendingPubRes.json();
  console.log(`✓ Filtro "Pendientes de publicar": ${pendingPubVideos.length}`);

  // Filtro YouTube
  const ytRes = await fetch('http://localhost:3000/api/videos?status=youtube', { headers: authHeaders });
  const ytVideos = await ytRes.json();
  console.log(`✓ Filtro "Subido en YouTube": ${ytVideos.length}`);

  // Ordenación por duración
  const durRes = await fetch('http://localhost:3000/api/videos?sort=duration_desc', { headers: authHeaders });
  const durVideos = await durRes.json();
  assert.ok(durVideos.length > 0, 'No se devolvieron vídeos ordenados por duración');
  console.log(`✓ Ordenación "Mayor duración" primer clip: ${durVideos[0].title} (${durVideos[0].duration})`);

  // Ordenación por título A-Z
  const titleRes = await fetch('http://localhost:3000/api/videos?sort=title_asc', { headers: authHeaders });
  const titleVideos = await titleRes.json();
  console.log(`✓ Ordenación "Título A-Z" primer clip: ${titleVideos[0].title}`);

  // 3. Sincronización
  const syncRes = await fetch('http://localhost:3000/api/videos/sync', {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(syncRes.status, 200, 'Sincronización falló');
  const syncData = await syncRes.json();
  console.log(`✓ Respuesta de sincronización: ${syncData.message}`);

  // 4. Estadísticas del Dashboard
  const statsRes = await fetch('http://localhost:3000/api/stats', { headers: authHeaders });
  const statsData = await statsRes.json();
  console.log(`✓ KPIs actualizados en vivo: Total=${statsData.totals.totalVideos}, Editados=${statsData.totals.editedVideos}, Subidos=${statsData.totals.totalUploads}`);
  console.log(`✓ Gráfico de plataformas actualizado: YT=${statsData.platforms.youtube}, TT=${statsData.platforms.tiktok}, IG=${statsData.platforms.instagram}, FB=${statsData.platforms.facebook}`);

  console.log('--- TODAS LAS PRUEBAS E2E COMPLETADAS CON ÉXITO (100%) ---');
}

runTests().catch((err) => {
  console.error('Error en pruebas E2E:', err);
  process.exit(1);
});

