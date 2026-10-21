import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ override: true });

// Load the API after .env so its module-level setup sees the variables
const { createApi } = await import('./server/api');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Local / web host: the shared API routes plus the web app (Vite in development, dist/ in
 * production) and the debug APK download. The mobile apps use the same API deployed as a
 * Supabase Edge Function (supabase/functions/api).
 */
async function startServer() {
  const app = createApi();
  const port = Number(process.env.PORT) || 3000;

  // Dynamic Android APK download (avoids storing binary inside public/ directory which bloats the APK build)
  app.get(['/app-debug.apk', '/TaxVault-debug.apk'], (_req, res) => {
    const candidates = [
      path.resolve(__dirname, 'TaxVault-debug.apk'),
      path.resolve(__dirname, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return res.download(candidate, 'TaxVault-v2.5.0-debug.apk');
      }
    }
    return res.status(404).json({ error: 'Android APK build not found. Run npm run android:apk first.' });
  });

  // In development, mount Vite's middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve dist folder
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`TaxVault India API Engine running on http://0.0.0.0:${port}`);
  });
}

startServer();
