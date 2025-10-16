import { useEffect, useMemo, useState } from "react";

const CAL = import.meta.env.VITE_CALENDAR_URL || "#";
const FUB_API_URL = import.meta.env.VITE_FUB_API_URL || "/api/lead";
const PORTAL = import.meta.env.VITE_PORTAL_URL || "#";

const fmtMoney = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export default function AvailableHomes() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState({ city: "All", min: "", max: "", beds: "Any", baths: "Any" });
  const [open, setOpen] = useState(null);
  const [fetchErr, setFetchErr] = useState("");

  // Fetch from stub API (swap to IDX later)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setFetchErr("");
        const r = await fetch("/api/nwmls?limit=24", { headers: { Accept: "application/json" } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!alive) return;
        setListings(Array.isArray(j?.listings) ? j.listings : []);
      } catch (e) {
        console.error(e);
        if (alive) setFetchErr("Couldn’t load listings. Please refresh.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const cities = useMemo(() => {
    const set = new Set(listings.map((h) => h.city).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [listings]);

  // Coerce numeric filters safely
  const minPrice = q.min ? Number(q.min) : null;
  const maxPrice = q.max ? Number(q.max) : null;
  const minBeds = q.beds !== "Any" ? Number(q.beds) : null;
  const minBaths = q.baths !== "Any" ? Number(q.baths) : null;

  const filtered = useMemo(() => {
    return listings.filter((h) => {
      if (q.city !== "All" && h.city !== q.city) return false;
      if (minBeds != null && Number(h.beds || 0) < minBeds) return false;
      if (minBaths != null && Number(h.baths || 0) < minBaths) return false;
      if (minPrice != null && Number(h.price || 0) < minPrice) return false;
      if (maxPrice != null && Number(h.price || 0) > maxPrice) return false;
      return true;
    });
  }, [listings, q.city, minBeds, minBaths, minPrice, maxPrice]);

  return (
    <section id="available" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400/90">
              On the market
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Available Homes
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Real-time listings for WA—connect your NWMLS portal or IDX feed here.
            </p>
          </div>

          <a
            href={PORTAL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-lg bg-yellow-400 px-5 py-3 font-semibold text-black hover:bg-yellow-300"
          >
            Open Client Portal
          </a>
        </header>

        {/* Filters */}
        <div className="mb-6 grid gap-3 sm:grid-cols-5">
          <select
            className="rounded-lg border border-yellow-400/25 bg-black px-3 py-2 text-white"
            value={q.city}
            onChange={(e) => setQ((s) => ({ ...s, city: e.target.value }))}
            aria-label="Filter by city"
          >
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border border-yellow-400/25 bg-black px-3 py-2 text-white"
            value={q.beds}
            onChange={(e) => setQ((s) => ({ ...s, beds: e.target.value }))}
            aria-label="Minimum beds"
          >
            {["Any", 2, 3, 4, 5].map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border border-yellow-400/25 bg-black px-3 py-2 text-white"
            value={q.baths}
            onChange={(e) => setQ((s) => ({ ...s, baths: e.target.value }))}
            aria-label="Minimum baths"
          >
            {["Any", 1, 1.5, 2, 2.5, 3, 4].map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <input
            inputMode="numeric"
            placeholder="Min price"
            className="rounded-lg border border-yellow-400/25 bg-black px-3 py-2 text-white"
            value={q.min}
            onChange={(e) => setQ((s) => ({ ...s, min: e.target.value.replace(/\D/g, "") }))}
            aria-label="Minimum price"
          />
          <input
            inputMode="numeric"
            placeholder="Max price"
            className="rounded-lg border border-yellow-400/25 bg-black px-3 py-2 text-white"
            value={q.max}
            onChange={(e) => setQ((s) => ({ ...s, max: e.target.value.replace(/\D/g, "") }))}
            aria-label="Maximum price"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-slate-300">Loading listings…</div>
        ) : fetchErr ? (
          <div className="text-sm text-red-400">{fetchErr}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-yellow-400/20 p-6 text-slate-300">
            No homes match your filters. Try widening your search.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((h) => (
              <article
                key={h.id || `${h.mlsId || ""}-${h.address || Math.random()}`}
                className="overflow-hidden rounded-xl border border-yellow-400/20 bg-[#0b0b0b] shadow-sm transition hover:shadow-[0_0_0_1px_rgba(234,179,8,0.35)]"
              >
                <button
                  onClick={() => setOpen(h)}
                  className="block w-full text-left"
                  aria-label={`View ${h.title || h.address || "home details"}`}
                >
                  <div
                    className="aspect-[4/3] w-full bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${h.img || "/images/instagram/hero-poster.jpg"})`,
                    }}
                  />
                  <div className="p-4">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-lg font-semibold text-white">{fmtMoney(h.price)}</h3>
                      <span className="text-sm text-yellow-400">{h.city}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">
                      {(h.title || `${h.city || ""}`)} • {Number(h.sqft || 0).toLocaleString()} sq ft
                    </p>
                    {h.badge && (
                      <span className="mt-2 inline-block text-xs rounded-full border border-yellow-400/30 px-2 py-1 text-yellow-400">
                        {h.badge}
                      </span>
                    )}
                  </div>
                </button>
              </article>
            ))}
          </div>
        )}

        {/* Compliance (update once IDX live) */}
        <p className="mt-8 text-[11px] text-slate-400">
          Information deemed reliable but not guaranteed. © NWMLS. Listings courtesy of respective
          brokerages.{" "}
          {filtered?.[0]?.lastUpdated &&
            `Last updated ${new Date(filtered[0].lastUpdated).toLocaleString()}.`}
        </p>
      </div>

      {open && <HomeDrawer home={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function HomeDrawer({ home, onClose }) {
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");

  async function askMore() {
    try {
      setSending(true);
      setErr("");
      const params = new URLSearchParams(window.location.search);
      const res = await fetch(FUB_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "LEARN_MORE_HOME",
          source: "FromStart2Keys.com",
          submittedAt: new Date().toISOString(),
          utm: {
            source: params.get("utm_source") || "",
            medium: params.get("utm_medium") || "",
            campaign: params.get("utm_campaign") || "",
          },
          message: `AvailableHomes inquiry: ${home.title || ""} – ${home.address || ""} (MLS ${
            home.mlsId || "N/A"
          })`,
          tags: ["available-homes", home.city, "fs2k"],
          home,
        }),
      });
      if (!res.ok) throw new Error("Network error");
      setOk(true);
    } catch {
      setErr("Couldn’t send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const calUrl = `${CAL}?home=${encodeURIComponent(home.address || home.title || "")}`;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-auto bg-[#0b0b0b] border-l border-yellow-400/20">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h4 className="text-xl font-semibold text-white">{home.title || "Home"}</h4>
            <button
              onClick={onClose}
              className="rounded-lg border border-yellow-400/25 px-3 py-1 text-yellow-400 hover:bg-yellow-400 hover:text-black"
            >
              Close
            </button>
          </div>

          <p className="mt-1 text-sm text-slate-300">{home.address}</p>

          <div
            className="mt-4 aspect-[4/3] w-full rounded-lg bg-cover bg-center"
            style={{ backgroundImage: `url(${home.img || "/images/instagram/hero-poster.jpg"})` }}
          />

          <ul className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            <li>
              Price: <span className="text-yellow-400">{fmtMoney(home.price)}</span>
            </li>
            <li>Beds: {home.beds}</li>
            <li>Baths: {home.baths}</li>
            <li>Sq Ft: {Number(home.sqft || 0).toLocaleString()}</li>
            {home.mlsId && <li>MLS: {home.mlsId}</li>}
          </ul>

          {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
          {ok && <p className="mt-3 text-sm text-yellow-400">Thanks! I’ll text you details on this home.</p>}

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={calUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-lg bg-yellow-400 px-5 py-3 font-semibold text-black hover:bg-yellow-300"
            >
              Schedule a Tour
            </a>

            <button
              onClick={askMore}
              disabled={sending}
              className="inline-flex items-center rounded-lg border border-yellow-400/40 px-5 py-3 font-semibold text-yellow-400 hover:bg-yellow-400 hover:text-black disabled:opacity-60"
            >
              {sending ? "Sending…" : "Ask About This Home"}
            </button>

            {home.portalUrl && (
              <a
                href={home.portalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-lg border border-yellow-400/40 px-5 py-3 font-semibold text-yellow-400 hover:bg-yellow-400 hover:text-black"
              >
                View in Client Portal
              </a>
            )}
          </div>

          <p className="mt-4 text-[11px] text-slate-400">
            {(home.brokerage || "Unique Lifestyle Realty")} • MLS #{home.mlsId || "—"} •{" "}
            {home.lastUpdated ? `Updated ${new Date(home.lastUpdated).toLocaleString()}` : "—"}
            <br />
            {home.disclaimer || "Information deemed reliable but not guaranteed. © NWMLS."}
          </p>
        </div>
      </div>
    </div>
  );
}
