import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml'],
};
const port = Number(process.env.PORT || 5173);

createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const file = files[path];
  if (!file || !['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const content = await readFile(new URL(`./public/${file[0]}`, import.meta.url));
    response.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-cache' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch (error) {
    console.error(error);
    response.writeHead(500).end('Unable to load the checklist');
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`Fishing checklist: http://localhost:${port}`);
});
