// /api/crm-contact.js  (Vercel serverless on Node)
// Adds a contact from the Command Center CRM to Follow Up Boss.
// Uses the People endpoint (not Events) so sphere contacts are not dropped into lead-flow drips.
// Requires env vars: FUB_API_KEY, CRM_PASSCODE

const ALLOWED_ORIGINS = [
  'https://devbrown23.github.io',
  'http://localhost:5173',
  'null', // index.html opened straight from disk
];

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CRM-Passcode');
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const apiKey = process.env.FUB_API_KEY;
  const passcode = process.env.CRM_PASSCODE;
  if (!apiKey || !passcode) {
    console.error('Missing FUB_API_KEY or CRM_PASSCODE env var.');
    return res.status(500).json({ ok: false, error: 'Server not configured' });
  }
  if (req.headers['x-crm-passcode'] !== passcode) {
    return res.status(401).json({ ok: false, error: 'Wrong passcode' });
  }

  try {
    const {
      firstName = '',
      lastName = '',
      email = '',
      phone = '',
      stage = 'Lead',
      source = '',
      note = '',
    } = req.body || {};

    if (!firstName && !lastName && !email && !phone) {
      return res.status(400).json({ ok: false, error: 'Please provide a name, email or phone.' });
    }

    const person = {
      firstName,
      lastName,
      stage,
      source: 'FS2K Command Center',
      emails: email ? [{ value: email, type: 'home' }] : [],
      phones: phone ? [{ value: phone, type: 'mobile' }] : [],
      tags: ['FS2K Command Center', 'Daily 20', source ? `Source: ${source}` : null].filter(Boolean),
    };

    const auth = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
    const headers = { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' };

    // deduplicate=true updates an existing person with the same email/phone instead of making a copy.
    const fubRes = await fetch('https://api.followupboss.com/v1/people?deduplicate=true', {
      method: 'POST',
      headers,
      body: JSON.stringify(person),
    });

    if (!fubRes.ok) {
      const text = await fubRes.text();
      console.error('FUB error', fubRes.status, text);
      return res.status(502).json({ ok: false, error: 'FUB error', details: text });
    }

    const created = await fubRes.json();

    if (note && created.id) {
      const noteRes = await fetch('https://api.followupboss.com/v1/notes', {
        method: 'POST',
        headers,
        body: JSON.stringify({ personId: created.id, subject: 'Command Center', body: note }),
      });
      if (!noteRes.ok) console.error('FUB note error', noteRes.status, await noteRes.text());
    }

    return res.status(200).json({ ok: true, fubId: created.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Unexpected server error' });
  }
}
