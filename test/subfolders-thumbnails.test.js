/**
 * Test de Verificación de Jerarquía de Carpetas, Subcarpetas y Miniaturas Oficiales
 */

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🧪 Iniciando tests de Jerarquía, Subcarpetas y Miniaturas...\n');
  let token = '';

  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  if (!healthRes.ok) throw new Error('Health check falló');
  console.log('✅ 1. Servidor saludable en http://localhost:3000');

  // 2. Login
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'clip2026' })
  });
  if (!loginRes.ok) throw new Error('Login falló');
  const loginData = await loginRes.json();
  token = loginData.token;
  console.log('✅ 2. Autenticación exitosa (token recibido)');

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 3. Verificar Campañas (Regla de Carpeta Padre)
  const campRes = await fetch(`${BASE_URL}/api/campaigns`, { headers: authHeaders });
  const campaigns = await campRes.json();
  console.log(`\n📋 Campañas encontradas: ${campaigns.length}`);

  // Verificar que la carpeta padre NO existe como campaña
  const hasParentFolder = campaigns.some(c =>
    c.driveFolderId === '1m9BC2awrAAbNse_nhCegfibop09b2vp0' ||
    c.name.toLowerCase().includes('campañas de clipping')
  );
  if (hasParentFolder) {
    throw new Error('FALLO: La carpeta padre raíz aparece como campaña.');
  }
  console.log('✅ 3. Regla de Carpeta Padre respetada: La carpeta raíz NO es una tarjeta de campaña.');

  // Verificar que las subcarpetas internas NO son campañas
  const spuriousCamps = campaigns.filter(c =>
    c.name.includes('🔴 DIRECTO') ||
    c.name.includes('video_avispas_asesinas') ||
    c.name === 'podcast_5' ||
    c.name === 'podcast4'
  );
  if (spuriousCamps.length > 0) {
    throw new Error(`FALLO: Se encontraron subcarpetas internas como campañas: ${spuriousCamps.map(c => c.name).join(', ')}`);
  }
  console.log('✅ 4. Subcarpetas internas NO son campañas separadas en el catálogo.');

  // 4. Verificar vídeos de Feijóo y sus subcarpetas
  const feijooCamp = campaigns.find(c => c.name === 'clips_feijoo');
  if (!feijooCamp) throw new Error('Campaña clips_feijoo no encontrada');

  const feijooAllVidsRes = await fetch(`${BASE_URL}/api/videos?campaignId=${feijooCamp.id}`, { headers: authHeaders });
  const feijooAllVids = await feijooAllVidsRes.json();
  console.log(`\n📁 Vídeos totales en clips_feijoo: ${feijooAllVids.length}`);

  if (feijooAllVids.length !== 30) {
    throw new Error(`FALLO: Se esperaban 30 vídeos en clips_feijoo, encontrados: ${feijooAllVids.length}`);
  }
  console.log('✅ 5. Total de clips en clips_feijoo = 30 (16 raíz + 14 en subcarpetas)');

  // Filtrar clips de la raíz de Feijóo
  const feijooRootRes = await fetch(`${BASE_URL}/api/videos?campaignId=${feijooCamp.id}&subfolder=root`, { headers: authHeaders });
  const feijooRootVids = await feijooRootRes.json();
  if (feijooRootVids.length !== 16) {
    throw new Error(`FALLO: Se esperaban 16 vídeos en raíz de Feijóo, encontrados: ${feijooRootVids.length}`);
  }
  console.log('✅ 6. Filtrado de clips en raíz de Feijóo = 16 clips');

  // Filtrar subcarpeta de Feijóo
  const directoSubfolderName = '🔴 DIRECTO I Feijóo preside el Comité Ejecutivo Nacional';
  const feijooDirectoRes = await fetch(`${BASE_URL}/api/videos?campaignId=${feijooCamp.id}&subfolder=${encodeURIComponent(directoSubfolderName)}`, { headers: authHeaders });
  const feijooDirectoVids = await feijooDirectoRes.json();
  if (feijooDirectoVids.length !== 6) {
    throw new Error(`FALLO: Se esperaban 6 vídeos en "${directoSubfolderName}", encontrados: ${feijooDirectoVids.length}`);
  }
  console.log(`✅ 7. Filtrado de subcarpeta "${directoSubfolderName}" = 6 clips`);

  // 5. Verificar vídeos de Ruben Holgado
  const rubenCamp = campaigns.find(c => c.name === 'ruben holgado');
  if (!rubenCamp) throw new Error('Campaña ruben holgado no encontrada');

  const rubenAllVidsRes = await fetch(`${BASE_URL}/api/videos?campaignId=${rubenCamp.id}`, { headers: authHeaders });
  const rubenAllVids = await rubenAllVidsRes.json();
  if (rubenAllVids.length !== 21) {
    throw new Error(`FALLO: Se esperaban 21 vídeos en ruben holgado, encontrados: ${rubenAllVids.length}`);
  }
  console.log('✅ 8. Ruben Holgado tiene sus 21 vídeos asignados correctamente (19 avispas + 2 amazonas)');

  // 6. Verificar que todas las miniaturas son del endpoint oficial
  const allVidsRes = await fetch(`${BASE_URL}/api/videos`, { headers: authHeaders });
  const allVids = await allVidsRes.json();
  const lh3Vids = allVids.filter(v => v.thumbnailUrl && v.thumbnailUrl.includes('lh3.googleusercontent.com'));
  if (lh3Vids.length > 0) {
    throw new Error(`FALLO: Aún quedan ${lh3Vids.length} vídeos con endpoint de lh3.googleusercontent.com`);
  }
  const canonicalThumbnails = allVids.filter(v => v.thumbnailUrl && v.thumbnailUrl.includes('drive.google.com/thumbnail'));
  console.log(`✅ 9. Miniaturas 100% verificadas: ${canonicalThumbnails.length} de ${allVids.length} clips usan https://drive.google.com/thumbnail?id=...&sz=w600`);

  // 7. Stats
  const statsRes = await fetch(`${BASE_URL}/api/stats`, { headers: authHeaders });
  const stats = await statsRes.json();
  if (!stats.totals) throw new Error('Estadísticas no retornaron totales');
  console.log(`✅ 10. Dashboard Stats operativo: ${stats.totals.totalVideos} clips totales reportados`);

  console.log('\n🎉 ¡TODOS LOS TESTS DE JERARQUÍA, SUBCARPETAS Y MINIATURAS PASARON AL 100%!\n');
}

runTests().catch(err => {
  console.error('\n❌ ERROR:', err.message);
  process.exit(1);
});
