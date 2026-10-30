// /api/listings.js  (Vercel serverless on Node)
// Real homes for the "Available Homes" section, added by Devin at /listings/edit.
// (NWMLS listings can't be pulled automatically without an IDX feed, so each home is added by hand
// with its MLS share link. Only add homes you're allowed to advertise.)
//
//   GET                        -> { ok, listings }             public; also includes the live Deal of the Week
//   GET  ?photo=<id>           -> the listing photo (JPEG)
//   GET  ?go=<id>&src=site     -> counts the click, then redirects to the MLS share link
//   GET  with X-CRM-Passcode   -> { ok, listings, clicks }      agent view (includes hidden fields)
//   PUT  { listing }           -> agent: add or update (with optional photo as a JPEG data URL)
//   DELETE ?id=<id>            -> agent: remove
//
// Requires: CRM_PASSCODE and the Upstash Redis vars (same database as /api/deal).

const KEY = 'listings:items';      // hash id -> JSON
const CLICKS = 'listings:clicks';  // hash id -> count
const PHOTO = (id) => `listings:photo:${id}`;
const DEAL_KEY = 'deal:current';

const FIELDS = { address: 120, city: 80, price: 20, beds: 6, baths: 6, sqft: 12, badge: 30, mls: 12, shareUrl: 600,
  listingBroker: 80, listingFirm: 80, status: 20, openHouse: 80 };
const BADGES = ['', 'New', 'Open House', 'Price Drop', 'Coming Soon', 'Pending', 'Deal of the Week'];

function redisConfig() {
  const env = process.env;
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || Object.entries(env).find(([k]) => k.endsWith('_REST_API_URL'))?.[1];
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN ||
    Object.entries(env).find(([k]) => k.endsWith('_REST_API_TOKEN') && !k.endsWith('_READ_ONLY_TOKEN'))?.[1];
  return url && token ? { url, token } : null;
}
async function redis(c, cmd) {
  const r = await fetch(c.url, { method: 'POST', headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) throw new Error(body.error || `Redis error ${r.status}`);
  return body.result;
}
function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
const isHttps = (u) => { try { return new URL(u).protocol === 'https:'; } catch (e) { return false; } };
const num = (v) => Number(String(v || '').replace(/[^0-9.]/g, '')) || 0;
const pairs = (flat) => { const o = {}; for (let i = 0; i < (flat || []).length; i += 2) o[flat[i]] = flat[i + 1]; return o; };

function publicView(l) {
  return { id: l.id, address: l.address, city: l.city, price: num(l.price), beds: num(l.beds), baths: num(l.baths), sqft: num(l.sqft),
    badge: l.badge || '', status: l.status || 'Active', openHouse: l.openHouse || '', mls: l.mls || '',
    listingBroker: l.listingBroker || '', listingFirm: l.listingFirm || '', hasLink: !!l.shareUrl,
    photo: l.photoVersion ? `/api/listings?photo=${encodeURIComponent(l.id)}&v=${l.photoVersion}` : (l.photoUrl || ''),
    updatedAt: l.updatedAt, fromDeal: !!l.fromDeal };
}

// The live Deal of the Week shows up as a listing too (unless it was already added by hand).
async function dealAsListing(c) {
  const raw = await redis(c, ['GET', DEAL_KEY]).catch(() => null);
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d.address || !d.price) return null;
    return { id: 'deal', fromDeal: true, address: d.address, city: d.city || '', price: d.price, beds: d.beds, baths: d.baths, sqft: d.sqft,
      badge: 'Deal of the Week', mls: d.mlsNumber || '', shareUrl: d.shareUrl || '', listingBroker: d.listingBroker || '', listingFirm: d.listingFirm || '',
      photoUrl: d.photoVersion ? `/api/deal?photo=1&v=${d.photoVersion}` : '', updatedAt: d.updatedAt };
  } catch (e) { return null; }
}

export default async function handler(req, res) {
  const c = redisConfig();
  if (!c) return res.status(500).json({ ok: false, error: 'Database not connected' });
  const q = req.query || {};
  const agent = same(String(req.headers['x-crm-passcode'] || '').trim(), (process.env.CRM_PASSCODE || '').trim());

  try {
    if (req.method === 'GET' && q.photo) {
      const data = await redis(c, ['GET', PHOTO(String(q.photo).slice(0, 40))]);
      if (!data) return res.status(404).end();
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(Buffer.from(String(data).replace(/^data:image\/\w+;base64,/, ''), 'base64'));
    }

    if (req.method === 'GET' && q.go) {
      const id = String(q.go).slice(0, 40);
      let l = null;
      if (id === 'deal') l = await dealAsListing(c);
      else { const raw = await redis(c, ['HGET', KEY, id]); l = raw ? JSON.parse(raw) : null; }
      if (!l || !isHttps(l.shareUrl)) { res.setHeader('Location', '/#available'); return res.status(302).end(); }
      if (!q.me) await redis(c, ['HINCRBY', CLICKS, id, 1]).catch(() => {});
      res.setHeader('Location', l.shareUrl);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(302).end();
    }

    if (req.method === 'GET') {
      const items = Object.values(pairs(await redis(c, ['HGETALL', KEY]))).map((s) => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
      const deal = await dealAsListing(c);
      if (deal && !items.some((l) => (l.mls && l.mls === deal.mls) || l.address.toLowerCase() === deal.address.toLowerCase())) items.unshift(deal);
      items.sort((a, b) => (a.fromDeal ? -1 : b.fromDeal ? 1 : (b.updatedAt || '').localeCompare(a.updatedAt || '')));
      res.setHeader('Cache-Control', 'no-store');
      if (!agent) return res.status(200).json({ ok: true, listings: items.filter((l) => l.status !== 'Sold' && l.status !== 'Draft').map(publicView) });
      const clicks = pairs(await redis(c, ['HGETALL', CLICKS]));
      return res.status(200).json({ ok: true, listings: items.map((l) => ({ ...publicView(l), shareUrl: l.shareUrl || '' })), clicks });
    }

    if (!process.env.CRM_PASSCODE) return res.status(500).json({ ok: false, error: 'Server not configured' });
    if (!agent) return res.status(401).json({ ok: false, error: 'Wrong passcode' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    if (req.method === 'PUT') {
      const input = body.listing || body;
      const l = {};
      for (const [k, max] of Object.entries(FIELDS)) l[k] = String(input[k] ?? '').trim().slice(0, max);
      if (!l.address || !num(l.price)) return res.status(400).json({ ok: false, error: 'Add at least the address and price.' });
      if (l.shareUrl && !isHttps(l.shareUrl)) return res.status(400).json({ ok: false, error: 'The MLS share link should start with https://' });
      if (!BADGES.includes(l.badge)) l.badge = '';
      if (!['Active', 'Pending', 'Sold', 'Draft'].includes(l.status)) l.status = 'Active';
      const id = String(input.id || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || `l_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      if (id === 'deal') return res.status(400).json({ ok: false, error: 'Edit the Deal of the Week at /deal/edit.' });
      const prevRaw = await redis(c, ['HGET', KEY, id]);
      const prev = prevRaw ? JSON.parse(prevRaw) : {};
      if (input.photo) {
        if (!/^data:image\/jpeg;base64,/.test(input.photo) || input.photo.length > 900000) return res.status(400).json({ ok: false, error: 'Photo is too large. Try a smaller one.' });
        await redis(c, ['SET', PHOTO(id), input.photo]);
        l.photoVersion = Date.now().toString(36);
      } else if (input.removePhoto) {
        await redis(c, ['DEL', PHOTO(id)]); l.photoVersion = '';
      } else l.photoVersion = prev.photoVersion || '';
      const saved = { ...l, id, createdAt: prev.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
      await redis(c, ['HSET', KEY, id, JSON.stringify(saved)]);
      return res.status(200).json({ ok: true, listing: publicView(saved) });
    }

    if (req.method === 'DELETE') {
      const id = String(q.id || body.id || '').slice(0, 40);
      if (!id || id === 'deal') return res.status(400).json({ ok: false, error: 'Missing listing' });
      await redis(c, ['HDEL', KEY, id]); await redis(c, ['DEL', PHOTO(id)]); await redis(c, ['HDEL', CLICKS, id]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('listings error:', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong. Try again.' });
  }
}
