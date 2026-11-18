// /api/_marketstats.js  (helper, not its own function; the leading _ keeps it out of Vercel's 12-function count)
//
// Pulls verified housing statistics for the Reel Director's "Trending Local Market" show:
//   - Realtor.com Housing Inventory Core Metrics for King County (Seattle) and Pierce County (Tacoma),
//     published monthly by the St. Louis Fed on FRED (listing data: asking prices, active listings, etc.)
//   - Freddie Mac's weekly 30-year fixed mortgage rate (PMMS), also on FRED
//
// Each series is fetched as FRED's public CSV. A number is only used when the download worked and the
// latest observation is recent, so a renamed or discontinued series is dropped instead of guessed at.
// Results are cached in Redis for 12 hours.

const FRED_CSV = (id) => `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`;
const FRED_PAGE = (id) => `https://fred.stlouisfed.org/series/${id}`;
const CACHE_KEY = 'reels:marketstats';
const CACHE_SECS = 12 * 3600;

const AREAS = [
  { fips: '53033', name: 'Seattle area (King County)' },
  { fips: '53053', name: 'Tacoma area (Pierce County)' },
];
// kind: how to show it. All Realtor.com series are monthly listing data.
const METRICS = [
  { key: 'price', prefix: 'MEDLISPRI', label: 'Median listing price', kind: 'money' },
  { key: 'active', prefix: 'ACTLISCOU', label: 'Active listings', kind: 'count' },
  { key: 'newl', prefix: 'NEWLISCOU', label: 'New listings', kind: 'count' },
  { key: 'pending', prefix: 'PENLISCOU', label: 'Pending listings', kind: 'count' },
  { key: 'dom', prefix: 'MEDDAYONMAR', label: 'Median days on market', kind: 'days' },
  { key: 'cuts', prefix: 'PRIREDCOU', label: 'Listings with a price cut', kind: 'count' },
];
const MONTHLY_MAX_AGE_DAYS = 160; // Realtor.com data posts with a lag; older than ~5 months means the series stopped
const WEEKLY_MAX_AGE_DAYS = 21;

async function fetchText(url, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'FS2K-ReelDirector/1.0', Accept: 'text/csv' } });
    if (!r.ok) return '';
    return await r.text();
  } catch (e) {
    return '';
  } finally {
    clearTimeout(t);
  }
}

// FRED CSV: header row, then "YYYY-MM-DD,value" (missing values are "." or blank).
async function series(id) {
  const text = await fetchText(FRED_CSV(id), 7000);
  if (!/^\s*(observation_date|DATE)\s*,/i.test(text)) return null;
  const rows = text.trim().split(/\r?\n/).slice(1).map((l) => l.split(',')).map(([d, v]) => [d, Number(v)])
    .filter(([d, v]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(v) && String(v) !== '');
  return rows.length ? rows : null;
}

const ageDays = (d) => (Date.now() - new Date(d + 'T00:00:00Z').getTime()) / 864e5;
const monthName = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dayName = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
function fmt(kind, v) {
  if (kind === 'money') return '$' + Math.round(v).toLocaleString('en-US');
  if (kind === 'days') return `${Math.round(v)} days`;
  if (kind === 'pct') return `${v.toFixed(2)}%`;
  return Math.round(v).toLocaleString('en-US');
}
// Value about a year before the latest point (monthly: 12 rows back; weekly: closest date 52 weeks back).
function yearAgo(rows, weekly) {
  const last = rows[rows.length - 1];
  if (!weekly) {
    const d = new Date(last[0] + 'T00:00:00Z'), want = new Date(Date.UTC(d.getUTCFullYear() - 1, d.getUTCMonth(), 1)).toISOString().slice(0, 10);
    return rows.find((r) => r[0] === want) || null;
  }
  const target = new Date(last[0]).getTime() - 364 * 864e5;
  let best = null;
  for (const r of rows) if (!best || Math.abs(new Date(r[0]).getTime() - target) < Math.abs(new Date(best[0]).getTime() - target)) best = r;
  return best && Math.abs(new Date(best[0]).getTime() - target) < 10 * 864e5 ? best : null;
}

async function freshStats() {
  const jobs = [];
  for (const a of AREAS) for (const m of METRICS) jobs.push({ area: a.name, ...m, id: m.prefix + a.fips });
  jobs.push({ area: 'United States', key: 'rate', id: 'MORTGAGE30US', label: '30-year fixed mortgage rate (weekly average)', kind: 'pct', weekly: true });
  const results = await Promise.all(jobs.map(async (j) => ({ j, rows: await series(j.id) })));

  const items = [];
  const dropped = [];
  for (const { j, rows } of results) {
    const last = rows && rows[rows.length - 1];
    if (!last || ageDays(last[0]) > (j.weekly ? WEEKLY_MAX_AGE_DAYS : MONTHLY_MAX_AGE_DAYS)) { dropped.push(j.id); continue; }
    const prev = yearAgo(rows, j.weekly);
    const item = {
      area: j.area, key: j.key, label: j.label, id: j.id, date: last[0], value: last[1], display: fmt(j.kind, last[1]),
      period: j.weekly ? `week of ${dayName(last[0])}` : monthName(last[0]),
      source: j.weekly ? 'Freddie Mac PMMS, via FRED' : 'Realtor.com, via FRED',
      url: FRED_PAGE(j.id),
    };
    if (prev && prev[1]) {
      if (j.kind === 'pct') item.change = `${(last[1] - prev[1] >= 0 ? '+' : '')}${(last[1] - prev[1]).toFixed(2)} pts vs a year ago, when it was ${prev[1].toFixed(2)}%`;
      else { const pc = ((last[1] - prev[1]) / prev[1]) * 100; item.change = `${pc >= 0 ? '+' : ''}${pc.toFixed(1)}% vs a year ago`; }
    }
    items.push(item);
  }
  // Price-cut share: cuts ÷ active listings, same county and month.
  for (const a of AREAS) {
    const cut = items.find((i) => i.area === a.name && i.key === 'cuts');
    const act = items.find((i) => i.area === a.name && i.key === 'active');
    if (cut && act && cut.date === act.date && act.value) {
      cut.label = 'Share of listings with a price cut';
      cut.display = `${((cut.value / act.value) * 100).toFixed(1)}% (${fmt('count', cut.value)} of ${fmt('count', act.value)})`;
      delete cut.change;
    }
  }
  return { ok: items.length > 0, fetchedAt: new Date().toISOString(), items, dropped };
}

export async function marketStats({ redis, config, force } = {}) {
  if (config && redis && !force) {
    try {
      const hit = await redis(config, ['GET', CACHE_KEY]);
      if (hit) return { ...JSON.parse(hit), cached: true };
    } catch (e) { /* cache miss is fine */ }
  }
  const out = await freshStats();
  if (out.ok && config && redis) await redis(config, ['SET', CACHE_KEY, JSON.stringify(out), 'EX', CACHE_SECS]).catch(() => {});
  return out;
}

// Plain-text block for the writer prompt and the notes box: one line per number, with period and source.
export function statsText(stats) {
  if (!stats || !stats.items || !stats.items.length) return '';
  const byArea = {};
  for (const i of stats.items) (byArea[i.area] = byArea[i.area] || []).push(i);
  return Object.entries(byArea).map(([area, list]) => `${area}:\n` + list.map((i) =>
    `- ${i.label}: ${i.display}${i.change ? ` (${i.change})` : ''}. ${i.period}. Source: ${i.source}.`).join('\n')).join('\n');
}
