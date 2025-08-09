export const config = { runtime: 'nodejs20.x' };
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    firstName = '', lastName = '', email = '', phone = '', role = '', timeline = '', area = '', message = '', smsOptIn = false,
    source = 'FromStart2Keys.com', pageUrl = '', submittedAt = new Date().toISOString(), utm = {}
  } = req.body || {};

  if (!email && !phone) return res.status(400).json({ error: 'Email or phone required' });

  try {
    const apiKey = process.env.FUB_API_KEY;
    if (!apiKey) throw new Error('Missing FUB_API_KEY');

    const payload = {
      firstName, lastName, source, stage: 'Lead',
      emails: email ? [{ value: email }] : [],
      phones: phone ? [{ value: phone }] : [],
      tags: [role || 'Role:Unknown', `Timeline:${timeline || 'unspecified'}`, 'Start2Keys'],
      website: pageUrl || undefined,
      note: [
        message && `Message: ${message}`,
        area && `Area: ${area}`,
        `SMS Opt-In: ${smsOptIn ? 'Yes' : 'No'}`,
        `Submitted: ${submittedAt}`,
        utm && (utm.source || utm.medium || utm.campaign)
          ? `UTM -> source:${utm.source||''} medium:${utm.medium||''} campaign:${utm.campaign||''} content:${utm.content||''} term:${utm.term||''}`
          : null,
      ].filter(Boolean).join('\n')
    };

    const r = await fetch('https://api.followupboss.com/v1/people', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(apiKey + ':').toString('base64'),
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: 'FUB error', details: text });
    }

    const data = await r.json();
    return res.status(200).json({ ok: true, data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error', details: e.message });
  }
}
