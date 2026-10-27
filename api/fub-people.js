// /api/fub-people.js  (Vercel serverless on Node)
// Lets the Command Center CRM pull people from Follow Up Boss, one page at a time.
// GET ?offset=0  ->  { ok, people: [...], total, nextOffset }  (nextOffset is null when done)
// Requires env vars: FUB_API_KEY, CRM_PASSCODE

const ALLOWED_ORIGINS = [
  'https://devbrown23.github.io',
  'http://localhost:5173',
  'null', // index.html opened straight from disk
];

const PAGE = 100;        // Follow Up Boss's max per request
const PAGES_PER_CALL = 5; // keeps each call well under the function time limit

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CRM-Passcode');
}

// Only the fields the CRM uses, so nothing else from Follow Up Boss leaves the server.
function slim(p) {
  const primary = (list) => (list || []).find((x) => x.isPrimary)?.value || (list || [])[0]?.value || '';
  return {
    fubId: p.id,
    firstName: p.firstName || '',
    lastName: p.lastName || '',
    email: primary(p.emails),
    phone: primary(p.phones),
    stage: p.stage || '',
    source: p.source || '',
    tags: p.tags || [],
    updated: p.updated || p.created || '',
  };
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const apiKey = process.env.FUB_API_KEY;
  const passcode = process.env.CRM_PASSCODE;
  if (!apiKey || !passcode) {
    return res.status(500).json({ ok: false, error: 'Server not configured' });
  }
  if (req.headers['x-crm-passcode'] !== passcode) {
    return res.status(401).json({ ok: false, error: 'Wrong passcode' });
  }

  const auth = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
  let offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const people = [];
  let total = 0;

  try {
    for (let i = 0; i < PAGES_PER_CALL; i++) {
      const r = await fetch(`https://api.followupboss.com/v1/people?limit=${PAGE}&offset=${offset}&sort=created`, {
        headers: { Authorization: auth, Accept: 'application/json' },
      });
      if (!r.ok) {
        console.error('FUB error', r.status, await r.text());
        return res.status(502).json({ ok: false, error: `Follow Up Boss error ${r.status}` });
      }
      const body = await r.json();
      const batch = body.people || [];
      total = body._metadata?.total ?? total;
      people.push(...batch.map(slim));
      offset += batch.length;
      if (batch.length < PAGE || offset >= total) {
        return res.status(200).json({ ok: true, people, total, nextOffset: null });
      }
    }
    return res.status(200).json({ ok: true, people, total, nextOffset: offset });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Unexpected server error' });
  }
}
