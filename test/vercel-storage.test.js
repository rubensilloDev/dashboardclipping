/**
 * Test de Verificación Integral:
 * - Despliegue Serverless en Vercel (vercel.json, api/index.js, server/index.js export)
 * - Modo Dual de Persistencia: Upstash Redis REST API + Fallback Local JSON
 * - Integridad de Datos y Ejecución de Rutas Asíncronas
 */

// Establecer NODE_ENV='test' antes de cualquier importación de servidor para evitar bind de puerto en test runner
process.env.NODE_ENV = 'test';

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../server/storage/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 Iniciando Verificación de Vercel Serverless & Dual-Mode DB');
  console.log('===============================================================\n');

  // --------------------------------------------------------------------------
  // 1. Verificación de Archivos y Configuración Vercel Serverless
  // --------------------------------------------------------------------------
  console.log('--- 1. Configuración Vercel Serverless ---');

  // 1.1 api/index.js
  const apiIndexPath = path.join(ROOT_DIR, 'api', 'index.js');
  assert(fs.existsSync(apiIndexPath), 'api/index.js no existe');
  const { default: serverlessApp } = await import('../api/index.js');
  assert(typeof serverlessApp === 'function', 'api/index.js no exporta la app de Express');
  console.log('✓ api/index.js exporta correctamente la aplicación Express');

  // 1.2 vercel.json
  const vercelJsonPath = path.join(ROOT_DIR, 'vercel.json');
  assert(fs.existsSync(vercelJsonPath), 'vercel.json no existe');
  const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf-8'));
  assert.equal(vercelConfig.version, 2, 'vercel.json debe usar version: 2');
  assert(Array.isArray(vercelConfig.rewrites), 'vercel.json debe contener array de rewrites');
  const apiRewrite = vercelConfig.rewrites.find(
    (r) => r.source === '/api/(.*)' && r.destination === '/api/index.js'
  );
  assert(apiRewrite, 'Rewrite de /api/(.*) hacia /api/index.js no encontrado en vercel.json');
  console.log('✓ vercel.json correctamente configurado con rewrite /api/(.*) -> /api/index.js');

  // 1.3 server/index.js guard Vercel
  const serverIndexSrc = fs.readFileSync(path.join(ROOT_DIR, 'server', 'index.js'), 'utf-8');
  assert(
    serverIndexSrc.includes('!process.env.VERCEL'),
    'server/index.js debe proteger app.listen con !process.env.VERCEL'
  );
  console.log('✓ server/index.js respeta la condición de ejecución serverless (!process.env.VERCEL)');

  // --------------------------------------------------------------------------
  // 2. Verificación de Upstash Redis REST API (Cloud Mode)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Modo Cloud: Upstash Redis REST API ---');

  const redisConfig = db.getRedisConfig();
  assert(redisConfig, 'Configuración de Upstash Redis no detectada en process.env');
  assert(redisConfig.url.startsWith('https://'), 'KV_REST_API_URL debe comenzar con https://');
  assert(redisConfig.token.length > 20, 'KV_REST_API_TOKEN debe ser un token válido');
  console.log(`✓ Upstash Redis configurado en: ${redisConfig.url}`);

  // Test directo de lectura y escritura en Redis mediante DualDatabase
  const initialDbData = await db.read();
  assert(initialDbData && typeof initialDbData === 'object', 'db.read() debe retornar un objeto');
  assert(Array.isArray(initialDbData.campaigns), 'db.read() debe contener un array de campañas');
  assert(Array.isArray(initialDbData.videos), 'db.read() debe contener un array de vídeos');
  console.log(`✓ Lectura desde Upstash Redis exitosa: ${initialDbData.campaigns.length} campañas, ${initialDbData.videos.length} clips`);

  // Crear actividad de prueba en Redis
  const testActivityText = `Verificación de storage dual ${Date.now()}`;
  const createdActivity = await db.addActivity(testActivityText, 'test_dual_storage');
  assert(createdActivity && createdActivity.text === testActivityText, 'addActivity falló');
  const recentActivities = await db.getActivities(5);
  const foundActivity = recentActivities.find((a) => a.text === testActivityText);
  assert(foundActivity, 'La actividad añadida debe reflejarse en getActivities()');
  console.log('✓ Escritura y lectura atómica en Upstash Redis REST verificada');

  // --------------------------------------------------------------------------
  // 3. Verificación de Modo Local JSON (Fallback Mode)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Modo Local: Fallback de Sistema de Archivos JSON ---');

  // Guardamos temporalmente las variables de entorno
  const originalKvUrl = process.env.KV_REST_API_URL;
  const originalKvToken = process.env.KV_REST_API_TOKEN;
  const originalUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  try {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    assert.equal(db.getRedisConfig(), null, 'getRedisConfig() debe ser null sin variables');

    const localData = await db.read();
    assert(localData && typeof localData === 'object', 'Lectura local debe retornar objeto');
    assert(Array.isArray(localData.campaigns), 'Lectura local debe contener campañas');
    console.log(`✓ Fallback local operativo: leídas ${localData.campaigns.length} campañas de data/db.json`);
  } finally {
    // Restauramos las variables de entorno
    process.env.KV_REST_API_URL = originalKvUrl;
    process.env.KV_REST_API_TOKEN = originalKvToken;
    if (originalUpstashUrl) process.env.UPSTASH_REDIS_REST_URL = originalUpstashUrl;
    if (originalUpstashToken) process.env.UPSTASH_REDIS_REST_TOKEN = originalUpstashToken;
  }

  // --------------------------------------------------------------------------
  // 4. Verificación de Endpoints HTTP y Controladores Asíncronos
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Endpoints HTTP & Controladores Asíncronos ---');

  // 4.1 Health Check
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert.equal(healthRes.status, 200, 'Health check falló');
  const healthData = await healthRes.json();
  assert.equal(healthData.status, 'ok', 'Health status debe ser ok');
  console.log('✓ GET /api/health respondió 200 OK');

  // 4.2 Login
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'clip2026' })
  });
  assert.equal(loginRes.status, 200, 'Login falló');
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert(token, 'Token JWT no recibido');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
  console.log('✓ POST /api/auth/login autenticado con éxito');

  // 4.3 GET /api/campaigns
  const campsRes = await fetch(`${BASE_URL}/api/campaigns`, { headers: authHeaders });
  assert.equal(campsRes.status, 200, 'Error al listar campañas');
  const campaigns = await campsRes.json();
  assert(Array.isArray(campaigns) && campaigns.length > 0, 'Debe haber campañas registradas');
  console.log(`✓ GET /api/campaigns retornó ${campaigns.length} campañas`);

  // 4.4 POST, PATCH, DELETE en /api/campaigns
  const newCampName = `Campaña Test Vercel ${Date.now()}`;
  const createCampRes = await fetch(`${BASE_URL}/api/campaigns`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: newCampName,
      color: '#ec4899',
      folderInput: '1TestFolderIdForVercelStorage99'
    })
  });
  assert.equal(createCampRes.status, 201, 'Error al crear campaña de prueba');
  const createdCamp = await createCampRes.json();
  assert.equal(createdCamp.name, newCampName, 'Nombre de campaña no coincide');
  console.log(`✓ POST /api/campaigns creó campaña "${createdCamp.name}" (ID: ${createdCamp.id})`);

  // Actualizar campaña
  const updateCampRes = await fetch(`${BASE_URL}/api/campaigns/${createdCamp.id}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ name: `${newCampName} - Editada` })
  });
  assert.equal(updateCampRes.status, 200, 'Error al actualizar campaña');
  const updatedCamp = await updateCampRes.json();
  assert.equal(updatedCamp.name, `${newCampName} - Editada`, 'Nombre actualizado no coincide');
  console.log(`✓ PATCH /api/campaigns/${createdCamp.id} actualizó el nombre correctamente`);

  // Eliminar campaña de prueba
  const deleteCampRes = await fetch(`${BASE_URL}/api/campaigns/${createdCamp.id}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  if (!deleteCampRes.ok) {
    const errText = await deleteCampRes.text();
    console.error(`Error deleting campaign ${createdCamp.id}: HTTP ${deleteCampRes.status}: ${errText}`);
  }
  assert.equal(deleteCampRes.status, 200, 'Error al eliminar campaña');
  console.log(`✓ DELETE /api/campaigns/${createdCamp.id} limpió la campaña de prueba`);

  // 4.5 GET & PATCH /api/videos
  const videosRes = await fetch(`${BASE_URL}/api/videos`, { headers: authHeaders });
  assert.equal(videosRes.status, 200, 'Error al listar vídeos');
  const videos = await videosRes.json();
  assert(Array.isArray(videos) && videos.length > 0, 'Debe haber vídeos registrados');
  console.log(`✓ GET /api/videos retornó ${videos.length} clips`);

  const sampleVideo = videos[0];
  const patchVideoRes = await fetch(`${BASE_URL}/api/videos/${sampleVideo.id}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      notes: `Nota de verificación Vercel ${Date.now()}`
    })
  });
  assert.equal(patchVideoRes.status, 200, 'Error al actualizar notas de vídeo');
  const patchedVideo = await patchVideoRes.json();
  assert(patchedVideo.notes.startsWith('Nota de verificación Vercel'), 'Notas no actualizadas');
  console.log(`✓ PATCH /api/videos/${sampleVideo.id} actualizó notas correctamente`);

  // 4.6 GET /api/stats
  const statsRes = await fetch(`${BASE_URL}/api/stats`, { headers: authHeaders });
  assert.equal(statsRes.status, 200, 'Error al obtener estadísticas');
  const stats = await statsRes.json();
  assert(stats.totals && stats.platforms && stats.campaignProgress, 'Estructura de stats inválida');
  console.log(`✓ GET /api/stats: ${stats.totals.totalVideos} clips, ${stats.totals.editedVideos} editados, ${stats.totals.totalUploads} subidas`);

  // 4.7 GET & POST /api/config
  const configRes = await fetch(`${BASE_URL}/api/config`, { headers: authHeaders });
  assert.equal(configRes.status, 200, 'Error al consultar configuración');
  const configData = await configRes.json();
  assert('hasAppsScript' in configData, 'Configuración debe indicar hasAppsScript');
  console.log('✓ GET /api/config respondió con la configuración segura del sistema');

  console.log('\n===============================================================');
  console.log('🎉 ¡TODOS LOS TESTS DE VERCEL SERVERLESS Y STORAGE DUAL PASARON!');
  console.log('===============================================================');
}

runTests().catch((err) => {
  console.error('\n❌ ERROR EN PRUEBAS DE VERCEL & STORAGE DUAL:', err);
  process.exit(1);
});
