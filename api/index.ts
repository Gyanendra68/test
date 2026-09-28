import express from 'express';
import { initDatabase } from '../server/db.js';
import { apiRouter, UPLOAD_DIR } from '../server/routes.js';

// This file is the single Vercel "Node.js Function" that backs the whole
// TribalScholar API in production. vercel.json rewrites every
// /api/* and /uploads/* request to this function, so it behaves the same
// way the Express app in server.ts does for local development — same
// apiRouter, same middleware, same JSON shape. The only difference is where
// the SQLite file / uploaded files are written (see server/runtime.ts),
// because a Vercel Function's filesystem is read-only outside of /tmp.

const app = express();

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serverless functions are invoked per-request, but a warm container can be
// reused for several requests. We only want to run initDatabase() (which
// reads/seeds the SQLite file) once per warm container, not on every
// request, so the in-flight/resolved promise is cached at module scope and
// every request waits on it before hitting a route that touches the DB.
let dbReady: Promise<void> | null = null;

app.use((_req, res, next) => {
  if (!dbReady) {
    dbReady = initDatabase();
  }
  dbReady.then(() => next()).catch((err) => {
    dbReady = null; // allow a retry on the next request instead of wedging forever
    console.error('[TribalScholar] Database init failed:', err);
    res.status(500).json({ error: 'Database initialization failed' });
  });
});

// Uploaded files (served back out the same way server.ts does locally).
// NOTE: on Vercel this only serves files uploaded to the *current* warm
// function instance's /tmp — see the persistence note in server/runtime.ts.
app.use('/uploads', express.static(UPLOAD_DIR));

// Same router the local server uses, mounted the same way.
app.use('/api', apiRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'TribalScholar Backend', timestamp: new Date().toISOString() });
});

export default app;
