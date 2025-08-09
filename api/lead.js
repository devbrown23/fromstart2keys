// /api/lead.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vercel Node functions may give you a string or an object.
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    // Basic sanity check (optional)
    if (!body.firstName || !body.email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Log to Vercel so we can confirm the payload
    console.log('Lead received:', {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      area: body.area,
      timeline: body.timeline,
      submittedAt: body.submittedAt,
      utm: body.utm,
    });

    // TODO: send to CRM / email / sheet
    // For now, just return success so the UI can move on.
    return res.status(200).json({ ok: true, message: 'Lead received' });
  } catch (err) {
    console.error('Lead error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// NOTE: Do not set { runtime: 'nodejs20.x' }. If you set a runtime at all, use:
// export const config = { runtime: 'nodejs' };
