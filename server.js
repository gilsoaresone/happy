const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs/promises');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const DATA_FILE = path.join(__dirname, 'data', 'birthday-posts.json');
const DIST_DIR = path.join(__dirname, 'dist', 'feliz-aniversario', 'browser');

const STICKER_OPTIONS = [
  { id: 'confetti-turbo', emoji: '\u{1F389}', label: 'Confete turbo', tone: 'party' },
  { id: 'bolo-liberado', emoji: '\u{1F382}', label: 'Modo bolo', tone: 'sweet' },
  { id: 'brilho-maximo', emoji: '\u2728', label: 'Brilho maximo', tone: 'shine' },
  { id: 'abraco-pixelado', emoji: '\u{1FAF6}', label: 'Abraco pixelado', tone: 'retro' },
];

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
  });
  response.end(message);
}

async function ensureDataFile() {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]\n', 'utf8');
  }
}

async function readPosts() {
  await ensureDataFile();

  const raw = await fs.readFile(DATA_FILE, 'utf8');

  try {
    const posts = JSON.parse(raw);

    if (!Array.isArray(posts)) {
      return [];
    }

    return posts
      .filter(isStoredPost)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  } catch {
    return [];
  }
}

async function writePosts(posts) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, `${JSON.stringify(posts, null, 2)}\n`, 'utf8');
}

function isStoredPost(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'number' &&
    typeof value.author === 'string' &&
    typeof value.initials === 'string' &&
    typeof value.handle === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.emoji === 'string' &&
    value.sticker &&
    typeof value.sticker.id === 'string' &&
    typeof value.sticker.emoji === 'string' &&
    typeof value.sticker.label === 'string' &&
    typeof value.sticker.tone === 'string' &&
    typeof value.message === 'string'
  );
}

function sanitizeText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function buildInitials(author) {
  return (
    author
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || 'HB'
  );
}

function buildHandle(author) {
  const slug = author
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');

  return `@${slug || 'parabens'}`;
}

function resolveSticker(stickerId) {
  return STICKER_OPTIONS.find((sticker) => sticker.id === stickerId) || STICKER_OPTIONS[0];
}

function parseRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        reject(new Error('Payload too large'));
      }
    });

    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });

    request.on('error', reject);
  });
}

async function handleApi(request, response, pathname) {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Origin': '*',
    });
    response.end();
    return true;
  }

  if (pathname === '/api/posts' && request.method === 'GET') {
    const posts = await readPosts();
    sendJson(response, 200, posts);
    return true;
  }

  if (pathname === '/api/posts' && request.method === 'POST') {
    let body;

    try {
      body = await parseRequestBody(request);
    } catch (error) {
      const statusCode = error.message === 'Payload too large' ? 413 : 400;
      sendJson(response, statusCode, { message: error.message });
      return true;
    }

    const author = sanitizeText(body.author, 32);
    const message = sanitizeText(body.message, 220);
    const emoji = sanitizeText(body.emoji, 16);
    const stickerId = sanitizeText(body.stickerId, 64);

    if (!author || !message || !emoji) {
      sendJson(response, 400, { message: 'author, message and emoji are required' });
      return true;
    }

    const nextPost = {
      id: Date.now(),
      author,
      initials: buildInitials(author),
      handle: buildHandle(author),
      createdAt: new Date().toISOString(),
      emoji,
      sticker: resolveSticker(stickerId),
      message,
    };

    const posts = await readPosts();
    await writePosts([nextPost, ...posts]);
    sendJson(response, 201, nextPost);
    return true;
  }

  return false;
}

async function serveStatic(response, pathname) {
  const relativePath = pathname.replace(/^\/+/, '');
  let filePath =
    pathname === '/' ? path.join(DIST_DIR, 'index.html') : path.join(DIST_DIR, relativePath);
  filePath = path.normalize(filePath);

  if (!filePath.startsWith(DIST_DIR)) {
    sendText(response, 403, 'Forbidden');
    return;
  }

  try {
    const stats = await fs.stat(filePath);

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const fileBuffer = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();

    response.writeHead(200, {
      'Content-Type': CONTENT_TYPES[extension] || 'application/octet-stream',
    });
    response.end(fileBuffer);
  } catch {
    try {
      const indexFile = await fs.readFile(path.join(DIST_DIR, 'index.html'));
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(indexFile);
    } catch {
      sendText(
        response,
        404,
        'Build nao encontrado. Rode "npm run build" para servir a aplicacao por este servidor.'
      );
    }
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const parsedUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(parsedUrl.pathname);

    if (await handleApi(request, response, pathname)) {
      return;
    }

    await serveStatic(response, pathname);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { message: 'internal server error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Birthday server running at http://${HOST}:${PORT}`);
});
