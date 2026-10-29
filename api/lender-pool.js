// /api/lender-pool.js  (Vercel serverless on Node)
// Shared client pool between Devin (agent) and his lender partner.
// Devin adds clients (from the Command Center CRM or the /pool page); the lender
// logs in with her own passcode and updates loan progress. Both see the same list.
//
//   GET                       -> { ok, role, clients: [...] }
//   POST   { client }         -> agent only: add or update a client (matched by id)
//   PATCH  { id, ...fields }  -> agent edits agent fields, lender edits lender fields
//   DELETE ?id=...            -> agent only: take a client out of the pool
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
const AGENT_FIELDS = ['firstName', 'lastName', 'phone', 'email', 'source', 'classDate', 'agentStage', 'agentNote', 'crmId'];
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
  const code = req.headers['x-pool-passcode'] || req.headers['x-crm-passcode'] || '';
  if (same(code, process.env.CRM_PASSCODE)) return 'agent';
  if (same(code, process.env.LENDER_PASSCODE)) return 'lender';
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

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const config = redisConfig();
  if (!process.env.CRM_PASSCODE || !process.env.LENDER_PASSCODE || !config) {
    console.error('lender-pool: missing CRM_PASSCODE, LENDER_PASSCODE or Redis env vars.');
    return res.status(500).json({ ok: false, error: !config ? 'Database not connected' : 'Server not configured' });
  }

  const role = roleFor(req);
  if (!role) return res.status(401).json({ ok: false, error: 'Wrong passcode' });

  try {
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
    return res.status(500).json({ ok: false, error: 'Something went wrong. Try again.' });
  }
}
