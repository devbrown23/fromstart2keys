// /api/property.js  (Vercel serverless on Node)
// Property lookup for the FS2K Studio Deal Analyzer.
//
//   GET ?q=3790 E B St, Tacoma, WA 98404  -> { ok, matches: [parcel...] }   best match first
//   GET ?mls=2596876                      -> { ok, listing, matches }         only for the current Deal of the Week
//
// Address data comes from the Washington State Parcels Project (WaTech + WA counties), a public
// statewide layer: parcel number, situs address, land use, county market value and a link to the
// county assessor record. It has no owner, taxes, year built or square feet; the county link does.
// NWMLS listing data isn't available without an IDX feed, so MLS numbers only resolve when they
// match the Deal of the Week saved on this site.

const PARCELS = 'https://services.arcgis.com/jsIt88o09Q0r1j8h/arcgis/rest/services/Current_Parcels/FeatureServer/0/query';
const FIELDS = 'PARCEL_ID_NR,ORIG_PARCEL_ID,COUNTY_NM,SITUS_ADDRESS,SUB_ADDRESS,SITUS_CITY_NM,SITUS_ZIP_NR,LANDUSE_CD,ORIG_LANDUSE_CD,VALUE_LAND,VALUE_BLDG,DATA_LINK';

// Washington Department of Revenue land use codes (first two digits).
const LAND_USE = {
  11: 'Single-family home', 12: '2–4 unit building', 13: '5+ unit building', 14: 'Condo',
  15: 'Mobile home park', 18: 'Other residential', 19: 'Vacation home', 91: 'Vacant land',
};

const SUFFIX = {
  STREET: 'ST', AVENUE: 'AVE', AV: 'AVE', ROAD: 'RD', DRIVE: 'DR', COURT: 'CT', PLACE: 'PL', BOULEVARD: 'BLVD',
  LANE: 'LN', TERRACE: 'TER', CIRCLE: 'CIR', PARKWAY: 'PKWY', HIGHWAY: 'HWY', LOOP: 'LOOP', WAY: 'WAY',
  NORTH: 'N', SOUTH: 'S', EAST: 'E', WEST: 'W', NORTHEAST: 'NE', NORTHWEST: 'NW', SOUTHEAST: 'SE', SOUTHWEST: 'SW',
};
const DIRS = new Set(['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW']);
const SUFFIXES = new Set(Object.values(SUFFIX).filter((v) => !DIRS.has(v)).concat(['ST', 'AVE']));

function norm(s) {
  return String(s || '').toUpperCase().replace(/[.,]/g, ' ').replace(/#\s*\S+|\b(APT|UNIT|STE|SUITE)\s+\S+/g, ' ')
    .split(/\s+/).filter(Boolean).map((t) => SUFFIX[t] || t).join(' ');
}
const safe = (s) => String(s).replace(/[^A-Z0-9 \-]/g, '').replace(/'/g, "''");

function parseInput(q) {
  const parts = String(q).split(',').map((p) => p.trim()).filter(Boolean);
  const zip = (String(q).match(/\b(98\d{3}|99\d{3})\b/) || [])[1] || '';
  const street = norm(parts[0] || q).replace(/\b(98|99)\d{3}\b/, '').trim();
  const num = (street.match(/^(\d+[A-Z]?)\b/) || [])[1] || '';
  let city = parts.length > 1 ? norm(parts[1]).replace(/\b(WA|WASHINGTON)\b/, '').replace(/\b\d{5}\b/, '').trim() : '';
  const tokens = street.split(' ').slice(1).filter((t) => !DIRS.has(t) && !SUFFIXES.has(t));
  const name = tokens.sort((a, b) => b.length - a.length)[0] || '';
  return { street, num, zip, city, name };
}

async function queryParcels(where) {
  const url = `${PARCELS}?${new URLSearchParams({ where, outFields: FIELDS, returnGeometry: 'false', resultRecordCount: '50', f: 'json' })}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`Parcel service error ${r.status}`);
  const body = await r.json();
  if (body.error) throw new Error(body.error.message || 'Parcel service error');
  return (body.features || []).map((f) => f.attributes);
}

function unitsFor(a) {
  const code = Math.floor(Number(a.LANDUSE_CD) / (Number(a.LANDUSE_CD) >= 100 ? 10 : 1));
  const orig = String(a.ORIG_LANDUSE_CD || '').toUpperCase();
  if (/DUPLEX|2 ?UNIT|TWO/.test(orig)) return 2;
  if (/TRIPLEX|3 ?UNIT|THREE/.test(orig)) return 3;
  if (/FOURPLEX|QUAD|4 ?UNIT|FOUR/.test(orig)) return 4;
  if (code === 12) return 2;
  if (code === 13) return 4;
  return 1;
}

function shape(a, score) {
  const code = Number(a.LANDUSE_CD) || 0;
  const value = (Number(a.VALUE_LAND) || 0) + (Number(a.VALUE_BLDG) || 0);
  const title = (s) => String(s || '').toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(Ne|Nw|Se|Sw)\b/g, (m) => m.toUpperCase());
  const addr = [a.SITUS_ADDRESS, a.SUB_ADDRESS].filter(Boolean).join(' ');
  return {
    parcel: a.ORIG_PARCEL_ID || a.PARCEL_ID_NR || '',
    address: title(addr).replace(/\b([NSEW])\b/g, (m) => m.toUpperCase()),
    city: title(a.SITUS_CITY_NM), zip: String(a.SITUS_ZIP_NR || '').slice(0, 5), county: title(a.COUNTY_NM),
    landUseCode: code, landUse: LAND_USE[code] || LAND_USE[Math.floor(code / 10)] || (a.ORIG_LANDUSE_CD ? title(a.ORIG_LANDUSE_CD) : 'Other'),
    units: unitsFor(a), valueLand: Number(a.VALUE_LAND) || 0, valueBldg: Number(a.VALUE_BLDG) || 0, value,
    link: /^https?:\/\//.test(a.DATA_LINK || '') ? a.DATA_LINK : '', score,
  };
}

function score(a, p) {
  const full = norm([a.SITUS_ADDRESS, a.SUB_ADDRESS].filter(Boolean).join(' '));
  if (full === p.street) return 100;
  const want = p.street.split(' '), have = new Set(full.split(' '));
  let s = want.filter((t) => have.has(t)).length / Math.max(want.length, 1) * 80;
  if (p.zip && String(a.SITUS_ZIP_NR || '').startsWith(p.zip)) s += 10;
  if (p.city && norm(a.SITUS_CITY_NM).startsWith(p.city)) s += 10;
  return Math.round(s);
}

async function lookupAddress(q) {
  const p = parseInput(q);
  if (!p.num) return { ok: false, error: 'Start with the house number, like "3790 E B St, Tacoma".' };
  const base = `SITUS_ADDRESS LIKE '${safe(p.num)} %'`;
  const tries = [];
  if (p.zip) tries.push(`${base} AND SITUS_ZIP_NR LIKE '${safe(p.zip)}%'`);
  if (p.city) tries.push(`${base} AND UPPER(SITUS_CITY_NM) LIKE '${safe(p.city)}%'`);
  if (p.name) tries.push(`${base} AND UPPER(SITUS_ADDRESS) LIKE '% ${safe(p.name)} %'`, `${base} AND UPPER(SITUS_ADDRESS) LIKE '% ${safe(p.name)}'`);
  let rows = [];
  for (const where of tries) {
    rows = await queryParcels(where);
    if (rows.some((r) => score(r, p) >= 60)) break;
  }
  const matches = rows.map((r) => shape(r, score(r, p))).filter((m) => m.score >= 40)
    .sort((a, b) => b.score - a.score).slice(0, 6);
  return { ok: true, matches };
}

// The Deal of the Week saved on this site (same database as /api/deal).
function redisConfig() {
  const env = process.env;
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || Object.entries(env).find(([k]) => k.endsWith('_REST_API_URL'))?.[1];
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN ||
    Object.entries(env).find(([k]) => k.endsWith('_REST_API_TOKEN') && !k.endsWith('_READ_ONLY_TOKEN'))?.[1];
  return url && token ? { url, token } : null;
}
async function currentDeal() {
  const c = redisConfig();
  if (!c) return null;
  const r = await fetch(c.url, { method: 'POST', headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(['GET', 'deal:current']) });
  const body = await r.json().catch(() => ({}));
  try { return body.result ? JSON.parse(body.result) : null; } catch (e) { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  const q = String(req.query?.q || '').slice(0, 160).trim();
  const mls = String(req.query?.mls || '').replace(/\D/g, '').slice(0, 12);
  try {
    if (mls) {
      const deal = await currentDeal();
      if (!deal || String(deal.mlsNumber || '').replace(/\D/g, '') !== mls) {
        return res.status(404).json({ ok: false, code: 'mls_unavailable',
          error: "MLS lookup works for your current Deal of the Week. For other listings, enter the address (full MLS lookup turns on once your IDX feed is connected)." });
      }
      const listing = { mls, address: deal.address, city: deal.city, price: deal.price, beds: deal.beds, baths: deal.baths, sqft: deal.sqft,
        credit: deal.dealTitle || '', listingAgent: [deal.listingBroker, deal.listingFirm].filter(Boolean).join(', ') };
      const found = deal.address ? await lookupAddress(`${deal.address}, ${deal.city || ''}`).catch(() => ({ matches: [] })) : { matches: [] };
      return res.status(200).json({ ok: true, listing, matches: found.matches || [] });
    }
    if (q.length < 5) return res.status(400).json({ ok: false, error: 'Type the full street address.' });
    const result = await lookupAddress(q);
    if (!result.ok) return res.status(400).json(result);
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json(result);
  } catch (err) {
    console.error('property lookup error:', err);
    return res.status(502).json({ ok: false, error: "Couldn't reach the county records right now. Try again, or enter the numbers by hand." });
  }
}
