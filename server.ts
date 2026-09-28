
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db.js';
import { apiRouter } from './server/routes.js';
import { isSupportedTranslationLanguage, translateText } from './server/translation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Initialize Relational Database & Seed Data
  await initDatabase();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Uploaded files static serve
  app.use('/uploads', express.static(path.resolve('uploads')));
  app.use(express.static(path.resolve('public')));

  // API router
  app.post('/api/translate', async (req, res) => {
    const { text, language } = req.body as { text?: unknown; language?: unknown };

    if (typeof text !== 'string' || !text.trim() || typeof language !== 'string' || !isSupportedTranslationLanguage(language)) {
      res.status(400).json({ error: 'A non-empty text and supported target language are required.' });
      return;
    }

    const result = await translateText(text, language);
    res.json(result);
  });
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'TribalScholar Backend', timestamp: new Date().toISOString() });
  });

  // Vite integration
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TribalScholar] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[TribalScholar] Failed to start server:', err);
  process.exit(1);
});
