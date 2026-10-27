// /api/cc-sync.js  (Vercel serverless on Node)
// Cloud copy of the Command Center, so phone and laptop share one set of data.
// Stores the whole app state as one JSON document in Upstash Redis (Vercel Storage → Upstash for Redis).
// Requires env vars: CRM_PASSCODE, plus KV_REST_API_URL + KV_REST_API_TOKEN
// (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN), which Vercel adds when the database is connected.

const ALLOWED_ORIGINS = [
  'https://devbrown23.github.io',
  'http://localhost:5173',
  'null', // index.html opened straight from disk
];

const KEY = 'cc:state';
const BACKUP_KEY = 'cc:state:previous';

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CRM-Passcode');
}

// Finds the Upstash REST credentials whatever prefix Vercel gave them (KV_, STORAGE_, ...).
function redisConfig() {
  const env = process.env;
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL ||
    Object.entries(env).find(([k]) => k.endsWith('_REST_API_URL'))?.[1];
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN ||
    Object.entries(env).find(([k]) => k.endsWith('_REST_API_TOKEN') && !k.endsWith('_READ_ONLY_TOKEN'))?.[1];
  return url && token ? { url, token } : null;
}

// Runs one Redis command through Upstash's REST API, e.g. ['GET', 'key'].
async function redis(config, command) {
  const r = await fetch(config.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) throw new Error(body.error || `Redis error ${r.status}`);
  return body.result;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'PUT') {
    res.setHeader('Allow', ['GET', 'PUT', 'OPTIONS']);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const passcode = process.env.CRM_PASSCODE;
  const config = redisConfig();
  if (!passcode || !config) {
    console.error('Missing CRM_PASSCODE or Upstash Redis env vars.');
    return res.status(500).json({ ok: false, error: !passcode ? 'Server not configured' : 'Database not connected' });
  }
  if (req.headers['x-crm-passcode'] !== passcode) {
    return res.status(401).json({ ok: false, error: 'Wrong passcode' });
  }

  try {
    const stored = await redis(config, ['GET', KEY]);
    const current = stored ? JSON.parse(stored) : { version: null, data: null, updatedAt: null };

    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, ...current });
    }

    const { data, baseVersion } = req.body || {};
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ ok: false, error: 'Missing data' });
    }
    // Another device saved since this one last synced: send back the newer copy instead of overwriting it.
    if (baseVersion !== undefined && current.version !== null && baseVersion !== current.version) {
      return res.status(409).json({ ok: false, error: 'Newer data in the cloud', ...current });
    }

    const next = { version: (current.version || 0) + 1, data, updatedAt: new Date().toISOString() };
    if (stored) await redis(config, ['SET', BACKUP_KEY, stored]);
    await redis(config, ['SET', KEY, JSON.stringify(next)]);
    return res.status(200).json({ ok: true, version: next.version, updatedAt: next.updatedAt });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Database error' });
  }
}
