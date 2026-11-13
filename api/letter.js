// /api/letter.js  (Vercel serverless on Node)
// Powers The Keys Letter: Devin's weekly (or monthly) letter of homes he thinks are worth a look.
// Public page: /letter (latest issue, archive, sign-up). Private editor: /letter/edit (CRM_PASSCODE).
//
// Public
//   GET                          -> { ok, issue, archive }          latest published issue
//   GET  ?id=abc                 -> { ok, issue, archive }          one published issue
//   GET  ?photo=abc:0&v=..       -> a deal photo (JPEG)
//   GET  ?go=abc&d=0&src=email[&e=email&t=token] -> counts the click (and who clicked), then redirects to the listing
//   POST ?view=abc&src=email     -> counts a page view
//   POST ?subscribe=1            -> { firstName, lastName, email, phone, src } adds a reader (+ Follow Up Boss, tag "Keys Letter")
//   GET|POST ?unsub=email&t=..   -> one-click unsubscribe
//
// Agent (X-CRM-Passcode header)
//   GET  ?admin=1                -> { issues, settings, subscribers }
//   GET  ?admin=1&id=abc         -> { issue, stats, clickers }
//   GET  ?email=abc              -> the email HTML for that issue (preview / copy into any email tool)
//   PUT                          -> { issue, publish } save a draft or publish it
//   DELETE ?id=abc               -> delete an issue
//   POST ?photo=1                -> { id, n, photo } upload a deal photo (JPEG data URL)
//   POST ?send=1                 -> { id, test, to, force } send with Resend (RESEND_API_KEY + LETTER_FROM)
//   POST ?subs=1                 -> { add: [{email, firstName, lastName}] } add readers by hand
//   DELETE ?subs=email           -> remove a reader
//   PUT  ?settings=1             -> { mailingAddress, replyTo, cadence }
//
// Env vars: CRM_PASSCODE, Upstash Redis vars (same database as /api/deal),
// optional RESEND_API_KEY, LETTER_FROM ("Devin Brown <letter@fromstart2keys.com>"), FUB_API_KEY, SITE_URL.

import crypto from 'node:crypto';

const SITE = (process.env.SITE_URL || 'https://www.fromstart2keys.com').replace(/\/$/, '');
const NAME = 'The Keys Letter';
const INDEX_KEY = 'letter:index';
const SUBS_KEY = 'letter:subs';
const SETTINGS_KEY = 'letter:settings';
const issueKey = (id) => `letter:issue:${id}`;
const photoKey = (id, pid) => `letter:photo:${id}:${pid}`;
const validPid = (pid) => /^[a-z0-9]{1,12}$/.test(String(pid || ''));
const statsKey = (id) => `letter:stats:${id}`;
const clickersKey = (id) => `letter:clickers:${id}`;
const MAX_DEALS = 8;

const DEAL_FIELDS = { pid: 12, tag: 40, address: 120, city: 80, price: 30, was: 30, beds: 10, baths: 10, sqft: 20, why: 600, url: 600 };
const ISSUE_FIELDS = { title: 120, subject: 150, preheader: 150, intro: 2500, closing: 1200 };

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

const getJson = async (c, key, fallback = null) => {
  const raw = await redis(c, ['GET', key]);
  try { return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
};
const setJson = (c, key, val) => redis(c, ['SET', key, JSON.stringify(val)]);
const hashToObj = (flat) => {
  const o = {};
  for (let i = 0; i < (flat || []).length; i += 2) o[flat[i]] = flat[i + 1];
  return o;
};

function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Signed token per reader, so unsubscribe and "who clicked" links can't be forged.
function token(email) {
  const secret = process.env.LETTER_SECRET || process.env.CRM_PASSCODE || 'fs2k';
  return crypto.createHmac('sha256', secret).update(String(email).toLowerCase()).digest('hex').slice(0, 20);
}

const cleanEmail = (e) => String(e || '').trim().toLowerCase().slice(0, 160);
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const source = (s) => (['email', 'instagram', 'facebook', 'tiktok', 'text', 'linktree', 'site'].includes(String(s || '').toLowerCase()) ? String(s).toLowerCase() : 'other');
const isHttps = (u) => { try { return new URL(u).protocol === 'https:'; } catch (e) { return false; } };
const newId = () => new Date().toISOString().slice(0, 10).replace(/-/g, '') + crypto.randomBytes(2).toString('hex');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const digits = (s) => String(s || '').replace(/[^\d]/g, '');
const money = (s) => { const n = Number(digits(s)); return n ? '$' + n.toLocaleString('en-US') : String(s || ''); };

function publicIssue(issue) {
  if (!issue) return null;
  const { sentCount, sentAt, ...rest } = issue;
  return { ...rest, deals: (issue.deals || []).map(({ url, ...d }) => ({ ...d, hasUrl: !!url })) };
}

async function archive(c) {
  const index = await getJson(c, INDEX_KEY, []);
  return index.filter((i) => i.status === 'published').map(({ id, title, publishedAt, number }) => ({ id, title, publishedAt, number }));
}

// ---------- the email ----------
// Table layout with inline styles so it holds up in Gmail, Outlook and Apple Mail.
function renderEmail(issue, settings, to) {
  const t = to ? token(to) : '';
  const who = to ? `&e=${encodeURIComponent(to)}&t=${t}` : '';
  const webUrl = `${SITE}/letter?id=${issue.id}&utm_source=email&utm_medium=email&utm_campaign=keys_letter`;
  const unsubUrl = to ? `${SITE}/api/letter?unsub=${encodeURIComponent(to)}&t=${t}` : `${SITE}/letter`;
  const date = new Date(issue.publishedAt || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' });
  const serif = "'Bodoni Moda', Didot, 'Bodoni 72', Georgia, 'Times New Roman', serif";
  const sans = "-apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif";
  const para = (txt, style) => String(txt || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;${style}">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

  const deals = (issue.deals || []).map((d, n) => {
    const link = d.url ? `${SITE}/api/letter?go=${issue.id}&d=${n}&src=email${who}` : webUrl;
    const facts = [d.beds && `${esc(d.beds)} bd`, d.baths && `${esc(d.baths)} ba`, d.sqft && `${esc(d.sqft)} sq ft`].filter(Boolean).join(' &nbsp;·&nbsp; ');
    const now = Number(digits(d.price)), was = Number(digits(d.was));
    const drop = was && now && was > now ? `<span style="color:#8a8a8a;text-decoration:line-through;font-weight:400;font-size:15px">&nbsp;${esc(money(d.was))}</span>` : '';
    const photo = d.photoVersion
      ? `<tr><td style="padding:0 0 18px"><a href="${link}" style="text-decoration:none"><img src="${SITE}/api/letter?photo=${issue.id}:${esc(d.pid)}&amp;v=${esc(d.photoVersion)}" width="536" alt="${esc(d.address)}" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:4px"></a></td></tr>` : '';
    return `<tr><td style="padding:0 32px 40px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${photo}
        <tr><td style="font:700 11px/1 ${sans};letter-spacing:2px;text-transform:uppercase;color:#a8823a;padding-bottom:10px">${String(n + 1).padStart(2, '0')}${d.tag ? ` &nbsp;·&nbsp; ${esc(d.tag)}` : ''}</td></tr>
        <tr><td style="font:400 28px/1.15 ${serif};color:#111;padding-bottom:6px"><a href="${link}" style="color:#111;text-decoration:none">${esc(d.address)}</a></td></tr>
        <tr><td style="font:600 12px/1.4 ${sans};letter-spacing:1.5px;text-transform:uppercase;color:#8a8a8a;padding-bottom:12px">${esc(d.city)}</td></tr>
        <tr><td style="font:600 20px/1.3 ${sans};color:#111;padding-bottom:4px">${esc(money(d.price))}${drop}</td></tr>
        ${facts ? `<tr><td style="font:400 14px/1.5 ${sans};color:#555;padding-bottom:14px">${facts}</td></tr>` : ''}
        ${d.why ? `<tr><td style="border-left:2px solid #c9a45c;padding:2px 0 2px 16px;font:italic 400 17px/1.55 ${serif};color:#333">${esc(d.why).replace(/\n/g, '<br>')}</td></tr>` : ''}
        <tr><td style="padding-top:18px"><a href="${link}" style="display:inline-block;font:600 13px/1 ${sans};letter-spacing:1px;text-transform:uppercase;color:#111;text-decoration:none;border-bottom:1px solid #c9a45c;padding-bottom:4px">See the home &rarr;</a></td></tr>
      </table>
    </td></tr>`;
  }).join(`<tr><td style="padding:0 32px 40px"><div style="height:1px;background:#e7e1d6;line-height:1px;font-size:1px">&nbsp;</div></td></tr>`);

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(issue.subject || issue.title)}</title></head>
<body style="margin:0;padding:0;background:#f4f0e8">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(issue.preheader || '')}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f0e8"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#fffdf9;border:1px solid #e7e1d6">
  <tr><td style="background:#0b0b0b;padding:30px 32px 26px;text-align:center">
    <div style="font:700 10px/1 ${sans};letter-spacing:4px;text-transform:uppercase;color:#c9a45c">From Start 2 Keys</div>
    <div style="font:400 40px/1.1 ${serif};color:#f6f1e7;padding-top:12px">${NAME}</div>
    <div style="font:400 12px/1 ${sans};letter-spacing:1.5px;text-transform:uppercase;color:#8e8e93;padding-top:12px">${issue.number ? `No. ${issue.number} &nbsp;·&nbsp; ` : ''}${esc(date)}</div>
  </td></tr>
  <tr><td style="padding:40px 32px 8px">
    <div style="font:400 30px/1.2 ${serif};color:#111;padding-bottom:18px">${esc(issue.title)}</div>
    ${para(issue.intro, `font:400 16px/1.65 ${sans};color:#333`)}
  </td></tr>
  <tr><td style="padding:8px 32px 36px"><div style="height:1px;background:#c9a45c;width:48px;line-height:1px;font-size:1px">&nbsp;</div></td></tr>
  ${deals}
  <tr><td style="padding:0 32px 36px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b0b0b"><tr><td style="padding:28px">
      ${para(issue.closing || 'See one you like, or want me to watch for something specific? Just reply to this email. I read every one.', `font:italic 400 18px/1.5 ${serif};color:#f6f1e7`)}
      <div style="font:600 14px/1.4 ${sans};color:#c9a45c">Devin Brown</div>
      <div style="font:400 13px/1.5 ${sans};color:#8e8e93">REALTOR&reg; &nbsp;·&nbsp; From Start 2 Keys</div>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:0 32px 32px;font:400 11px/1.6 ${sans};color:#8a8a8a;text-align:center">
    You're getting this because you signed up for ${NAME} or worked with Devin.<br>
    <a href="${webUrl}" style="color:#8a8a8a">View in browser</a> &nbsp;·&nbsp; <a href="${unsubUrl}" style="color:#8a8a8a">Unsubscribe</a><br>
    ${settings.mailingAddress ? esc(settings.mailingAddress) + '<br>' : ''}
    Information deemed reliable but not guaranteed. Listing data &copy; NWMLS. Equal Housing Opportunity.
  </td></tr>
</table></td></tr></table></body></html>`;
}

// ---------- Follow Up Boss (new readers) ----------
async function toFub(sub) {
  const apiKey = process.env.FUB_API_KEY;
  if (!apiKey) return;
  const auth = Buffer.from(`${apiKey}:`).toString('base64');
  await fetch('https://api.followupboss.com/v1/events', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      type: 'Registration', action: 'Inquiry', system: 'FS2K', source: 'FromStart2Keys.com',
      sourceUrl: `${SITE}/letter`, message: `Signed up for ${NAME} (from ${sub.src}).`,
      person: {
        firstName: sub.firstName, lastName: sub.lastName, stage: 'Lead',
        emails: [{ value: sub.email, type: 'home' }], phones: sub.phone ? [{ value: sub.phone, type: 'mobile' }] : [],
        tags: ['FS2K Website', 'Keys Letter'],
      },
    }),
  }).catch((e) => console.error('letter fub error:', e));
}

// ---------- sending (Resend) ----------
async function sendBatch(messages) {
  const r = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.message || `Email service error ${r.status}`);
  return messages.length;
}

const ALLOWED_ORIGINS = ['https://devbrown23.github.io', 'http://localhost:5173', 'null'];
function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CRM-Passcode');
}

function unsubPage(res, ok) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(ok ? 200 : 400).send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>${NAME}</title>
<body style="margin:0;background:#0b0b0b;color:#f6f1e7;font-family:Georgia,serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px">
<div><div style="font:700 11px/1 Arial,sans-serif;letter-spacing:4px;color:#c9a45c;text-transform:uppercase">${NAME}</div>
<h1 style="font-weight:400;font-size:32px">${ok ? "You're unsubscribed." : "That link didn't work."}</h1>
<p style="color:#8e8e93;font-family:Arial,sans-serif">${ok ? "You won't get any more letters. If you ever want back in, sign up again at fromstart2keys.com/letter." : 'Reply to any letter and Devin will take you off the list.'}</p></div></body>`);
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const c = redisConfig();
  if (!c) return res.status(500).json({ ok: false, error: 'Database not connected' });
  const q = req.query || {};
  const isAgent = same(String(req.headers['x-crm-passcode'] || '').trim(), (process.env.CRM_PASSCODE || '').trim());
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; } })() : (req.body || {});

  try {
    // ----- public -----
    if (req.method === 'GET' && q.photo) {
      const [id, pid] = String(q.photo).split(':');
      if (!validPid(pid)) return res.status(404).end();
      const data = await redis(c, ['GET', photoKey(id, pid)]);
      if (!data) return res.status(404).end();
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(Buffer.from(String(data).replace(/^data:image\/\w+;base64,/, ''), 'base64'));
    }

    if (req.method === 'GET' && q.go) {
      const issue = await getJson(c, issueKey(String(q.go)));
      const deal = issue?.deals?.[Number(q.d) || 0];
      if (!deal || !isHttps(deal.url)) { res.setHeader('Location', '/letter'); return res.status(302).end(); }
      if (!q.me) {
        await redis(c, ['HINCRBY', statsKey(issue.id), `click:${Number(q.d) || 0}`, 1]).catch(() => {});
        await redis(c, ['HINCRBY', statsKey(issue.id), `clicksrc:${source(q.src)}`, 1]).catch(() => {});
        const e = cleanEmail(q.e);
        if (e && same(String(q.t || ''), token(e))) {
          let prev = null;
          try { prev = JSON.parse(await redis(c, ['HGET', clickersKey(issue.id), e]) || 'null'); } catch (x) { prev = null; }
          const homes = Array.from(new Set([...(prev?.homes || []), deal.address])).slice(0, MAX_DEALS);
          await redis(c, ['HSET', clickersKey(issue.id), e, JSON.stringify({ homes, at: new Date().toISOString() })]);
        }
      }
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Location', deal.url);
      return res.status(302).end();
    }

    if (q.unsub) {
      const e = cleanEmail(q.unsub);
      const ok = e && same(String(q.t || ''), token(e));
      if (ok) await redis(c, ['HDEL', SUBS_KEY, e]);
      if (req.method === 'POST') return res.status(ok ? 200 : 400).json({ ok });
      return unsubPage(res, ok);
    }

    if (req.method === 'POST' && q.view) {
      if (q.me) return res.status(200).json({ ok: true, skipped: true });
      await redis(c, ['HINCRBY', statsKey(String(q.view).slice(0, 20)), `view:${source(q.src)}`, 1]);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'POST' && q.subscribe) {
      if (body.website) return res.status(200).json({ ok: true }); // bots fill the hidden field
      const email = cleanEmail(body.email);
      if (!validEmail(email)) return res.status(400).json({ ok: false, error: 'Add a real email address.' });
      const sub = {
        email, firstName: String(body.firstName || '').trim().slice(0, 60), lastName: String(body.lastName || '').trim().slice(0, 60),
        phone: String(body.phone || '').trim().slice(0, 30), src: source(body.src), at: new Date().toISOString(),
      };
      const isNew = await redis(c, ['HSETNX', SUBS_KEY, email, JSON.stringify(sub)]);
      if (isNew) await toFub(sub);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET' && !q.admin && !q.email) {
      const list = await archive(c);
      const id = q.id ? String(q.id) : list[0]?.id;
      const issue = id ? await getJson(c, issueKey(id)) : null;
      res.setHeader('Cache-Control', 'no-store');
      const { cadence } = await getJson(c, SETTINGS_KEY, {});
      return res.status(200).json({ ok: true, issue: issue && (issue.status === 'published' || isAgent) ? publicIssue(issue) : null, archive: list, cadence: cadence || 'weekly' });
    }

    // ----- agent only from here -----
    if (!process.env.CRM_PASSCODE) return res.status(500).json({ ok: false, error: 'Server not configured' });
    if (!isAgent) return res.status(401).json({ ok: false, error: 'Wrong passcode' });

    const settings = await getJson(c, SETTINGS_KEY, {});

    if (req.method === 'GET' && q.email) {
      const issue = await getJson(c, issueKey(String(q.email)));
      if (!issue) return res.status(404).json({ ok: false, error: 'Issue not found' });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(renderEmail(issue, settings, ''));
    }

    if (req.method === 'GET' && q.admin) {
      if (q.id) {
        const issue = await getJson(c, issueKey(String(q.id)));
        if (!issue) return res.status(404).json({ ok: false, error: 'Issue not found' });
        const stats = hashToObj(await redis(c, ['HGETALL', statsKey(issue.id)]));
        const clicked = hashToObj(await redis(c, ['HGETALL', clickersKey(issue.id)]));
        const subs = hashToObj(await redis(c, ['HGETALL', SUBS_KEY]));
        const clickers = Object.entries(clicked).map(([e, raw]) => {
          const info = JSON.parse(raw || '{}');
          const s = subs[e] ? JSON.parse(subs[e]) : {};
          return { email: e, firstName: s.firstName || '', lastName: s.lastName || '', phone: s.phone || '', homes: info.homes || [], at: info.at };
        }).sort((a, b) => b.homes.length - a.homes.length);
        return res.status(200).json({ ok: true, issue, stats, clickers });
      }
      const issues = await getJson(c, INDEX_KEY, []);
      const subs = Object.values(hashToObj(await redis(c, ['HGETALL', SUBS_KEY]))).map((s) => JSON.parse(s))
        .sort((a, b) => (b.at || '').localeCompare(a.at || ''));
      return res.status(200).json({ ok: true, issues, settings, subscribers: subs, canSend: !!(process.env.RESEND_API_KEY && process.env.LETTER_FROM) });
    }

    if (req.method === 'PUT' && q.settings) {
      const next = {
        mailingAddress: String(body.mailingAddress || '').trim().slice(0, 200),
        replyTo: cleanEmail(body.replyTo),
        cadence: body.cadence === 'monthly' ? 'monthly' : 'weekly',
      };
      await setJson(c, SETTINGS_KEY, next);
      return res.status(200).json({ ok: true, settings: next });
    }

    if (req.method === 'PUT') {
      const src = body.issue || {};
      const index = await getJson(c, INDEX_KEY, []);
      const id = src.id && index.some((i) => i.id === src.id) ? src.id : newId();
      const prev = (await getJson(c, issueKey(id))) || { createdAt: new Date().toISOString(), status: 'draft' };
      const issue = { ...prev, id };
      for (const [k, max] of Object.entries(ISSUE_FIELDS)) issue[k] = String(src[k] ?? '').trim().slice(0, max);
      issue.deals = (Array.isArray(src.deals) ? src.deals : []).slice(0, MAX_DEALS).map((d, n) => {
        const out = {};
        for (const [k, max] of Object.entries(DEAL_FIELDS)) out[k] = String(d?.[k] ?? '').trim().slice(0, max);
        if (out.url && !isHttps(out.url)) out.url = '';
        if (!validPid(out.pid)) out.pid = '';
        out.photoVersion = String(d?.photoVersion || '').slice(0, 20);
        return out;
      }).filter((d) => d.address);
      if (!issue.title) return res.status(400).json({ ok: false, error: 'Give this letter a title.' });
      if (body.publish && !issue.deals.length) return res.status(400).json({ ok: false, error: 'Add at least one home before publishing.' });
      if (!issue.subject) issue.subject = issue.title;
      issue.deals = issue.deals.map((d) => (d.pid ? d : { ...d, photoVersion: '' }));
      if (body.publish && issue.status !== 'published') {
        issue.status = 'published';
        issue.publishedAt = new Date().toISOString();
        issue.number = index.filter((i) => i.status === 'published').length + 1;
      }
      if (body.unpublish) issue.status = 'draft';
      issue.updatedAt = new Date().toISOString();
      await setJson(c, issueKey(id), issue);
      const entry = { id, title: issue.title, status: issue.status, number: issue.number || null, publishedAt: issue.publishedAt || null, sentAt: issue.sentAt || null, sentCount: issue.sentCount || 0, updatedAt: issue.updatedAt };
      const nextIndex = [entry, ...index.filter((i) => i.id !== id)].sort((a, b) => (b.publishedAt || b.updatedAt || '').localeCompare(a.publishedAt || a.updatedAt || ''));
      await setJson(c, INDEX_KEY, nextIndex);
      return res.status(200).json({ ok: true, issue });
    }

    if (req.method === 'DELETE' && q.id) {
      const id = String(q.id);
      const index = await getJson(c, INDEX_KEY, []);
      const old = await getJson(c, issueKey(id), {});
      await setJson(c, INDEX_KEY, index.filter((i) => i.id !== id));
      const keys = [issueKey(id), statsKey(id), clickersKey(id)];
      for (const d of old.deals || []) if (validPid(d.pid)) keys.push(photoKey(id, d.pid));
      await redis(c, ['DEL', ...keys]);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'POST' && q.photo) {
      const id = String(body.id || ''), pid = String(body.pid || '');
      if (!(await redis(c, ['EXISTS', issueKey(id)]))) return res.status(400).json({ ok: false, error: 'Save the letter first, then add photos.' });
      if (!validPid(pid)) return res.status(400).json({ ok: false, error: 'Bad photo slot' });
      if (!body.photo) { await redis(c, ['DEL', photoKey(id, pid)]); return res.status(200).json({ ok: true, photoVersion: '' }); }
      if (!/^data:image\/jpeg;base64,/.test(body.photo) || body.photo.length > 600000) return res.status(400).json({ ok: false, error: 'Photo is too large. Try a smaller one.' });
      await redis(c, ['SET', photoKey(id, pid), body.photo]);
      return res.status(200).json({ ok: true, photoVersion: Date.now().toString(36) });
    }

    if (req.method === 'POST' && q.subs) {
      const add = Array.isArray(body.add) ? body.add.slice(0, 2000) : [];
      let added = 0;
      for (const p of add) {
        const email = cleanEmail(p.email);
        if (!validEmail(email)) continue;
        const sub = { email, firstName: String(p.firstName || '').slice(0, 60), lastName: String(p.lastName || '').slice(0, 60), phone: String(p.phone || '').slice(0, 30), src: 'added', at: new Date().toISOString() };
        added += Number(await redis(c, ['HSETNX', SUBS_KEY, email, JSON.stringify(sub)])) || 0;
      }
      return res.status(200).json({ ok: true, added });
    }

    if (req.method === 'DELETE' && q.subs) {
      await redis(c, ['HDEL', SUBS_KEY, cleanEmail(q.subs)]);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'POST' && q.send) {
      if (!process.env.RESEND_API_KEY || !process.env.LETTER_FROM) {
        return res.status(400).json({ ok: false, error: 'Sending is not set up yet. Add RESEND_API_KEY and LETTER_FROM in Vercel, or use Copy email.' });
      }
      const issue = await getJson(c, issueKey(String(body.id)));
      if (!issue) return res.status(404).json({ ok: false, error: 'Issue not found' });
      const subject = issue.subject || issue.title;
      const from = process.env.LETTER_FROM;
      const replyTo = settings.replyTo || undefined;
      const msg = (to) => ({
        from, to: [to], subject: body.test ? `[Test] ${subject}` : subject, html: renderEmail(issue, settings, to), reply_to: replyTo,
        headers: { 'List-Unsubscribe': `<${SITE}/api/letter?unsub=${encodeURIComponent(to)}&t=${token(to)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      });

      if (body.test) {
        const to = cleanEmail(body.to || settings.replyTo);
        if (!validEmail(to)) return res.status(400).json({ ok: false, error: 'Add an email for the test.' });
        await sendBatch([msg(to)]);
        return res.status(200).json({ ok: true, sent: 1, test: true });
      }
      if (issue.status !== 'published') return res.status(400).json({ ok: false, error: 'Publish the letter before sending it.' });
      if (issue.sentAt && !body.force) return res.status(400).json({ ok: false, error: `Already sent on ${new Date(issue.sentAt).toLocaleDateString()}.`, alreadySent: true });

      const emails = Object.keys(hashToObj(await redis(c, ['HGETALL', SUBS_KEY])));
      if (!emails.length) return res.status(400).json({ ok: false, error: 'No readers yet. Add some first.' });
      let sent = 0;
      for (let i = 0; i < emails.length; i += 100) sent += await sendBatch(emails.slice(i, i + 100).map(msg));

      issue.sentAt = new Date().toISOString();
      issue.sentCount = sent;
      await setJson(c, issueKey(issue.id), issue);
      const index = await getJson(c, INDEX_KEY, []);
      await setJson(c, INDEX_KEY, index.map((i) => (i.id === issue.id ? { ...i, sentAt: issue.sentAt, sentCount: sent } : i)));
      return res.status(200).json({ ok: true, sent });
    }

    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('letter error:', err);
    return res.status(500).json({ ok: false, error: err.message && /Email service/.test(err.message) ? err.message : 'Something went wrong. Try again.' });
  }
}
