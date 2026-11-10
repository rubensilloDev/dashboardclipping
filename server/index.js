/**
 * Servidor Principal de la Aplicación de Clipping (Express en Node.js)
 * Proporciona la API REST segura y sirve los archivos estáticos del frontend.
 */

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';

import { authRouter } from './routes/auth.js';
import { campaignsRouter } from './routes/campaigns.js';
import { videosRouter } from './routes/videos.js';
import { statsRouter } from './routes/stats.js';
import { configRouter } from './routes/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================================================================
// Middlewares Globales
// ==============================================================================
app.use(cors());
app.use(express.json());

// ==============================================================================
// Rutas de la API REST
// ==============================================================================
app.use('/api/auth', authRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/videos', videosRouter);
app.use('/api/stats', statsRouter);
app.use('/api/config', configRouter);

// Endpoint de salud del servidor
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ==============================================================================
// Servidor de Archivos Estáticos del Frontend
// ==============================================================================
app.use(express.static(ROOT_DIR));

// Ruta comodín compatible con Express 5 para servir index.html en cualquier ruta del cliente
app.use((req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

// ==============================================================================
// Inicialización del Servidor HTTP
// ==============================================================================
export { app };

if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log('========================================================');
    console.log(`🚀 ClipFlow Studio iniciado en http://localhost:${PORT}`);
    console.log(`🔐 Modo de autenticación: Simple con scrypt y HMAC-SHA256`);
    console.log(`📁 Directorio raíz: ${ROOT_DIR}`);
    console.log('========================================================');
  });
}
