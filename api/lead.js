// /api/lead.js  (Vercel serverless on Node)
// Every website form posts here. Sends a Follow Up Boss EVENT so Lead Flow rules run.
//
// CMA requests (type CMA_QUICK / CMA_FULL from the Sell section) also:
//   - send the full property (address, beds, baths, sqft, condition, notes) to Follow Up Boss as a Seller Inquiry
//   - look up the county parcel (assessed value + assessor link) so Devin can start the CMA right away
//   - keep a backup copy in the site database (leads:log), so a lead is never lost if Follow Up Boss is down
//   - when RESEND_API_KEY + LETTER_FROM are set: email Devin an alert and email the homeowner a confirmation
//
// Env vars: FUB_API_KEY; optional LEAD_ALERT_EMAIL (where alerts go), RESEND_API_KEY, LETTER_FROM, Upstash Redis vars.

import { lookupAddress } from './property.js';

const s = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => (n ? '$' + Math.round(n).toLocaleString('en-US') : '');

function redisConfig() {
  const env = process.env;
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || Object.entries(env).find(([k]) => k.endsWith('_REST_API_URL'))?.[1];
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN ||
    Object.entries(env).find(([k]) => k.endsWith('_REST_API_TOKEN') && !k.endsWith('_READ_ONLY_TOKEN'))?.[1];
  return url && token ? { url, token } : null;
}
async function redis(command) {
  const c = redisConfig();
  if (!c) return null;
  const r = await fetch(c.url, { method: 'POST', headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) throw new Error(body.error || `Redis ${r.status}`);
  return body.result;
}

const withTimeout = (p, ms) => Promise.race([p, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

async function sendEmail(msg) {
  if (!process.env.RESEND_API_KEY || !process.env.LETTER_FROM) return false;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.LETTER_FROM, ...msg }),
  });
  if (!r.ok) console.error('lead email error', r.status, await r.text().catch(() => ''));
  return r.ok;
}

async function alertTo() {
  if (process.env.LEAD_ALERT_EMAIL) return process.env.LEAD_ALERT_EMAIL;
  try { return JSON.parse((await redis(['GET', 'letter:settings'])) || '{}').replyTo || ''; } catch (e) { return ''; }
}

function homeownerEmail(lead, full) {
  const sans = "-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif", serif = "Didot,'Bodoni 72',Georgia,serif";
  return `<!doctype html><html><body style="margin:0;background:#f4f0e8"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#fffdf9;border:1px solid #e7e1d6">
<tr><td style="background:#0b0b0b;padding:26px 32px;text-align:center;font:400 30px/1.1 ${serif};color:#f6f1e7">From Start <span style="color:#c9a45c;font-style:italic">2</span> Keys</td></tr>
<tr><td style="padding:34px 32px;font:400 16px/1.65 ${sans};color:#333">
<div style="font:400 26px/1.2 ${serif};color:#111;padding-bottom:16px">Got it${lead.firstName ? `, ${esc(lead.firstName)}` : ''}. Your ${full ? 'full CMA' : 'home value estimate'} is in the works.</div>
<p style="margin:0 0 14px">I'm pulling recent sales near <strong>${esc(lead.address)}${lead.city ? `, ${esc(lead.city)}` : ''}</strong> and will send your ${full ? 'full comparative market analysis' : 'estimate'} within 24 hours.</p>
<p style="margin:0 0 14px">Online estimates can miss by tens of thousands because they can't see your upgrades or condition. ${full ? 'Thanks for the extra detail, it makes a real difference.' : "If you've updated anything (kitchen, roof, floors), just reply and tell me. It'll make your number more accurate."}</p>
<p style="margin:0 0 22px">Questions before then? Call or text me at <a href="tel:8036581509" style="color:#111">(803) 658-1509</a>.</p>
<div style="font:600 14px/1.4 ${sans};color:#a8823a">Devin Brown</div><div style="font:400 13px/1.5 ${sans};color:#8a8a8a">REALTOR® · Unique Lifestyle Realty</div>
</td></tr></table></td></tr></table></body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const b = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) || {};
    if (s(b.company) || s(b.website)) return res.status(200).json({ ok: true }); // honeypot: bots fill hidden fields

    const lead = {
      type: s(b.type, 20), firstName: s(b.firstName, 60), lastName: s(b.lastName, 60), email: s(b.email, 160).toLowerCase(), phone: s(b.phone, 30),
      area: s(b.area, 80), timeline: s(b.timeline, 40), message: s(b.message, 2000), smsOptIn: !!b.smsOptIn, pageUrl: s(b.pageUrl, 500),
      address: s(b.address, 160), city: s(b.city, 80), zip: s(b.zip, 10), beds: s(b.beds, 10), baths: s(b.baths, 10), sqft: s(b.sqft, 20),
      yearBuilt: s(b.yearBuilt, 10), condition: s(b.condition, 30), upgrades: s(b.upgrades, 1500), photosUrl: s(b.photosUrl, 500), notes: s(b.notes, 1500),
    };
    const utm = b.utm && typeof b.utm === 'object' ? b.utm : {};
    const extraTags = Array.isArray(b.extraTags) ? b.extraTags : [];

    if (!lead.email && !lead.phone) return res.status(400).json({ ok: false, error: 'Please add your email or phone.' });

    const isCma = /^CMA_/.test(lead.type);
    const full = lead.type === 'CMA_FULL';
    if (isCma && !lead.address) return res.status(400).json({ ok: false, error: 'Please add the street address.' });

    // County record for CMA requests (public WA parcel data). Never blocks the lead for more than 4 seconds.
    let parcel = null;
    if (isCma) {
      const found = await withTimeout(lookupAddress([lead.address, lead.city, lead.zip].filter(Boolean).join(', ')).catch(() => null), 4000);
      parcel = found?.matches?.[0]?.score >= 60 ? found.matches[0] : null;
    }

    let message = lead.message;
    if (isCma) {
      message = [
        `${full ? 'FULL CMA' : 'QUICK CMA'} request: ${lead.address}, ${[lead.city, lead.zip].filter(Boolean).join(' ')}`,
        [lead.beds && `${lead.beds} bd`, lead.baths && `${lead.baths} ba`, lead.sqft && `${lead.sqft} sq ft`, lead.yearBuilt && `built ${lead.yearBuilt}`].filter(Boolean).join(' · '),
        lead.condition && `Condition: ${lead.condition}`,
        `Timeline: ${lead.timeline || 'not given'}`,
        lead.upgrades && `Upgrades: ${lead.upgrades}`,
        lead.photosUrl && `Photos: ${lead.photosUrl}`,
        lead.notes && `Notes: ${lead.notes}`,
        parcel && `County: parcel ${parcel.parcel}, assessed ${money(parcel.value)} (${parcel.landUse}, ${parcel.county} County)${parcel.link ? ` ${parcel.link}` : ''}`,
        'Promised: CMA sent within 24 hours.',
      ].filter(Boolean).join('\n');
    }
    if (!message) message = `Website inquiry. Opt-in to SMS: ${lead.smsOptIn ? 'yes' : 'no'}. Timeline: ${lead.timeline}. Area: ${lead.area}.`;

    const tags = [
      'FS2K Website',
      isCma && 'Seller', isCma && 'CMA Request', isCma && (full ? 'CMA: Full' : 'CMA: Quick'),
      lead.timeline && `Timeline: ${lead.timeline}`,
      lead.area && `Area: ${lead.area}`,
      utm.source && `utm_source=${s(utm.source, 60)}`,
      utm.medium && `utm_medium=${s(utm.medium, 60)}`,
      utm.campaign && `utm_campaign=${s(utm.campaign, 60)}`,
      ...extraTags.slice(0, 3).map((t) => s(t, 60)),
    ].filter(Boolean);

    // Backup copy first, so nothing is lost even if Follow Up Boss fails.
    const record = { ...lead, message, tags, parcel: parcel && { parcel: parcel.parcel, value: parcel.value, link: parcel.link }, at: new Date().toISOString() };
    let saved = false;
    try { saved = !!(await redis(['LPUSH', 'leads:log', JSON.stringify(record)])); await redis(['LTRIM', 'leads:log', 0, 999]); } catch (e) { console.error('lead backup error', e); }

    let fubOk = false, fubError = '';
    const apiKey = process.env.FUB_API_KEY;
    if (!apiKey) fubError = 'Missing FUB_API_KEY';
    else {
      const event = {
        type: isCma ? 'Seller Inquiry' : 'Registration',
        system: 'FS2K', source: 'FromStart2Keys.com', sourceUrl: lead.pageUrl || 'https://www.fromstart2keys.com/', message,
        person: {
          firstName: lead.firstName, lastName: lead.lastName, stage: 'Lead',
          emails: lead.email ? [{ value: lead.email, type: 'home' }] : [], phones: lead.phone ? [{ value: lead.phone, type: 'mobile' }] : [], tags,
        },
      };
      if (!isCma) event.action = 'Inquiry';
      if (isCma) {
        event.property = {
          street: lead.address, city: lead.city || parcel?.city || '', state: 'WA', code: lead.zip || parcel?.zip || '',
          bedrooms: lead.beds || undefined, bathrooms: lead.baths || undefined, area: lead.sqft || undefined,
          price: parcel?.value || undefined, type: parcel?.landUse || undefined,
        };
      }
      const auth = Buffer.from(`${apiKey}:`).toString('base64');
      const r = await fetch('https://api.followupboss.com/v1/events', {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(event),
      });
      fubOk = r.ok;
      if (!r.ok) { fubError = `FUB ${r.status}: ${(await r.text().catch(() => '')).slice(0, 300)}`; console.error(fubError); }
    }

    if (isCma) {
      const to = await alertTo();
      const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email || lead.phone;
      await Promise.all([
        to && sendEmail({
          to: [to], reply_to: lead.email || undefined,
          subject: `🏠 New ${full ? 'FULL' : 'quick'} CMA: ${lead.address}${lead.city ? `, ${lead.city}` : ''} (${lead.timeline || 'no timeline'})`,
          text: `${name}\n${lead.phone ? `Phone: ${lead.phone}\n` : ''}${lead.email ? `Email: ${lead.email}\n` : ''}\n${message}\n\n${fubOk ? 'In Follow Up Boss as a Seller Inquiry.' : `NOT in Follow Up Boss (${fubError}). Add them by hand.`}`,
        }),
        lead.email && sendEmail({
          to: [lead.email], reply_to: to || undefined,
          subject: full ? 'Your full CMA is in the works' : 'Your home value estimate is on the way', html: homeownerEmail(lead, full),
        }),
      ].filter(Boolean)).catch((e) => console.error('lead email error', e));
    }

    if (!fubOk && !saved) return res.status(502).json({ ok: false, error: "That didn't go through. Please call or text (803) 658-1509." });
    return res.status(200).json({ ok: true, fub: fubOk });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Unexpected server error' });
  }
}
