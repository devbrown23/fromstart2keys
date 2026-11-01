// /api/spar.js  (Vercel serverless on Node)
// AI sparring partner for the Command Center dialer: plays a homeowner on a cold call so Devin can
// practice objection handling, and grades the call at the end.
// Requires env vars: ANTHROPIC_API_KEY, CRM_PASSCODE. Optional: SPAR_MODEL (defaults to claude-haiku-5-5).

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

const clip = (s, n) => String(s || '').slice(0, n);

function systemPrompt({ persona, difficulty, objections, lead }) {
  const cards = (objections || []).slice(0, 12)
    .map((o) => `- "${clip(o.q, 160)}"  (agent's prepared answer: ${clip(o.a, 400)})`).join('\n');
  return `You are role-playing a homeowner who just picked up a cold call from a real estate agent, Devin Brown of Unique Lifestyle Realty, in the Tacoma/Seattle area. This is a practice simulator so Devin can get better at objection handling.

Your character: ${clip(persona, 400)}
Your name: ${clip(lead.first || 'Pat', 40)}. Your street: ${clip(lead.street || 'Union Ave', 60)}.
Difficulty: ${difficulty} (easy = warms up fast, medium = needs 2 good answers, hard = needs 3+ strong answers and hangs up on pushy or rambling lines).

How to play:
- Talk like a real person on the phone: short, 1-2 sentences, casual, no stage directions, no emojis.
- Throw real objections. Prefer ones from Devin's objection cards below, reworded naturally, and mix in questions homeowners actually ask (what's it worth, how's the market, what do you charge, why you, how did you get my number).
- Ask Devin questions back. Make him earn it.
- Trust goes up when he acknowledges you, stays brief, and asks a good question. It drops when he's pushy, salesy, long-winded or ignores what you said.
- If trust gets very low, end the call politely or rudely depending on your character.
- Only agree to an appointment if he has earned trust and clearly asks for a specific time. Then agree and end the call.
- Never break character, never mention being an AI.

Devin's objection cards:
${cards || '- (none provided)'}

Reply with ONLY a JSON object, no other text:
{"say": "<your next line as the homeowner>", "trust": <0-100 integer, your trust in Devin right now>, "coach": "<one short, specific coaching tip on Devin's LAST line, under 25 words; empty string on the first turn>", "lineScore": <0-100 integer rating Devin's last line, or null on the first turn>, "end": null | "hangup" | "booked"}`;
}

function debriefPrompt() {
  return `You are a top real estate cold-calling coach reviewing a practice call transcript between Devin (agent) and a homeowner. Be direct and specific. Reply with ONLY a JSON object:
{"score": <0-100>, "wins": ["<up to 3 short things he did well>"], "fixes": ["<up to 3 short, specific fixes>"], "betterLine": {"original": "<his weakest line, quoted>", "rewrite": "<a stronger version he could say instead>"}}`;
}

function parseJson(text) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (e) { return null; }
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const passcode = process.env.CRM_PASSCODE;
  if (!apiKey || !passcode) {
    return res.status(503).json({ ok: false, error: 'AI sparring is not set up yet (add ANTHROPIC_API_KEY on Vercel).' });
  }
  if (req.headers['x-crm-passcode'] !== passcode) {
    return res.status(401).json({ ok: false, error: 'Wrong passcode' });
  }

  const { mode = 'turn', persona = '', difficulty = 'medium', objections = [], lead = {}, messages = [] } = req.body || {};
  const convo = (Array.isArray(messages) ? messages : []).slice(-24)
    .map((m) => ({ who: m.role === 'agent' ? 'Devin' : 'Homeowner', text: clip(m.text, 600) }));

  let system, apiMessages;
  if (mode === 'debrief') {
    system = debriefPrompt();
    apiMessages = [{ role: 'user', content: 'Transcript:\n' + convo.map((m) => `${m.who}: ${m.text}`).join('\n') }];
  } else {
    system = systemPrompt({ persona, difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium', objections, lead });
    // The homeowner is the assistant; Devin's lines are the user turns. Merge runs so roles alternate.
    apiMessages = [];
    for (const m of convo) {
      const role = m.who === 'Devin' ? 'user' : 'assistant';
      const content = role === 'assistant' ? JSON.stringify({ say: m.text }) : m.text;
      const last = apiMessages[apiMessages.length - 1];
      if (last && last.role === role) last.content += '\n' + content;
      else apiMessages.push({ role, content });
    }
    if (!apiMessages.length || apiMessages[0].role !== 'user') apiMessages.unshift({ role: 'user', content: '(The phone rings. You pick up.)' });
    if (apiMessages[apiMessages.length - 1].role !== 'user') apiMessages.push({ role: 'user', content: '(silence)' });
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.SPAR_MODEL || 'claude-haiku-5-5', max_tokens: mode === 'debrief' ? 700 : 300, system, messages: apiMessages }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('Anthropic error', r.status, j && j.error);
      return res.status(502).json({ ok: false, error: 'The AI didn\'t answer. Try again.' });
    }
    const text = (j.content || []).map((c) => c.text || '').join('');
    const out = parseJson(text);
    if (!out) return res.status(502).json({ ok: false, error: 'The AI gave an odd answer. Try again.' });
    return res.status(200).json({ ok: true, ...out });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
