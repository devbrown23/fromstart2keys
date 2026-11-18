// /api/_card.js  (served at /api/card and /go/<link>: vercel.json rewrites both to /api/spar?tool=card.
// The leading _ keeps it from counting as its own function; Vercel Hobby allows 12.)
//
// Tracking for the email signature and the digital card page (/card), so the Command Center can see the traffic.
//
//   GET  /go/<link>?s=sig            -> counts the click, then redirects (allow-listed links only, so it can't be an open redirect)
//   GET  /go/save?s=sig              -> counts a "save contact", then downloads the contact card (.vcf, with photo when one is saved)
//   GET  /api/card?contact=1         -> { ok, phone, email }  public: what the /card page shows
//   POST /api/card?view=1&s=sig      -> counts a /card page view   (?lead=1 counts a form sent)
//   GET  /api/card  + X-CRM-Passcode -> { ok, totals, days, links, sources, feed }   for the Command Center
//
// Add &me=1 to any of these to skip counting (testing your own links).
// Env vars: CARD_EMAIL (email on the contact card), optional CARD_PHONE (default below), CRM_PASSCODE, Upstash Redis vars.
// Leads themselves go to Follow Up Boss through /api/lead.

const CONTACT = {
  first: 'Devin', last: 'Brown', title: 'Real Estate Agent', org: 'Unique Lifestyle Realty', brand: 'From Start 2 Keys',
  phone: process.env.CARD_PHONE || '+18036273680',
  email: process.env.CARD_EMAIL || '',
  site: 'https://www.fromstart2keys.com/card', instagram: 'https://instagram.com/devinmyagent',
  note: 'Free homebuyer class: fromstart2keys.com/class. Text me anytime about buying, selling or investing.',
};

const SITE = 'https://www.fromstart2keys.com';
// Every link the signature and card page can send people to. Keys show up in the stats.
const LINKS = {
  card: '/card',
  site: '/',
  class: '/class',
  value: '/#cma',
  search: '/search',
  deal: '/deal',
  letter: '/letter',
  book: 'https://calendly.com/devbrownrealtor/30min',
  ig: 'https://instagram.com/devinmyagent',
  fb: 'https://www.facebook.com/fromstart2keys',
  save: null, // the .vcf
};
// Short list of sources so the stats can't be flooded with junk keys.
const SOURCES = ['sig', 'card', 'ig', 'text', 'qr', 'linktree'];
const src = (v) => (SOURCES.includes(String(v || '').toLowerCase()) ? String(v).toLowerCase() : 'other');

const STATS = 'card:stats';
const DAY = (d) => `card:day:${d}`;
const FEED = 'card:feed';
const ALLOWED_ORIGINS = ['https://devbrown23.github.io', 'http://localhost:5173', 'null']; // Command Center

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

// Pacific-time date, so "today" matches Devin's day.
const today = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(d);

// Email security scanners (Outlook Safe Links, Mimecast...) open links before a person does. Don't count them.
const isBot = (req) => req.method === 'HEAD' ||
  /bot|crawl|spider|preview|scanner|safelinks|mimecast|proofpoint|barracuda|python|curl|wget|headless/i.test(String(req.headers['user-agent'] || ''));

async function count(c, field, link, source) {
  const day = DAY(today());
  await Promise.all([
    redis(c, ['HINCRBY', STATS, field, 1]),
    redis(c, ['HINCRBY', day, field, 1]),
    redis(c, ['EXPIRE', day, 60 * 60 * 24 * 120]),
    redis(c, ['LPUSH', FEED, JSON.stringify({ t: new Date().toISOString(), e: field.split(':')[0], link, s: source })]),
  ]);
  await redis(c, ['LTRIM', FEED, 0, 299]);
}

const fold = (line) => line.match(/.{1,74}/g).join('\r\n '); // vCard lines wrap at 75 characters
const vesc = (v) => String(v).replace(/[\\;,]/g, (m) => '\\' + m);

async function vcard(c) {
  let photo = '';
  if (c) { try { photo = String((await redis(c, ['GET', 'sig:photo:square'])) || '').replace(/^data:image\/\w+;base64,/, ''); } catch (e) {} }
  const k = CONTACT;
  return [
    'BEGIN:VCARD', 'VERSION:3.0',
    `N:${vesc(k.last)};${vesc(k.first)};;;`, `FN:${vesc(`${k.first} ${k.last}`)}`,
    `ORG:${vesc(k.org)};${vesc(k.brand)}`, `TITLE:${vesc(k.title)}`,
    `TEL;TYPE=CELL,VOICE,pref:${k.phone}`, k.email && `EMAIL;TYPE=INTERNET,pref:${k.email}`,
    `URL:${k.site}`, `X-SOCIALPROFILE;type=instagram:${k.instagram}`, `NOTE:${vesc(k.note)}`,
    photo && fold(`PHOTO;ENCODING=b;TYPE=JPEG:${photo}`),
    'END:VCARD',
  ].filter(Boolean).join('\r\n') + '\r\n';
}

export default async function card(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CRM-Passcode');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const q = req.query || {};
  const c = redisConfig();
  const source = src(q.s || q.src);
  const skip = !!q.me || isBot(req);

  try {
    // Link clicks (and the contact download). A database hiccup never blocks the visitor.
    if ((req.method === 'GET' || req.method === 'HEAD') && q.go) {
      const link = Object.prototype.hasOwnProperty.call(LINKS, q.go) ? q.go : 'site';
      const field = link === 'save' ? `save:${source}` : `click:${link}:${source}`;
      if (c && !skip) await count(c, field, link, source).catch((e) => console.error('card count error', e));
      res.setHeader('Cache-Control', 'no-store');
      if (link === 'save') {
        res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="Devin-Brown.vcf"');
        return res.status(200).send(await vcard(c));
      }
      const to = LINKS[link];
      res.setHeader('Location', /^https?:/.test(to) ? to : SITE + (link === 'card' ? `${to}?s=${source}` : to));
      return res.status(302).end();
    }

    if (req.method === 'GET' && q.contact) {
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).json({ ok: true, phone: CONTACT.phone, email: CONTACT.email });
    }

    if (!c) return res.status(500).json({ ok: false, error: 'Database not connected' });

    if (req.method === 'POST' && (q.view || q.lead)) {
      if (!skip) await count(c, `${q.lead ? 'lead' : 'view'}:${source}`, 'card', source);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      const passcode = (process.env.CRM_PASSCODE || '').trim();
      if (!passcode) return res.status(500).json({ ok: false, error: 'Server not configured' });
      if (String(req.headers['x-crm-passcode'] || '').trim() !== passcode) return res.status(401).json({ ok: false, error: 'Wrong passcode' });

      const toObj = (flat) => { const o = {}; for (let i = 0; i < (flat || []).length; i += 2) o[flat[i]] = Number(flat[i + 1]) || 0; return o; };
      const sum = (o, kind) => Object.entries(o).filter(([k]) => k.startsWith(kind + ':')).reduce((n, [, v]) => n + v, 0);
      const all = toObj(await redis(c, ['HGETALL', STATS]));

      // Last 30 days, oldest first, ready for a chart.
      const dates = Array.from({ length: 30 }, (_, i) => today(new Date(Date.now() - (29 - i) * 864e5)));
      const days = await Promise.all(dates.map(async (date) => {
        const o = toObj(await redis(c, ['HGETALL', DAY(date)]));
        return { date, views: sum(o, 'view'), clicks: sum(o, 'click'), saves: sum(o, 'save'), leads: sum(o, 'lead') };
      }));

      const links = {}, sources = {};
      for (const [k, v] of Object.entries(all)) {
        const [kind, a, b] = k.split(':');
        const s = kind === 'click' ? b : a;
        if (kind === 'click') links[a] = (links[a] || 0) + v;
        if (kind === 'save') links.save = (links.save || 0) + v;
        sources[s] = sources[s] || { views: 0, clicks: 0, saves: 0, leads: 0 };
        const col = { view: 'views', click: 'clicks', save: 'saves', lead: 'leads' }[kind];
        if (col) sources[s][col] += v;
      }
      const feed = ((await redis(c, ['LRANGE', FEED, 0, 49])) || []).map((x) => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean);

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        ok: true,
        totals: { views: sum(all, 'view'), clicks: sum(all, 'click'), saves: sum(all, 'save'), leads: sum(all, 'lead') },
        days, links, sources, feed,
      });
    }

    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('card error:', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong. Try again.' });
  }
}
