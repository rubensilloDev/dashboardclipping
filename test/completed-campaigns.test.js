import assert from 'node:assert';

async function runTests() {
  console.log('--- Iniciando Pruebas de Campañas Finalizadas y Reactivación ---');

  // 1. Obtener token de admin
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'clip2026' })
  });
  assert.equal(loginRes.status, 200, 'Login falló');
  const loginData = await loginRes.json();
  const token = loginData.token;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  // 2. Obtener lista de campañas
  const campsRes = await fetch('http://localhost:3000/api/campaigns', { headers });
  assert.equal(campsRes.status, 200, 'Error obteniendo campañas');
  const campaigns = await campsRes.json();
  assert(Array.isArray(campaigns) && campaigns.length > 0, 'No hay campañas');
  console.log(`✓ Campañas registradas: ${campaigns.length}`);

  const targetCamp = campaigns[0];
  console.log(`✓ Campaña de prueba seleccionada: "${targetCamp.name}" (ID: ${targetCamp.id}, isCompleted=${targetCamp.isCompleted})`);

  // 3. Marcar como finalizada
  const finalizeRes = await fetch(`http://localhost:3000/api/campaigns/${targetCamp.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ isCompleted: true })
  });
  assert.equal(finalizeRes.status, 200, 'Error finalizando campaña');
  const finalizedData = await finalizeRes.json();
  assert.equal(finalizedData.isCompleted, true, 'isCompleted debe ser true');
  assert(finalizedData.completedAt, 'completedAt debe tener una fecha ISO');
  console.log(`✓ Campaña finalizada con éxito. Fecha de cierre: ${finalizedData.completedAt}`);

  // 4. Verificar en /api/stats
  const statsRes = await fetch('http://localhost:3000/api/stats', { headers });
  assert.equal(statsRes.status, 200, 'Error obteniendo estadísticas');
  const statsData = await statsRes.json();
  const progressItem = statsData.campaignProgress.find((cp) => cp.id === targetCamp.id);
  assert(progressItem, 'Progreso de campaña no encontrado en stats');
  assert.equal(progressItem.isCompleted, true, 'isCompleted debe ser true en stats');
  console.log(`✓ Verificado en /api/stats: "${progressItem.name}" isCompleted=true`);

  // 5. Reactivar campaña
  const reactivateRes = await fetch(`http://localhost:3000/api/campaigns/${targetCamp.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ isCompleted: false })
  });
  assert.equal(reactivateRes.status, 200, 'Error reactivando campaña');
  const reactivatedData = await reactivateRes.json();
  assert.equal(reactivatedData.isCompleted, false, 'isCompleted debe ser false');
  assert.equal(reactivatedData.completedAt, null, 'completedAt debe ser null');
  console.log(`✓ Campaña reactivada con éxito (isCompleted=${reactivatedData.isCompleted}, completedAt=${reactivatedData.completedAt})`);

  // 6. Comprobar actividades registradas
  const lastActivity = statsData.recentActivities[0];
  console.log(`✓ Última actividad registrada en stats: "${lastActivity?.text}"`);

  console.log('\n--- TODAS LAS PRUEBAS DE CAMPAÑAS FINALIZADAS COMPLETADAS (100% ÉXITO) ---');
}

runTests().catch((err) => {
  console.error('Error en pruebas de campañas finalizadas:', err);
  process.exit(1);
});
