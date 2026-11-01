// /api/dialer-token.js  (Vercel serverless on Node)
// Gives the Command Center Dialer a short-lived Telnyx login token so it can call from the browser
// on Devin's business line. The Telnyx API key never leaves the server.
//
//   POST (header X-CRM-Passcode) -> { ok, token, callerId }
//
// Requires env vars:
//   CRM_PASSCODE            same passcode the Command Center uses
//   TELNYX_API_KEY          Telnyx portal → API Keys
//   TELNYX_CREDENTIAL_ID    Telnyx portal → SIP Connections → your credential connection → Credentials (the credential's ID)
//   TELNYX_CALLER_ID        optional, the business number in any format, e.g. (253) 555-0100

const ALLOWED_ORIGINS = [
  'https://devbrown23.github.io',
  'http://localhost:5173',
  'null', // Command Center opened straight from disk
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
  res.setHeader('Cache-Control', 'no-store');

  const passcode = process.env.CRM_PASSCODE;
  if (!passcode) return res.status(500).json({ ok: false, error: 'Server not configured' });
  if (req.headers['x-crm-passcode'] !== passcode) return res.status(401).json({ ok: false, error: 'Wrong passcode' });

  const apiKey = process.env.TELNYX_API_KEY;
  const credentialId = process.env.TELNYX_CREDENTIAL_ID;
  if (!apiKey || !credentialId) {
    return res.status(500).json({ ok: false, error: 'Business line not set up yet: add TELNYX_API_KEY and TELNYX_CREDENTIAL_ID on Vercel.' });
  }

  try {
    const r = await fetch(`https://api.telnyx.com/v2/telephony_credentials/${encodeURIComponent(credentialId)}/token`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const text = (await r.text()).trim();
    if (!r.ok) {
      console.error('Telnyx token error', r.status, text.slice(0, 300));
      const why = r.status === 401 ? 'Telnyx rejected the API key.' : r.status === 404 ? 'Telnyx couldn\'t find that credential ID.' : `Telnyx error ${r.status}.`;
      return res.status(502).json({ ok: false, error: why });
    }
    // Telnyx returns the JWT as plain text; accept JSON too in case that changes.
    let token = text;
    if (text.startsWith('{')) {
      try { const j = JSON.parse(text); token = j.token || j.data?.token || ''; } catch { token = ''; }
    }
    if (!token) return res.status(502).json({ ok: false, error: 'Telnyx sent back an empty token.' });
    return res.status(200).json({ ok: true, token, callerId: process.env.TELNYX_CALLER_ID || '' });
  } catch (err) {
    console.error('Telnyx token request failed', err);
    return res.status(502).json({ ok: false, error: 'Couldn\'t reach Telnyx. Try again.' });
  }
}
