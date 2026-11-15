// /api/_sigphoto.js  (served at /api/sig-photo: vercel.json rewrites it to /api/spar?tool=sigphoto.
// The leading _ keeps it from counting as its own function; Vercel Hobby allows 12.)
//
// Stores the headshot for the email signature built at /signature, already cropped in the browser.
//
//   GET  ?meta=1                 -> { ok, v }                 public: which photo version is saved ('' when none)
//   GET  ?shape=portrait|square  -> the photo (JPEG)          public: email apps load it from here
//   POST { portrait, square }    -> { ok, v }                 CRM passcode: save new crops (JPEG data URLs)
//   DELETE                       -> { ok }                    CRM passcode: remove the photo

const KEY = (shape) => `sig:photo:${shape}`;
const VERSION_KEY = 'sig:photo:v';
const SHAPES = ['portrait', 'square'];
const MAX = 450000; // characters of data URL per crop (~330 KB)

function redisConfig() {
  const env = process.env;
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || Object.entries(env).find(([k]) => k.endsWith('_REST_API_URL'))?.[1];
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN ||
    Object.entries(env).find(([k]) => k.endsWith('_REST_API_TOKEN') && !k.endsWith('_READ_ONLY_TOKEN'))?.[1];
  return url && token ? { url, token } : null;
}
async function redis(c, command) {
  const r = await fetch(c.url, { method: 'POST', headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) throw new Error(body.error || `Redis ${r.status}`);
  return body.result;
}

export default async function sigPhoto(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const c = redisConfig();
  if (!c) return res.status(500).json({ ok: false, error: 'Database not connected' });
  const q = req.query || {};

  try {
    if (req.method === 'GET' && q.meta) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, v: (await redis(c, ['GET', VERSION_KEY])) || '' });
    }

    if (req.method === 'GET') {
      const shape = SHAPES.includes(q.shape) ? q.shape : 'portrait';
      const data = await redis(c, ['GET', KEY(shape)]);
      if (!data) return res.status(404).end();
      res.setHeader('Content-Type', 'image/jpeg');
      // The link carries ?v=<version>, so a new photo gets a new address and this one can be cached for a long time.
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.status(200).send(Buffer.from(String(data).replace(/^data:image\/\w+;base64,/, ''), 'base64'));
    }

    const passcode = (process.env.CRM_PASSCODE || '').trim();
    if (!passcode) return res.status(500).json({ ok: false, error: 'Server not configured' });
    if (String(req.headers['x-crm-passcode'] || '').trim() !== passcode) return res.status(401).json({ ok: false, error: 'Wrong passcode' });

    if (req.method === 'POST') {
      const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) || {};
      for (const shape of SHAPES) {
        const d = body[shape];
        if (typeof d !== 'string' || !/^data:image\/jpeg;base64,/.test(d)) return res.status(400).json({ ok: false, error: 'Pick a photo first.' });
        if (d.length > MAX) return res.status(400).json({ ok: false, error: 'That photo is too large. Try again.' });
      }
      const v = Date.now().toString(36);
      await Promise.all([...SHAPES.map((shape) => redis(c, ['SET', KEY(shape), body[shape]])), redis(c, ['SET', VERSION_KEY, v])]);
      return res.status(200).json({ ok: true, v });
    }

    if (req.method === 'DELETE') {
      await redis(c, ['DEL', ...SHAPES.map(KEY), VERSION_KEY]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('sig-photo error:', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong. Try again.' });
  }
}
