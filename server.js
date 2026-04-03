/**
 * Dependency-free Node.js server to host the Angular SPA on Azure App Service (Linux/Node).
 * Uses only built-in modules so no npm install is needed after deployment.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 8080;
const distPath = __dirname;

const mimeTypes = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.eot':  'application/vnd.ms-fontobject',
  '.txt':  'text/plain',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer((req, res) => {
  // Strip query string
  let urlPath = req.url.split('?')[0];

  // Resolve file path
  let filePath = path.join(distPath, urlPath);

  // Check if it's a file that exists
  let stat;
  try { stat = fs.statSync(filePath); } catch (_) { stat = null; }

  if (!stat || stat.isDirectory()) {
    // SPA fallback — serve index.html for all non-file routes
    filePath = path.join(distPath, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  // Cache headers
  const isIndexHtml = path.basename(filePath) === 'index.html';
  const cacheControl = isIndexHtml ? 'no-cache, no-store, must-revalidate' : 'public, max-age=31536000, immutable';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`ETSW frontend running on port ${port}`);
});
