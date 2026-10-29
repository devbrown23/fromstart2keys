// /api/deal.js  (Vercel serverless on Node)
// Powers fromstart2keys.com/deal: one permanent link that always shows this week's Deal of the Week.
//
//   GET                         -> { ok, deal }                public: the current deal (no stats)
//   GET  ?photo=1               -> the cover photo (JPEG)
//   GET  ?go=1&src=instagram    -> counts the click, then redirects to the MLS share link
//   POST ?view=1&src=instagram  -> counts a page view (?lead=1 counts a form sent)
//   GET  with X-CRM-Passcode    -> { ok, deal, stats }         agent: also click and view counts
//   PUT  with X-CRM-Passcode    -> saves a new deal (and photo); resets the counts when the address changes
//
// Requires env vars: CRM_PASSCODE, plus the Upstash Redis vars (same database as /api/cc-sync and /api/lender-pool).

const DEAL_KEY = 'deal:current';
const PHOTO_KEY = 'deal:photo';
const STATS_KEY = 'deal:stats';

const FIELDS = {
  headline: 120, address: 120, city: 80, price: 30, originalPrice: 30, beds: 10, baths: 10, sqft: 20,
  dealTitle: 120, dealText: 400, highlights: 1500, shareUrl: 600, mlsNumber: 20,
  listingBroker: 80, listingFirm: 80, agentName: 80, agentPhone: 30, agentFirm: 80,
};

function redisConfig() {
  const env = process.env;
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL ||
    Object.entries(env).find(([k]) => k.endsWith('_REST_API_URL'))?.[1];
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN ||
    Object.entries(env).find(([k]) => k.endsWith('_REST_API_TOKEN') && !k.endsWith('_READ_ONLY_TOKEN'))?.[1];
  return url && token ? { url, token } : null;
}

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

function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

// Only a short list of known sources, so the stats can't be flooded with junk keys.
function source(src) {
  const s = String(src || '').toLowerCase();
  return ['instagram', 'facebook', 'tiktok', 'text', 'email', 'linktree'].includes(s) ? s : 'other';
}

function isShareUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

export default async function handler(req, res) {
  const config = redisConfig();
  if (!config) return res.status(500).json({ ok: false, error: 'Database not connected' });
  const q = req.query || {};
  const isAgent = same(req.headers['x-crm-passcode'] || '', process.env.CRM_PASSCODE || '');

  try {
    if (req.method === 'GET' && q.photo) {
      const data = await redis(config, ['GET', PHOTO_KEY]);
      if (!data) return res.status(404).end();
      const buf = Buffer.from(String(data).replace(/^data:image\/\w+;base64,/, ''), 'base64');
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).send(buf);
    }

    if (req.method === 'GET' && q.go) {
      const raw = await redis(config, ['GET', DEAL_KEY]);
      const deal = raw ? JSON.parse(raw) : null;
      if (!deal || !isShareUrl(deal.shareUrl)) {
        res.setHeader('Location', '/deal');
        return res.status(302).end();
      }
      await redis(config, ['HINCRBY', STATS_KEY, `click:${source(q.src)}`, 1]).catch(() => {});
      res.setHeader('Location', deal.shareUrl);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(302).end();
    }

    if (req.method === 'POST' && (q.view || q.lead)) {
      await redis(config, ['HINCRBY', STATS_KEY, `${q.lead ? 'lead' : 'view'}:${source(q.src)}`, 1]);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      const raw = await redis(config, ['GET', DEAL_KEY]);
      const deal = raw ? JSON.parse(raw) : null;
      res.setHeader('Cache-Control', 'no-store');
      if (!isAgent) {
        if (deal) delete deal.shareUrl; // public page sends clicks through ?go=1 so they get counted
        return res.status(200).json({ ok: true, deal });
      }
      const flat = (await redis(config, ['HGETALL', STATS_KEY])) || [];
      const stats = {};
      for (let i = 0; i < flat.length; i += 2) stats[flat[i]] = Number(flat[i + 1]) || 0;
      return res.status(200).json({ ok: true, deal, stats });
    }

    if (req.method === 'PUT') {
      if (!process.env.CRM_PASSCODE) return res.status(500).json({ ok: false, error: 'Server not configured' });
      if (!isAgent) return res.status(401).json({ ok: false, error: 'Wrong passcode' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const deal = {};
      for (const [k, max] of Object.entries(FIELDS)) deal[k] = String(body[k] ?? '').trim().slice(0, max);
      if (!deal.address || !deal.price) return res.status(400).json({ ok: false, error: 'Add at least the address and price.' });
      if (deal.shareUrl && !isShareUrl(deal.shareUrl)) return res.status(400).json({ ok: false, error: 'The MLS share link should start with https://' });

      const prevRaw = await redis(config, ['GET', DEAL_KEY]);
      const prev = prevRaw ? JSON.parse(prevRaw) : null;
      if (body.photo) {
        if (!/^data:image\/jpeg;base64,/.test(body.photo) || body.photo.length > 900000) {
          return res.status(400).json({ ok: false, error: 'Photo is too large. Try a smaller one.' });
        }
        await redis(config, ['SET', PHOTO_KEY, body.photo]);
        deal.photoVersion = Date.now().toString(36);
      } else if (body.removePhoto) {
        await redis(config, ['DEL', PHOTO_KEY]);
        deal.photoVersion = '';
      } else {
        deal.photoVersion = prev?.photoVersion || '';
      }
      if (!prev || prev.address !== deal.address) await redis(config, ['DEL', STATS_KEY]);
      deal.updatedAt = new Date().toISOString();
      await redis(config, ['SET', DEAL_KEY, JSON.stringify(deal)]);
      return res.status(200).json({ ok: true, deal });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('deal error:', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong. Try again.' });
  }
}
