// api/lead.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Pull fields (with defaults) from the request
  const {
    firstName = '',
    lastName  = '',
    email     = '',
    phone     = '',
    role      = '',
    timeline  = '',
    area      = '',
    message   = '',
    smsOptIn  = false,
    source    = 'FromStart2Keys.com',
    pageUrl   = '',
    submittedAt = new Date().toISOString(),
    utm = {}
  } = req.body || {};

  // Require at least an email or a phone
  if (!email && !phone) {
    return res.status(400).json({ error: 'Email or phone required' });
  }

  // Build a single "note" field aggregating optional details
  const note = [
    message && `Message: ${message}`,
    area && `Area: ${area}`,
    `SMS Opt-In: ${smsOptIn ? 'Yes' : 'No'}`,
    `Submitted: ${submittedAt}`,
    (utm && (utm.source || utm.medium || utm.campaign || utm.content || utm.term))
      ? `UTM -> source:${utm.source || ''} medium:${utm.medium || ''} campaign:${utm.campaign || ''} content:${utm.content || ''} term:${utm.term || ''}`
      : null
  ].filter(Boolean).join('\n');

  // Prepare the FUB payload
  const fubPayload = {
    firstName,
    lastName,
    source,
    stage: 'Lead',
    emails: email ? [{ value: email }] : [],
    phones: phone ? [{ value: phone }] : [],
    tags: [role || 'Role:Unknown', `Timeline:${timeline || 'unspecified'}`, 'Start2Keys'],
    website: pageUrl || undefined,
    note
  };

  // Send to Follow Up Boss — but don't fail the whole request if it breaks
  let sentToFub = false;
  let fubResponseText = '';
  const apiKey = process.env.FUB_API_KEY;

  try {
    if (!apiKey) {
      console.warn('No FUB_API_KEY set — skipping FUB push.');
    } else {
      // Add a timeout so the page never hangs
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), 8000);

      const r = await fetch('https://api.followupboss.com/v1/people', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(apiKey + ':').toString('base64'),
        },
        body: JSON.stringify(fubPayload),
        signal: controller.signal
      });

      clearTimeout(to);

      if (!r.ok) {
        fubResponseText = await r.text();
        console.error('FUB error:', fubResponseText);
      } else {
        const data = await r.json();
        sentToFub = true;
        console.log('FUB lead created:', data?.id || data);
      }
    }
  } catch (err) {
    console.error('FUB request failed:', err);
  }

  // Always succeed to the browser once validation passes
  return res.status(200).json({
    ok: true,
    sentToFub,
    // Optionally return a small echo of what we received (no secrets)
    received: { firstName, lastName, email, phone, timeline, area },
    // Helpful for debugging if needed
    fubMessage: sentToFub ? 'Lead sent to FUB' : (fubResponseText || 'FUB not called or failed')
  });
}

// If you include a config, use plain 'nodejs' (or omit entirely)
export const config = {
  runtime: 'nodejs',
};
