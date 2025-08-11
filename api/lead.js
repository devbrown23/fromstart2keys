// /api/lead.js  (Vercel serverless on Node)
// Posts a Follow Up Boss EVENT so Lead Flow rules run.
// Requires env var: FUB_API_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const {
      firstName = '',
      lastName = '',
      email = '',
      phone = '',
      area = '',
      timeline = '',
      message = '',
      smsOptIn = false,
      pageUrl = '',     // we send this to FUB as sourceUrl
      utm = {}          // {source, medium, campaign, content, term}
    } = req.body || {};

    if (!email && !phone) {
      return res.status(400).json({ ok: false, error: 'Please provide email or phone.' });
    }

    const tags = [
      'FS2K Website',
      timeline ? `Timeline: ${timeline}` : null,
      area ? `Area: ${area}` : null,
      utm.source ? `utm_source=${utm.source}` : null,
      utm.medium ? `utm_medium=${utm.medium}` : null,
      utm.campaign ? `utm_campaign=${utm.campaign}` : null,
    ].filter(Boolean);

    const person = {
      firstName,
      lastName,
      stage: 'Lead',
      emails: email ? [{ value: email, type: 'work' }] : [],
      phones: phone ? [{ value: phone, type: 'mobile' }] : [],
      tags,
    };

    const eventPayload = {
      // these two are the important bits that trigger lead flow
      type: 'Registration',
      action: 'Inquiry',

      system: 'FS2K',
      source: 'FromStart2Keys.com',
      sourceUrl: pageUrl || 'https://fromstart2keys.vercel.app/',

      message:
        message ||
        `Website inquiry. Opt-in to SMS: ${smsOptIn ? 'yes' : 'no'}. Timeline: ${timeline}. Area: ${area}.`,

      // Attach the person – FUB will create/update and link the event
      person,
    };

    const apiKey = process.env.FUB_API_KEY;
    if (!apiKey) {
      console.error('Missing FUB_API_KEY env var.');
      return res.status(500).json({ ok: false, error: 'Server not configured' });
    }

    const auth = Buffer.from(`${apiKey}:`).toString('base64');

    const fubRes = await fetch('https://api.followupboss.com/v1/events', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (!fubRes.ok) {
      const text = await fubRes.text();
      console.error('FUB error', fubRes.status, text);
      return res.status(502).json({ ok: false, error: 'FUB error', details: text });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Unexpected server error' });
  }
}
