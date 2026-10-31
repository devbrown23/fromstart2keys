// /api/agent-game.js  (Vercel serverless on Node)
// Powers Call Closer, the free negotiation game for agents at fromstart2keys.com/negotiate.
//
//   POST ?action=signup   {name, email, password, brokerage, phone} -> { ok, token, profile, state }
//   POST ?action=login    {email, password}                         -> { ok, token, profile, state }
//   GET  ?action=me       (Authorization: Bearer <token>)           -> { ok, profile, state }
//   PUT  ?action=save     (Bearer) {state}                          -> { ok }   saves progress, updates the leaderboard
//   POST ?action=logout   (Bearer)                                  -> { ok }
//   PUT  ?action=profile  (Bearer) {name, brokerage, phone, email, password} -> { ok, profile, account }
//                         edits the account; changing the email needs the current password
//   GET  ?action=board                                              -> { ok, board }  top 25 by total XP (public)
//   GET  ?action=roster   with X-CRM-Passcode                       -> { ok, players } every agent with stats (Devin only)
//
// New sign-ups are sent to Follow Up Boss tagged "Call Closer" (when FUB_API_KEY is set).
// Requires env vars: the Upstash Redis vars (same database as /api/deal), CRM_PASSCODE for the roster.

import crypto from 'node:crypto';

const SESSION_DAYS = 90;
const MAX_STATE = 200000;

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

const ALLOWED_ORIGINS = [
  'https://devbrown23.github.io', // GitHub Pages copy of the game
  'http://localhost:5173',
];

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CRM-Passcode');
}

const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const normEmail = (e) => clean(e, 120).toLowerCase();
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const userKey = (email) => `cc:user:${crypto.createHash('sha256').update(email).digest('hex').slice(0, 32)}`;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}

function publicProfile(u) {
  return { id: u.id, name: u.name, brokerage: u.brokerage || '', joined: u.joined };
}

function accountInfo(u) {
  return { name: u.name, brokerage: u.brokerage || '', phone: u.phone || '', email: u.email };
}

async function newSession(config, user) {
  const token = crypto.randomBytes(32).toString('hex');
  await redis(config, ['SET', `cc:session:${token}`, user.key, 'EX', SESSION_DAYS * 86400]);
  return token;
}

async function userFromToken(config, req) {
  const m = String(req.headers.authorization || '').match(/^Bearer\s+([a-f0-9]{64})$/i);
  if (!m) return null;
  const key = await redis(config, ['GET', `cc:session:${m[1]}`]);
  if (!key) return null;
  const raw = await redis(config, ['GET', key]);
  return raw ? { user: JSON.parse(raw), token: m[1] } : null;
}

async function loadState(config, user) {
  const raw = await redis(config, ['GET', `cc:state:${user.id}`]);
  return raw ? JSON.parse(raw) : null;
}

async function sendToFub(user, pageUrl) {
  const apiKey = process.env.FUB_API_KEY;
  if (!apiKey) return;
  const [firstName, ...rest] = user.name.split(' ');
  const auth = Buffer.from(`${apiKey}:`).toString('base64');
  await fetch('https://api.followupboss.com/v1/events', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      type: 'Registration',
      action: 'Call Closer sign-up',
      system: 'FS2K',
      source: 'FS2K Studio · Call Closer',
      sourceUrl: pageUrl || 'https://fromstart2keys.com/negotiate',
      message: `Agent signed up for Call Closer.${user.brokerage ? ` Brokerage: ${user.brokerage}.` : ''}`,
      person: {
        firstName, lastName: rest.join(' '), stage: 'Lead',
        emails: [{ value: user.email, type: 'work' }],
        phones: user.phone ? [{ value: user.phone, type: 'mobile' }] : [],
        tags: ['Call Closer', 'Agent'],
      },
    }),
  }).catch((e) => console.error('FUB error', e));
}

function boardRow(user, state) {
  const s = state || {};
  return {
    name: user.name, brokerage: user.brokerage || '',
    lvl: Number(s.lvl) || 1, total: Number(s.total) || 0,
    calls: Number(s.calls) || 0, dials: Number(s.dials) || 0, appts: Number(s.appts) || 0,
    classes: s.classes ? Object.keys(s.classes).length : 0,
    streak: Number(s.streak) || 0,
  };
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  res.setHeader('Cache-Control', 'no-store');
  const config = redisConfig();
  if (!config) return res.status(500).json({ ok: false, error: 'Database not connected' });
  const action = String((req.query || {}).action || '');
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  try {
    if (req.method === 'POST' && action === 'signup') {
      const name = clean(body.name, 60), email = normEmail(body.email), password = String(body.password || '');
      if (name.length < 2) return res.status(400).json({ ok: false, error: 'Add your name.' });
      if (!validEmail(email)) return res.status(400).json({ ok: false, error: 'Check your email address.' });
      if (password.length < 8) return res.status(400).json({ ok: false, error: 'Use a password with at least 8 characters.' });
      const key = userKey(email);
      if (await redis(config, ['EXISTS', key])) return res.status(409).json({ ok: false, error: 'That email already has an account. Sign in instead.' });
      const { salt, hash } = hashPassword(password);
      const user = {
        id: crypto.randomBytes(8).toString('hex'), key, email, name,
        brokerage: clean(body.brokerage, 80), phone: clean(body.phone, 30),
        salt, hash, joined: Date.now(),
      };
      await redis(config, ['SET', key, JSON.stringify(user), 'NX']);
      await redis(config, ['SADD', 'cc:players', user.id]);
      await redis(config, ['SET', `cc:userkey:${user.id}`, key]);
      await redis(config, ['ZADD', 'cc:board', 0, user.id]);
      await redis(config, ['SET', `cc:row:${user.id}`, JSON.stringify(boardRow(user, null))]);
      await sendToFub(user, clean(body.pageUrl, 300));
      const token = await newSession(config, user);
      return res.status(200).json({ ok: true, token, profile: publicProfile(user), account: accountInfo(user), state: null });
    }

    if (req.method === 'POST' && action === 'login') {
      const email = normEmail(body.email), password = String(body.password || '');
      const tries = await redis(config, ['INCR', `cc:tries:${email}`]);
      if (tries === 1) await redis(config, ['EXPIRE', `cc:tries:${email}`, 900]);
      if (tries > 10) return res.status(429).json({ ok: false, error: 'Too many tries. Wait 15 minutes and try again.' });
      const raw = await redis(config, ['GET', userKey(email)]);
      const user = raw ? JSON.parse(raw) : null;
      if (!user || !same(hashPassword(password, user.salt).hash, user.hash)) {
        return res.status(401).json({ ok: false, error: 'Email or password is incorrect.' });
      }
      await redis(config, ['DEL', `cc:tries:${email}`]);
      const token = await newSession(config, user);
      return res.status(200).json({ ok: true, token, profile: publicProfile(user), account: accountInfo(user), state: await loadState(config, user) });
    }

    if (req.method === 'GET' && action === 'board') {
      const ids = (await redis(config, ['ZREVRANGE', 'cc:board', 0, 24])) || [];
      const rows = ids.length ? await redis(config, ['MGET', ...ids.map((id) => `cc:row:${id}`)]) : [];
      const board = rows.map((r, i) => (r ? { id: ids[i], ...JSON.parse(r) } : null)).filter(Boolean)
        .map(({ id, name, brokerage, lvl, total, appts }) => ({ id, name, brokerage, lvl, total, appts }));
      return res.status(200).json({ ok: true, board });
    }

    if (req.method === 'GET' && action === 'roster') {
      if (!process.env.CRM_PASSCODE) return res.status(500).json({ ok: false, error: 'Server not configured' });
      if (!same(String(req.headers['x-crm-passcode'] || '').trim(), process.env.CRM_PASSCODE.trim())) {
        return res.status(401).json({ ok: false, error: 'Wrong passcode' });
      }
      const ids = (await redis(config, ['SMEMBERS', 'cc:players'])) || [];
      const keys = ids.length ? await redis(config, ['MGET', ...ids.map((id) => `cc:userkey:${id}`)]) : [];
      const users = keys.filter(Boolean).length ? await redis(config, ['MGET', ...keys.filter(Boolean)]) : [];
      const rows = ids.length ? await redis(config, ['MGET', ...ids.map((id) => `cc:row:${id}`)]) : [];
      const byId = {};
      rows.forEach((r, i) => { if (r) byId[ids[i]] = JSON.parse(r); });
      const players = users.filter(Boolean).map((raw) => {
        const u = JSON.parse(raw);
        return { ...byId[u.id], name: u.name, email: u.email, phone: u.phone || '', brokerage: u.brokerage || '', joined: u.joined, lastActive: byId[u.id]?.lastActive || u.joined };
      }).sort((a, b) => (b.total || 0) - (a.total || 0));
      return res.status(200).json({ ok: true, players });
    }

    const session = await userFromToken(config, req);
    if (!session) return res.status(401).json({ ok: false, error: 'Please sign in again.' });
    const { user, token } = session;

    if (req.method === 'GET' && action === 'me') {
      return res.status(200).json({ ok: true, profile: publicProfile(user), account: accountInfo(user), state: await loadState(config, user) });
    }

    if (req.method === 'PUT' && action === 'save') {
      const state = body.state;
      if (!state || typeof state !== 'object') return res.status(400).json({ ok: false, error: 'Nothing to save.' });
      const json = JSON.stringify(state);
      if (json.length > MAX_STATE) return res.status(413).json({ ok: false, error: 'Save is too large.' });
      await redis(config, ['SET', `cc:state:${user.id}`, json]);
      const row = { ...boardRow(user, state), lastActive: Date.now() };
      await redis(config, ['SET', `cc:row:${user.id}`, JSON.stringify(row)]);
      await redis(config, ['ZADD', 'cc:board', row.total, user.id]);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'PUT' && action === 'profile') {
      const name = clean(body.name ?? user.name, 60);
      if (name.length < 2) return res.status(400).json({ ok: false, error: 'Add your name.' });
      const email = body.email !== undefined ? normEmail(body.email) : user.email;
      if (!validEmail(email)) return res.status(400).json({ ok: false, error: 'Check your email address.' });
      if (email !== user.email) {
        if (!same(hashPassword(String(body.password || ''), user.salt).hash, user.hash)) {
          return res.status(401).json({ ok: false, error: 'Enter your current password to change your email.' });
        }
        const newKey = userKey(email);
        if (await redis(config, ['EXISTS', newKey])) return res.status(409).json({ ok: false, error: 'That email already has an account.' });
        const oldKey = user.key;
        user.email = email; user.key = newKey;
        await redis(config, ['SET', newKey, JSON.stringify(user), 'NX']);
        await redis(config, ['SET', `cc:userkey:${user.id}`, newKey]);
        await redis(config, ['SET', `cc:session:${token}`, newKey, 'EX', SESSION_DAYS * 86400]);
        await redis(config, ['DEL', oldKey]);
      }
      user.name = name;
      if (body.brokerage !== undefined) user.brokerage = clean(body.brokerage, 80);
      if (body.phone !== undefined) user.phone = clean(body.phone, 30);
      await redis(config, ['SET', user.key, JSON.stringify(user)]);
      const raw = await redis(config, ['GET', `cc:row:${user.id}`]);
      const row = raw ? JSON.parse(raw) : boardRow(user, null);
      row.name = user.name; row.brokerage = user.brokerage || '';
      await redis(config, ['SET', `cc:row:${user.id}`, JSON.stringify(row)]);
      return res.status(200).json({ ok: true, profile: publicProfile(user), account: accountInfo(user) });
    }

    if (req.method === 'POST' && action === 'logout') {
      await redis(config, ['DEL', `cc:session:${token}`]);
      return res.status(200).json({ ok: true });
    }

    return res.status(404).json({ ok: false, error: 'Unknown action' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Unexpected server error' });
  }
}
