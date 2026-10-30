// /api/lender-pool.js  (Vercel serverless on Node)
// Shared client pool between Devin (agent) and his lender partner.
// Devin adds clients (from the Command Center CRM or the /pool page); the lender
// logs in with her own passcode and updates loan progress. Both see the same list.
//
//   GET                       -> { ok, role, clients: [...] }
//   POST   { client }         -> agent only: add or update a client (matched by id)
//   PATCH  { id, ...fields }  -> agent edits agent fields, lender edits lender fields
//   DELETE ?id=...            -> agent only: take a client out of the pool
//   POST   ?sync=1            -> pull everyone tagged FUB_POOL_TAG (default 'Lender Pool') from Follow Up Boss
//   GET    ?fub=1&q=&stage=   -> agent only: browse Follow Up Boss people to import
//   POST   ?import=1 {fubIds} -> agent only: add those people to the pool
//
// Requires env vars: CRM_PASSCODE (agent), LENDER_PASSCODE (lender),
// plus the Upstash Redis vars Vercel adds when the database is connected (same as /api/cc-sync).

const ALLOWED_ORIGINS = [
  'https://devbrown23.github.io',
  'http://localhost:5173',
  'null', // Command Center opened straight from disk
];

const KEY = 'pool:clients'; // Redis hash: client id -> JSON

const LOAN_STATUSES = ['New', 'Contacted', 'Application started', 'Pre-approved', 'Not ready yet', 'In underwriting', 'Closed'];
const SOURCES = ['Homebuyer class', 'Active client', 'Investor', 'Other'];

// Who may change which fields. Anything not listed is ignored.
const AGENT_FIELDS = ['firstName', 'lastName', 'phone', 'email', 'source', 'classDate', 'agentStage', 'agentNote', 'crmId', 'fubId'];
const LENDER_FIELDS = ['loanStatus', 'preapproval', 'dpa', 'lenderNote'];

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Pool-Passcode, X-CRM-Passcode');
}

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

// Compares passcodes without leaking timing.
function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function roleFor(req) {
  // Trim both sides: a stray space or line break pasted into Vercel shouldn't lock anyone out.
  const code = String(req.headers['x-pool-passcode'] || req.headers['x-crm-passcode'] || '').trim();
  if (same(code, (process.env.CRM_PASSCODE || '').trim())) return 'agent';
  if (same(code, (process.env.LENDER_PASSCODE || '').trim())) return 'lender';
  return null;
}

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

// Copies only the fields this role may change, trimmed and checked.
function pick(input, fields) {
  const out = {};
  for (const f of fields) {
    if (!(f in input)) continue;
    let v = clean(input[f], f.endsWith('Note') ? 2000 : 200);
    if (f === 'loanStatus' && v && !LOAN_STATUSES.includes(v)) continue;
    if (f === 'source' && v && !SOURCES.includes(v)) v = 'Other';
    out[f] = v;
  }
  return out;
}

function newId() {
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}


// ---------- Follow Up Boss ----------
// Anyone tagged with POOL_TAG in Follow Up Boss is added to the pool automatically, and every pool client
// that came from Follow Up Boss keeps its name, phone, email and stage in sync. Loan fields and notes
// are never touched by the sync.
const POOL_TAG = process.env.FUB_POOL_TAG || 'Lender Pool';
const SYNC_KEY = 'pool:lastSync';
const SYNC_EVERY_MS = 5 * 60 * 1000;

async function fub(path) {
  const key = process.env.FUB_API_KEY;
  if (!key) throw Object.assign(new Error("Follow Up Boss isn't connected (FUB_API_KEY is missing on Vercel)."), { status: 500 });
  const r = await fetch(`https://api.followupboss.com/v1/${path}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`, Accept: 'application/json' },
  });
  if (!r.ok) throw Object.assign(new Error(`Follow Up Boss error ${r.status}`), { status: 502, fubStatus: r.status });
  return r.json();
}

const primary = (list) => (list || []).find((x) => x.isPrimary)?.value || (list || [])[0]?.value || '';
const digits = (p) => String(p || '').replace(/\D/g, '').slice(-10);

function slimFub(p) {
  return {
    fubId: String(p.id), firstName: p.firstName || '', lastName: p.lastName || '',
    email: primary(p.emails), phone: primary(p.phones), stage: p.stage || '', source: p.source || '', tags: p.tags || [],
  };
}

// Picks the pool source for someone new from Follow Up Boss.
function poolSource(p) {
  const text = `${p.source} ${(p.tags || []).join(' ')}`.toLowerCase();
  if (/class|workshop|seminar/.test(text)) return 'Homebuyer class';
  if (/invest/.test(text)) return 'Investor';
  if (/active|hot prospect|pending|under contract/i.test(p.stage)) return 'Active client';
  return 'Other';
}

// Adds or updates pool clients from Follow Up Boss people. Matches by Follow Up Boss id, then email, then phone.
async function upsertFromFub(config, people, now) {
  const raw = (await redis(config, ['HGETALL', KEY])) || [];
  const existing = [];
  for (let i = 1; i < raw.length; i += 2) { try { existing.push(JSON.parse(raw[i])); } catch (e) { /* skip */ } }
  const byFub = new Map(existing.filter((c) => c.fubId).map((c) => [String(c.fubId), c]));
  const byEmail = new Map(existing.filter((c) => c.email).map((c) => [c.email.toLowerCase(), c]));
  const byPhone = new Map(existing.filter((c) => digits(c.phone).length >= 7).map((c) => [digits(c.phone), c]));

  const writes = [];
  let added = 0, updated = 0;
  for (const p of people) {
    if (String(p.stage).toLowerCase() === 'trash') continue;
    const match = byFub.get(p.fubId) || (p.email && byEmail.get(p.email.toLowerCase())) || (digits(p.phone).length >= 7 && byPhone.get(digits(p.phone)));
    if (match) {
      const next = { ...match, fubId: p.fubId, firstName: p.firstName || match.firstName, lastName: p.lastName || match.lastName,
        email: p.email || match.email, phone: p.phone || match.phone, agentStage: p.stage || match.agentStage };
      const keys = ['fubId', 'firstName', 'lastName', 'email', 'phone', 'agentStage'];
      if (keys.some((k) => String(next[k] || '') !== String(match[k] || ''))) {
        next.updatedAt = now; next.updatedBy = 'agent';
        writes.push(next.id, JSON.stringify(next)); updated++;
        byFub.set(p.fubId, next);
      }
    } else {
      const client = { id: `fub_${p.fubId}`, fubId: p.fubId, firstName: p.firstName, lastName: p.lastName, phone: p.phone, email: p.email,
        source: poolSource(p), classDate: '', agentStage: p.stage, agentNote: '', crmId: '',
        loanStatus: 'New', preapproval: '', dpa: '', lenderNote: '', createdAt: now, updatedAt: now, updatedBy: 'agent' };
      writes.push(client.id, JSON.stringify(client)); added++;
      byFub.set(p.fubId, client);
    }
  }
  for (let i = 0; i < writes.length; i += 100) await redis(config, ['HSET', KEY, ...writes.slice(i, i + 100)]);
  return { added, updated, linked: existing.filter((c) => c.fubId).map((c) => String(c.fubId)) };
}

// Tagged people + refreshed details for everyone already linked.
async function syncFromFub(config) {
  const now = new Date().toISOString();
  const people = [];
  for (let offset = 0, page = 0; page < 10; page++) {
    const body = await fub(`people?tags=${encodeURIComponent(POOL_TAG)}&limit=100&offset=${offset}`);
    const batch = body.people || [];
    people.push(...batch.map(slimFub));
    offset += batch.length;
    if (batch.length < 100) break;
  }
  const first = await upsertFromFub(config, people, now);
  // Refresh details for linked people who aren't tagged (e.g. imported by hand).
  const tagged = new Set(people.map((p) => p.fubId));
  const others = first.linked.filter((id) => !tagged.has(id));
  let refreshed = { added: 0, updated: 0 };
  const more = [];
  for (let i = 0; i < others.length && i < 500; i += 100) {
    const body = await fub(`people?id=${others.slice(i, i + 100).join(',')}&limit=100`);
    more.push(...(body.people || []).map(slimFub));
  }
  if (more.length) refreshed = await upsertFromFub(config, more, now);
  await redis(config, ['SET', SYNC_KEY, now]);
  return { added: first.added + refreshed.added, updated: first.updated + refreshed.updated, at: now, tag: POOL_TAG };
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const config = redisConfig();
  if (!(process.env.CRM_PASSCODE || '').trim() || !(process.env.LENDER_PASSCODE || '').trim() || !config) {
    console.error('lender-pool: missing CRM_PASSCODE, LENDER_PASSCODE or Redis env vars.');
    return res.status(500).json({ ok: false, error: !config ? 'Database not connected' : 'Server not configured' });
  }

  const role = roleFor(req);
  if (!role) return res.status(401).json({ ok: false, error: 'Wrong passcode' });

  try {
    const q = req.query || {};

    // Follow Up Boss sync: tagged people join the pool automatically (runs at most every few minutes).
    if (req.method === 'POST' && q.sync) {
      const last = await redis(config, ['GET', SYNC_KEY]);
      const force = role === 'agent' && q.force;
      if (!force && last && Date.now() - new Date(last).getTime() < SYNC_EVERY_MS) {
        return res.status(200).json({ ok: true, skipped: true, at: last, tag: POOL_TAG });
      }
      const result = await syncFromFub(config);
      return res.status(200).json({ ok: true, ...result });
    }

    // Agent: browse Follow Up Boss to pick people to add.
    if (req.method === 'GET' && q.fub) {
      if (role !== 'agent') return res.status(403).json({ ok: false, error: 'Only the agent can import from Follow Up Boss' });
      const offset = Math.max(0, parseInt(q.offset, 10) || 0);
      const params = new URLSearchParams({ limit: '100', offset: String(offset) });
      if (q.q) params.set('name', String(q.q).slice(0, 80));
      if (q.stage) params.set('stage', String(q.stage).slice(0, 40));
      let body;
      try { body = await fub(`people?${params}&sort=-updated`); }
      catch (e) { if (e.fubStatus === 400) body = await fub(`people?${params}`); else throw e; }
      const raw = (await redis(config, ['HGETALL', KEY])) || [];
      const inPool = new Set();
      for (let i = 1; i < raw.length; i += 2) { try { const c = JSON.parse(raw[i]); if (c.fubId) inPool.add(String(c.fubId)); } catch (e) { /* skip */ } }
      const people = (body.people || []).filter((p) => String(p.stage).toLowerCase() !== 'trash').map((p) => ({ ...slimFub(p), inPool: inPool.has(String(p.id)) }));
      const total = body._metadata?.total ?? people.length;
      const got = (body.people || []).length;
      return res.status(200).json({ ok: true, people, total, nextOffset: got === 100 ? offset + 100 : null, tag: POOL_TAG });
    }

    if (req.method === 'GET') {
      const raw = (await redis(config, ['HGETALL', KEY])) || [];
      const clients = [];
      for (let i = 1; i < raw.length; i += 2) {
        try { clients.push(JSON.parse(raw[i])); } catch (e) { /* skip a damaged row */ }
      }
      clients.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      return res.status(200).json({ ok: true, role, clients, statuses: LOAN_STATUSES, sources: SOURCES });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const now = new Date().toISOString();

    if (req.method === 'POST' && (req.query || {}).import) {
      if (role !== 'agent') return res.status(403).json({ ok: false, error: 'Only the agent can import from Follow Up Boss' });
      const ids = (Array.isArray(body.fubIds) ? body.fubIds : []).map((x) => String(x).replace(/\D/g, '')).filter(Boolean).slice(0, 200);
      if (!ids.length) return res.status(400).json({ ok: false, error: 'Pick at least one person' });
      const people = [];
      for (let i = 0; i < ids.length; i += 100) {
        const r = await fub(`people?id=${ids.slice(i, i + 100).join(',')}&limit=100`);
        people.push(...(r.people || []).map(slimFub));
      }
      const result = await upsertFromFub(config, people, now);
      return res.status(200).json({ ok: true, added: result.added, updated: result.updated });
    }

    if (req.method === 'POST') {
      if (role !== 'agent') return res.status(403).json({ ok: false, error: 'Only the agent can add clients' });
      const input = body.client || body;
      const fields = pick(input, AGENT_FIELDS);
      if (!fields.firstName && !fields.lastName && !fields.phone && !fields.email) {
        return res.status(400).json({ ok: false, error: 'Add at least a name, phone or email' });
      }
      const id = clean(input.id, 40) || newId();
      const existing = await redis(config, ['HGET', KEY, id]);
      const prev = existing ? JSON.parse(existing) : { id, loanStatus: 'New', preapproval: '', dpa: '', lenderNote: '', createdAt: now };
      const client = { ...prev, ...fields, id, updatedAt: now, updatedBy: 'agent' };
      await redis(config, ['HSET', KEY, id, JSON.stringify(client)]);
      return res.status(200).json({ ok: true, client });
    }

    if (req.method === 'PATCH') {
      const id = clean(body.id, 40);
      const existing = id && (await redis(config, ['HGET', KEY, id]));
      if (!existing) return res.status(404).json({ ok: false, error: 'Client not found' });
      const fields = pick(body, role === 'agent' ? [...AGENT_FIELDS, ...LENDER_FIELDS] : LENDER_FIELDS);
      const client = { ...JSON.parse(existing), ...fields, updatedAt: now, updatedBy: role };
      await redis(config, ['HSET', KEY, id, JSON.stringify(client)]);
      return res.status(200).json({ ok: true, client });
    }

    if (req.method === 'DELETE') {
      if (role !== 'agent') return res.status(403).json({ ok: false, error: 'Only the agent can remove clients' });
      const id = clean(req.query?.id || body.id, 40);
      if (!id) return res.status(400).json({ ok: false, error: 'Missing id' });
      await redis(config, ['HDEL', KEY, id]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('lender-pool error:', err);
    if (err.status) return res.status(err.status).json({ ok: false, error: err.message });
    return res.status(500).json({ ok: false, error: 'Something went wrong. Try again.' });
  }
}
