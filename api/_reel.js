// /api/_reel.js  (served at /api/reel: vercel.json rewrites it to /api/spar?tool=reel, which calls this handler.
// The leading _ keeps it from counting as its own function; Vercel Hobby allows 12.)
// Backend for the FS2K Reel Director (fromstart2keys.com/reels).
//
//   POST ?write=1  { topic, lane, secs, format, module, covered: [titles] } -> { ok, reel }   Claude writes one reel
//   GET  ?lib=1                                                             -> { ok, reels, shot }  your saved reels + shot checkmarks
//   PUT  ?lib=1    { reels, shot }                                          -> { ok }              save them (phone + laptop stay in sync)
//
// All calls need the X-CRM-Passcode header. Writing needs ANTHROPIC_API_KEY (same key as Spar).
// Optional REEL_MODEL to pick the model. Library uses the same Upstash Redis database as the other tools.

import { marketStats, statsText } from './_marketstats.js';
const HOUSE_HACK = 'House hacking / beginner investor';
const CLASS_MODULES = [HOUSE_HACK, '1 · Getting your first property', '2 · Running the numbers', '3 · Financing and scaling', '4 · Taxes and exits'];
const TRENDING = 'Trending Local Market (Seattle & Tacoma)';
// Weekly shows built on real numbers: only the facts given are used. Each files under its own heading.
const WEEKLY = {
  [TRENDING]: 'Weekly · Market update',
  "Broker's open / home tour": "Weekly · Broker's open",
  'Deal of the Week': 'Weekly · Deal of the Week',
};
// Buyer-education lanes for the other days of the week (teaching, so dollar figures are examples).
const BUYER = {
  'Buying strategy': 'Buyers · Strategy',
  'VA loans': 'Buyers · VA loans',
  'Seller credits': 'Buyers · Seller credits',
  'Homebuyer education': 'Buyers · Homebuyer education',
};
const LANE_MODULE = { ...WEEKLY, ...BUYER };
const MODULES = [...CLASS_MODULES, ...Object.values(LANE_MODULE)];
const LANES = ['Real estate investing', 'Stocks and markets', 'Money basics', ...Object.keys(WEEKLY), ...Object.keys(BUYER)];

// What each weekly lane is, and the facts rule that replaces "no prices stated as fact".
const LANE_BRIEF = {
  [TRENDING]: 'The weekly Trending Local Market reel for Seattle (King County) and Tacoma (Pierce County). Lead with the most interesting change in the verified numbers, compare the two areas, and say what it means for a regular buyer and a regular seller. One clear takeaway. These are LISTING numbers from Realtor.com (asking prices, active listings, days on market), so say "listing price", never "sale price". Say the month the numbers are from. Put the source on screen in the last scene, for example "Data: Realtor.com via FRED, October 2026" (add Freddie Mac if the mortgage rate is used). End by inviting buyers to the free homebuyer class or sellers to ask for a free home value report.',
  "Broker's open / home tour": "A walkthrough of a home Devin is touring at a broker's open. Short, visual, a mix of on-camera lines and room-by-room shots. Point out real features and who the home would suit. Never claim it's his listing unless the notes say so; name the listing brokerage on screen in the last scene (Washington advertising rule). End by telling people to message him for details or a showing.",
  'Deal of the Week': "This week's Deal of the Week from fromstart2keys.com/deal: why it's a good deal (price drop, seller credit, rate buydown, condition), who it's right for, and the call to action \"Comment DEAL or tap the link in my bio.\" Name the listing brokerage on screen in the last scene (Washington advertising rule).",
};

const BUYER_BRIEF = {
  'Buying strategy': 'Practical buying strategy for first-time and move-up buyers in Tacoma and Seattle: getting pre-approved the right way, how to write a strong offer without overpaying, inspections and contingencies, negotiating repairs, when to walk away, rent versus buy. One tactic per reel, explained with a quick example.',
  'VA loans': 'VA home loans for veterans, active-duty service members and eligible surviving spouses near JBLM: $0 down for eligible buyers, no monthly mortgage insurance, the funding fee and who is exempt, entitlement and the Certificate of Eligibility, using VA on a 2 to 4 unit home you live in, the VA appraisal. General rules only; tell viewers to confirm eligibility with a VA-approved lender. Never state a current rate.',
  'Seller credits': 'Seller credits (seller concessions): how a buyer can ask the seller to pay closing costs or buy down the interest rate, temporary buydowns (like a 2-1) versus a permanent buydown, why a credit can beat a price cut, and that loan programs cap how much a seller can contribute (the cap depends on the loan type and down payment). Use clearly labeled example numbers. Mention that his Deal of the Week often has a seller credit.',
  'Homebuyer education': 'Homebuyer education: the steps from first thought to keys (credit, budget, pre-approval, down payment assistance, house hunting, offer, inspection, appraisal, closing). Washington down payment assistance programs exist and many require a homebuyer education certificate, which his free class provides. Keep facts general and point to the class for details.',
};

const FORMATS = ["Director's choice", 'Talking head', 'Walk and talk', 'Voiceover with b-roll', 'Desk with screen inserts'];
const LIB_KEY = 'reels:mine';
const SHOT_KEY = 'reels:shot';

const clip = (v, n) => String(v ?? '').trim().slice(0, n);

function redisConfig() {
  const env = process.env;
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || Object.entries(env).find(([k]) => k.endsWith('_REST_API_URL'))?.[1];
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN ||
    Object.entries(env).find(([k]) => k.endsWith('_REST_API_TOKEN') && !k.endsWith('_READ_ONLY_TOKEN'))?.[1];
  return url && token ? { url, token } : null;
}
async function redis(c, command) {
  const r = await fetch(c.url, { method: 'POST', headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) throw new Error(body.error || `Redis ${r.status}`);
  return body.result;
}

const ALLOWED_ORIGINS = ['https://devbrown23.github.io', 'http://localhost:5173', 'null'];
function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CRM-Passcode');
}

function buildPrompt(b) {
  const secs = [30, 45, 60].includes(Number(b.secs)) ? Number(b.secs) : 45;
  const lane = LANES.includes(b.lane) ? b.lane : LANES[0];
  const format = FORMATS.includes(b.format) ? b.format : FORMATS[0];
  const weekly = WEEKLY[lane];
  const buyer = BUYER[lane];
  const module = LANE_MODULE[lane] || (MODULES.includes(b.module) ? b.module : '');
  const notes = clip(b.notes, 2500);
  const dealText = b.deal ? 'Deal of the Week saved on his site:\n' + b.deal + '\n' : '';
  const facts = weekly
    ? `Facts: use ONLY the verified statistics and the numbers and details Devin gives below${dealText ? ' and in the Deal of the Week' : ''}, exactly as given, with the period they cover. Where a number would help but none was given, write a placeholder in square brackets like [median sale price] so he fills it in. Never invent prices, rates, days on market or percentages. Interest rates only if he gave them, and never as a promise.`
    : 'No current interest rates or prices stated as fact. Any dollar figures must be introduced out loud as an example.';
  const covered = (Array.isArray(b.covered) ? b.covered : []).slice(0, 80).map((t) => clip(t, 90)).join('; ');
  return 'You are the director and writer for short vertical video reels by Devin Brown, a real estate agent in the Tacoma and Seattle, Washington area (brokerage: Unique Lifestyle Realty). His brand is From Start 2 Keys. He teaches a free homebuyer class and plans to turn his investing reels into a class later. He films on a Canon R8, mostly at his home office, around his home and neighborhood, and at homes he tours. His voice is relaxed, high energy, plain spoken.\n\n' +
    `Write ONE new reel.\nLane: ${lane}\nTopic: ${clip(b.topic, 160) || 'your pick, something not already covered'}\nTarget length: ${secs} seconds (about ${Math.round(secs * 2.4)} spoken words total)\nFormat: ${format}\n` +
    (weekly ? `Show: ${LANE_BRIEF[lane]}\nModule: ${module}\n` : buyer ? `Topic area: ${BUYER_BRIEF[lane]}\nModule: ${module}\n` : `Class module: ${module || 'choose the best fit from: ' + CLASS_MODULES.join(' | ')}\n`) +
    (module === HOUSE_HACK ? 'Audience: first-time and beginner investors who have never bought a rental. Explain every term in plain words the first time it comes up. Focus on house hacking: buying a 2 to 4 unit home (or a home with an ADU or rooms to rent), living in one part and renting the rest, using owner-occupied loans such as FHA, or VA for eligible veterans and service members (Tacoma and JBLM are his market). Cover the real steps and the real trade-offs (being a landlord next door, vacancies, repairs, reserves). General rules only; tell viewers to confirm the details with a lender.\n' : '') +
    `Already covered, do not repeat: ${covered || 'nothing yet'}\n` +
    (dealText ? '\n' + dealText : '') +
    (b.stats ? `\nVerified statistics pulled today (use these exactly, with their month and source):\n${b.stats}\n` : '') +
    (notes ? `\nDevin's numbers and notes for this one:\n${notes}\n` : '') + '\n' +
    'Rules: education only. No promised returns, no telling viewers to buy or sell a specific stock or property. ' + facts + ' Facts about loans and tax rules must be accurate and general; when unsure, leave the claim out. Fair housing: describe homes and neighborhoods, never the kind of people who live there or should live there. Short sentences that are easy to read off a teleprompter. First line is a hook under 16 words. ' +
    (weekly ? 'Last scene ends with the call to action for this show. ' : 'Last scene sends people to the free class with the line ending "Link\'s in my bio." ') +
    '4 to 6 scenes. Each scene needs a specific camera shot, a specific location he can reach, and a physical action for him to do.\n\n' +
    'Reply with only JSON, no markdown, in this shape:\n' +
    '{"title":"under 9 words","module":"one of the module names exactly","format":"...","hook":"first spoken line","scenes":[{"shot":"e.g. Close-up, handheld","where":"location","action":"what he does on camera","line":"the exact words he says","overlay":"short on-screen text","secs":6}],"notes":["3 short director notes on performance, light and edit"],"caption":"one line post caption"}';
}

// The current Deal of the Week (same database as /api/deal), as plain text for the prompt.
async function dealSummary(lane) {
  if (lane !== 'Deal of the Week') return '';
  const c = redisConfig();
  if (!c) return '';
  try {
    const d = JSON.parse((await redis(c, ['GET', 'deal:current'])) || 'null');
    if (!d || !d.address) return '';
    return [
      `${d.address}${d.city ? ', ' + d.city : ''}`,
      [d.price && `Price ${d.price}`, d.originalPrice && `was ${d.originalPrice}`].filter(Boolean).join(', '),
      [d.beds && `${d.beds} bd`, d.baths && `${d.baths} ba`, d.sqft && `${d.sqft} sq ft`].filter(Boolean).join(' · '),
      d.dealTitle && `The deal: ${d.dealTitle}`, d.dealText && clip(d.dealText, 400),
      d.highlights && `Highlights: ${clip(d.highlights, 700).replace(/\n+/g, '; ')}`,
      [d.listingBroker, d.listingFirm].filter(Boolean).length && `Listing courtesy of ${[d.listingBroker, d.listingFirm].filter(Boolean).join(', ')}`,
    ].filter(Boolean).join('\n');
  } catch (e) { return ''; }
}

function normalize(o, b) {
  if (!o || !Array.isArray(o.scenes) || !o.scenes.length) return null;
  const str = (v, d) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 600) : d);
  const scenes = o.scenes.slice(0, 8).map((s = {}) => ({
    shot: str(s.shot, 'Medium'), where: str(s.where, 'Home office'), action: str(s.action, 'Deliver to the lens.'),
    line: str(s.line, ''), overlay: str(s.overlay, ''), secs: Math.max(2, Math.min(30, Math.round(+s.secs) || 6)),
  })).filter((s) => s.line);
  if (!scenes.length) return null;
  const secs = [30, 45, 60].includes(Number(b.secs)) ? Number(b.secs) : 45;
  return {
    id: 'm' + Date.now(), title: str(o.title, 'Untitled reel'),
    module: LANE_MODULE[b.lane] || (MODULES.includes(b.module) ? b.module : (CLASS_MODULES.includes(o.module) ? o.module : CLASS_MODULES[1])),
    length: `${secs} sec`, format: str(o.format, FORMATS.includes(b.format) ? b.format : 'Talking head'),
    hook: str(o.hook, scenes[0].line), scenes,
    notes: Array.isArray(o.notes) ? o.notes.filter((n) => typeof n === 'string').slice(0, 5).map((n) => n.slice(0, 300)) : [],
    caption: str(o.caption, ''), createdAt: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const passcode = (process.env.CRM_PASSCODE || '').trim();
  if (!passcode) return res.status(500).json({ ok: false, error: 'Server not configured' });
  if (String(req.headers['x-crm-passcode'] || '').trim() !== passcode) return res.status(401).json({ ok: false, error: 'Wrong passcode' });
  const q = req.query || {};
  const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) || {};

  try {
    if (q.lib) {
      const c = redisConfig();
      if (!c) return res.status(500).json({ ok: false, error: 'Database not connected' });
      if (req.method === 'GET') {
        const [reels, shot] = await Promise.all([redis(c, ['GET', LIB_KEY]), redis(c, ['GET', SHOT_KEY])]);
        return res.status(200).json({ ok: true, reels: reels ? JSON.parse(reels) : [], shot: shot ? JSON.parse(shot) : {} });
      }
      if (req.method === 'PUT') {
        const reels = Array.isArray(body.reels) ? body.reels.slice(0, 300) : [];
        const shot = body.shot && typeof body.shot === 'object' ? body.shot : {};
        const raw = JSON.stringify(reels);
        if (raw.length > 900000) return res.status(400).json({ ok: false, error: 'Library is too big. Delete a few old reels.' });
        await Promise.all([redis(c, ['SET', LIB_KEY, raw]), redis(c, ['SET', SHOT_KEY, JSON.stringify(shot)])]);
        return res.status(200).json({ ok: true });
      }
    }

    if (req.method === 'GET' && q.stats) {
      const stats = await marketStats({ redis, config: redisConfig(), force: !!q.force });
      if (!stats.ok) return res.status(502).json({ ok: false, error: "Couldn't load the market numbers right now. Try again in a minute, or paste numbers from your MLS.", dropped: stats.dropped });
      return res.status(200).json({ ...stats, text: statsText(stats) });
    }

    if (req.method === 'POST' && q.write) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return res.status(503).json({ ok: false, error: 'Writing reels needs ANTHROPIC_API_KEY on Vercel (the same key Spar uses).' });
      // Trending Local Market: pull the verified numbers unless Devin pasted his own.
      let stats = '';
      if (body.lane === TRENDING && !clip(body.notes, 10)) {
        stats = statsText(await marketStats({ redis, config: redisConfig() }).catch(() => null));
        if (!stats) return res.status(502).json({ ok: false, error: "Couldn't load this week's market numbers. Tap Get this week's numbers to try again, or paste numbers from your MLS." });
      }
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: process.env.REEL_MODEL || 'claude-sonnet-5-5', max_tokens: 2000, messages: [{ role: 'user', content: buildPrompt({ ...body, stats, deal: await dealSummary(body.lane) }) }] }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        console.error('Anthropic error', r.status, j && j.error);
        return res.status(r.status === 429 ? 429 : 502).json({ ok: false, error: r.status === 429 ? 'Too many requests right now. Wait a minute, then try again.' : "The AI didn't answer. Try again." });
      }
      const text = (j.content || []).map((x) => x.text || '').join('');
      const m = text.match(/\{[\s\S]*\}/);
      let reel = null;
      try { reel = m ? normalize(JSON.parse(m[0]), body) : null; } catch (e) { reel = null; }
      if (!reel) return res.status(502).json({ ok: false, error: "That take didn't come out right. Tap the button to try again." });
      return res.status(200).json({ ok: true, reel });
    }

    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('reel error:', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong. Try again.' });
  }
}
