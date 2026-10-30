import { useEffect, useMemo, useState } from "react";

// Real homes Devin adds at /listings/edit (plus the live Deal of the Week), from /api/listings.
const CAL = import.meta.env.VITE_CALENDAR_URL || "";
const PORTAL = import.meta.env.VITE_PORTAL_URL || "";

const fmtMoney = (n) =>
  Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const isMe = () => {
  try { return !!localStorage.getItem("fs2k-agent-code"); } catch { return false; }
};
const facts = (h) =>
  [h.beds && `${h.beds} bd`, h.baths && `${h.baths} ba`, h.sqft && `${Number(h.sqft).toLocaleString()} sq ft`]
    .filter(Boolean).join(" · ");

export default function AvailableHomes() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState({ city: "All", min: "", max: "", beds: "Any", baths: "Any" });
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/listings", { headers: { Accept: "application/json" }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { listings: [] }))
      .then((j) => alive && setListings(Array.isArray(j?.listings) ? j.listings : []))
      .catch(() => alive && setListings([]))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const cityOf = (h) => String(h.city || "").split(",")[0].trim();
  const cities = useMemo(
    () => ["All", ...Array.from(new Set(listings.map(cityOf).filter(Boolean))).sort()],
    [listings]
  );

  const filtered = useMemo(() => {
    const min = q.min ? Number(q.min) : null, max = q.max ? Number(q.max) : null;
    const beds = q.beds !== "Any" ? Number(q.beds) : null, baths = q.baths !== "Any" ? Number(q.baths) : null;
    return listings.filter((h) => {
      if (q.city !== "All" && cityOf(h) !== q.city) return false;
      if (beds != null && Number(h.beds || 0) < beds) return false;
      if (baths != null && Number(h.baths || 0) < baths) return false;
      if (min != null && Number(h.price || 0) < min) return false;
      if (max != null && Number(h.price || 0) > max) return false;
      return true;
    });
  }, [listings, q]);

  const field = "rounded-lg border border-yellow-400/25 bg-black px-3 py-2 text-white";

  return (
    <section id="available" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400/90">On the market</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Available Homes</h2>
            <p className="mt-1 text-sm text-slate-300">
              {!loading && listings.length === 0
                ? "Live home search is coming soon. Until then, I'll send homes that fit you straight from the MLS."
                : "Homes for sale I'm sharing right now. Don't see the one you want? Tell me what you're looking for and I'll send you matches."}
            </p>
          </div>
          {PORTAL && (
            <a href={PORTAL} target="_blank" rel="noreferrer"
              className="inline-flex items-center rounded-lg bg-yellow-400 px-5 py-3 font-semibold text-black hover:bg-yellow-300">
              Open Client Portal
            </a>
          )}
        </header>

        {listings.length > 3 && (
          <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-5">
            <select className={field} value={q.city} onChange={(e) => setQ((s) => ({ ...s, city: e.target.value }))} aria-label="City">
              {cities.map((c) => <option key={c} value={c}>{c === "All" ? "All cities" : c}</option>)}
            </select>
            <select className={field} value={q.beds} onChange={(e) => setQ((s) => ({ ...s, beds: e.target.value }))} aria-label="Minimum beds">
              {["Any", 2, 3, 4, 5].map((b) => <option key={b} value={b}>{b === "Any" ? "Any beds" : `${b}+ beds`}</option>)}
            </select>
            <select className={field} value={q.baths} onChange={(e) => setQ((s) => ({ ...s, baths: e.target.value }))} aria-label="Minimum baths">
              {["Any", 1, 1.5, 2, 2.5, 3].map((b) => <option key={b} value={b}>{b === "Any" ? "Any baths" : `${b}+ baths`}</option>)}
            </select>
            <input inputMode="numeric" placeholder="Min price" className={field} value={q.min}
              onChange={(e) => setQ((s) => ({ ...s, min: e.target.value.replace(/\D/g, "") }))} aria-label="Minimum price" />
            <input inputMode="numeric" placeholder="Max price" className={field} value={q.max}
              onChange={(e) => setQ((s) => ({ ...s, max: e.target.value.replace(/\D/g, "") }))} aria-label="Maximum price" />
          </div>
        )}

        {loading ? (
          <div className="text-slate-300">Loading homes…</div>
        ) : listings.length === 0 ? (
          <HomeAlerts />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-yellow-400/20 p-6 text-slate-300">No homes match your filters. Try widening your search.</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((h) => (
              <article key={h.id}
                className="overflow-hidden rounded-xl border border-yellow-400/20 bg-[#0b0b0b] transition hover:shadow-[0_0_0_1px_rgba(234,179,8,0.45)]">
                <button onClick={() => setOpen(h)} className="block w-full text-left" aria-label={`View ${h.address}`}>
                  <div className="relative aspect-[4/3] w-full bg-[#1a1a1a]">
                    {h.photo ? <img src={h.photo} alt={h.address} loading="lazy" className="h-full w-full object-cover" />
                      : <div className="flex h-full items-center justify-center text-sm text-slate-500">Photos on the listing</div>}
                    {(h.badge || h.status === "Pending") && (
                      <span className="absolute left-3 top-3 rounded-full bg-black/80 px-3 py-1 text-xs font-semibold text-yellow-400">
                        {h.status === "Pending" ? "Pending" : h.badge}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-xl font-semibold text-white">{fmtMoney(h.price)}</h3>
                    <p className="mt-1 text-sm text-slate-300">{facts(h)}</p>
                    <p className="mt-1 text-sm text-slate-400">{h.address}{h.city ? `, ${h.city}` : ""}</p>
                    {h.openHouse && <p className="mt-2 text-xs font-semibold text-yellow-400">Open house: {h.openHouse}</p>}
                  </div>
                </button>
              </article>
            ))}
          </div>
        )}

        {!loading && listings.length > 0 && <HomeAlerts compact />}

        {listings.length > 0 && (
          <p className="mt-8 text-[11px] text-slate-400">
            Information deemed reliable but not guaranteed. Listing information is provided courtesy of the listing brokerage shown on each home.
          </p>
        )}
      </div>

      {open && <HomeDrawer home={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function HomeDrawer({ home, onClose }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const where = `${home.address}${home.city ? `, ${home.city}` : ""}`;
  const seeAll = `/api/listings?go=${encodeURIComponent(home.id)}&src=site${isMe() ? "&me=1" : ""}`;

  async function ask(e) {
    e.preventDefault();
    setErr("");
    if (!form.name.trim() || (!form.phone.trim() && !form.email.trim())) {
      setErr("Add your name and a phone number or email so I can reach you.");
      return;
    }
    setSending(true);
    try {
      const [firstName, ...rest] = form.name.trim().split(/\s+/);
      const p = new URLSearchParams(window.location.search);
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName: rest.join(" "), phone: form.phone.trim(), email: form.email.trim(),
          area: String(home.city || "").split(",")[0],
          message: `Asked about ${where} (${fmtMoney(home.price)}${home.mls ? `, MLS #${home.mls}` : ""}) on the Available Homes section.`,
          pageUrl: window.location.href,
          utm: { source: p.get("utm_source") || "", medium: p.get("utm_medium") || "", campaign: p.get("utm_campaign") || "" },
          extraTags: ["Available Homes", home.fromDeal ? "Deal of the Week" : null].filter(Boolean),
        }),
      });
      if (!r.ok) throw new Error();
      setOk(true);
    } catch {
      setErr("Couldn't send. Please try again, or call or text me.");
    } finally {
      setSending(false);
    }
  }

  const input = "w-full rounded-lg border border-yellow-400/25 bg-black px-3 py-2 text-white";

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={where}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-auto border-l border-yellow-400/20 bg-[#0b0b0b]">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-2xl font-semibold text-white">{fmtMoney(home.price)}</h4>
              <p className="mt-1 text-sm text-slate-300">{where}</p>
            </div>
            <button onClick={onClose}
              className="rounded-lg border border-yellow-400/25 px-3 py-1 text-yellow-400 hover:bg-yellow-400 hover:text-black">
              Close
            </button>
          </div>

          {home.photo && <img src={home.photo} alt={home.address} className="mt-4 aspect-[4/3] w-full rounded-lg object-cover" />}

          <p className="mt-4 text-sm text-slate-300">{facts(home)}</p>
          {home.openHouse && <p className="mt-1 text-sm font-semibold text-yellow-400">Open house: {home.openHouse}</p>}

          <div className="mt-5 flex flex-wrap gap-3">
            {home.hasLink && (
              <a href={seeAll} target="_blank" rel="noreferrer"
                className="inline-flex items-center rounded-lg bg-yellow-400 px-5 py-3 font-semibold text-black hover:bg-yellow-300">
                See all photos &amp; details
              </a>
            )}
            {CAL && (
              <a href={`${CAL}${CAL.includes("?") ? "&" : "?"}home=${encodeURIComponent(where)}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center rounded-lg border border-yellow-400/40 px-5 py-3 font-semibold text-yellow-400 hover:bg-yellow-400 hover:text-black">
                Schedule a tour
              </a>
            )}
          </div>

          <form onSubmit={ask} className="mt-6 rounded-xl border border-yellow-400/20 p-4">
            <p className="font-semibold text-white">Ask about this home</p>
            {ok ? (
              <p className="mt-2 text-sm text-yellow-400">Got it, thank you! I'll reach out shortly about this home.</p>
            ) : (
              <>
                <div className="mt-3 grid gap-3">
                  <input className={input} placeholder="Your name" autoComplete="name" value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} aria-label="Your name" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className={input} placeholder="Phone" type="tel" autoComplete="tel" value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} aria-label="Phone" />
                    <input className={input} placeholder="Email" type="email" autoComplete="email" value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} aria-label="Email" />
                  </div>
                </div>
                {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
                <button type="submit" disabled={sending}
                  className="mt-3 inline-flex items-center rounded-lg border border-yellow-400/40 px-5 py-3 font-semibold text-yellow-400 hover:bg-yellow-400 hover:text-black disabled:opacity-60">
                  {sending ? "Sending…" : "Send"}
                </button>
              </>
            )}
          </form>

          <p className="mt-4 text-[11px] text-slate-400">
            {(home.listingBroker || home.listingFirm) &&
              <>Listing courtesy of {[home.listingBroker, home.listingFirm].filter(Boolean).join(", ")}.{" "}</>}
            {home.mls && <>MLS #{home.mls}. </>}
            Information deemed reliable but not guaranteed.
          </p>
        </div>
      </div>
    </div>
  );
}

const AREAS = ["Tacoma", "Lakewood", "University Place", "Puyallup", "Spanaway", "Federal Way", "Olympia / Lacey", "Seattle", "Other"];
const PRICES = ["Under $400K", "$400K–$500K", "$500K–$650K", "$650K–$800K", "$800K+", "Not sure yet"];

// Home Alerts: lead capture that feeds Follow Up Boss so Devin can set up a OneHome saved search.
function HomeAlerts({ compact = false }) {
  const [f, setF] = useState({ price: "", beds: "", areas: [], name: "", phone: "", email: "", firstTime: false });
  const [state, setState] = useState("idle");
  const [err, setErr] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const toggleArea = (a) => set("areas", f.areas.includes(a) ? f.areas.filter((x) => x !== a) : [...f.areas, a]);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!f.name.trim() || (!f.phone.trim() && !f.email.trim())) {
      setErr("Add your name and a phone number or email so I can send you homes.");
      return;
    }
    setState("sending");
    try {
      const [firstName, ...rest] = f.name.trim().split(/\s+/);
      const p = new URLSearchParams(window.location.search);
      const wants = [f.price && `Price: ${f.price}`, f.beds && `Beds: ${f.beds}+`, f.areas.length && `Areas: ${f.areas.join(", ")}`, f.firstTime && "First-time buyer"].filter(Boolean).join(" · ");
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName: rest.join(" "), phone: f.phone.trim(), email: f.email.trim(),
          area: f.areas[0] || "", message: `Home Alerts signup. ${wants || "No preferences given"}. Set up a OneHome saved search.`,
          pageUrl: window.location.href,
          utm: { source: p.get("utm_source") || "", medium: p.get("utm_medium") || "", campaign: p.get("utm_campaign") || "" },
          extraTags: ["Home Alerts", f.firstTime ? "First-Time Buyer" : null, f.price ? `Budget: ${f.price}` : null].filter(Boolean),
        }),
      });
      if (!r.ok) throw new Error();
      setState("done");
    } catch {
      setState("idle");
      setErr("Couldn't send. Please try again, or call or text me.");
    }
  }

  const input = "w-full rounded-lg border border-yellow-400/25 bg-black px-3 py-2.5 text-white placeholder:text-slate-500";
  const chip = (on) => `rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-yellow-400 bg-yellow-400 text-black font-semibold" : "border-yellow-400/25 text-slate-300 hover:border-yellow-400/60"}`;

  if (state === "done")
    return (
      <div className={`rounded-2xl border border-yellow-400/30 bg-[#0b0b0b] p-6 sm:p-8 ${compact ? "mt-10" : ""}`}>
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400">You're on the list</p>
        <h3 className="mt-2 text-2xl font-bold text-white">Thanks, {f.name.trim().split(/\s+/)[0]}!</h3>
        <p className="mt-2 text-slate-300">I'll set up your home search and text you to make sure it's dialed in. New homes that fit will come straight to you.</p>
      </div>
    );

  return (
    <form onSubmit={submit} className={`rounded-2xl border border-yellow-400/30 bg-[#0b0b0b] p-6 sm:p-8 ${compact ? "mt-10" : ""}`}>
      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400">{compact ? "Not seeing the one?" : "Home Alerts"}</p>
          <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {compact ? "Get new homes sent to you." : "Get new homes sent to you the day they hit the market."}
          </h3>
          <p className="mt-3 text-slate-300">
            Tell me what you're looking for and I'll set up a personal home search for you, straight from the MLS. New listings, price drops and open houses that fit your budget come right to your phone and inbox.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {["Free, no pressure, unsubscribe anytime", "Hand-picked by a local agent, not a robot", "First-time buyer? I'll pair it with a free homebuyer class"].map((t) => (
              <li key={t} className="flex gap-2"><span className="text-yellow-400">✓</span>{t}</li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-300">Price range
              <select className={input} value={f.price} onChange={(e) => set("price", e.target.value)}>
                <option value="">Choose…</option>{PRICES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm text-slate-300">Bedrooms
              <select className={input} value={f.beds} onChange={(e) => set("beds", e.target.value)}>
                <option value="">Any</option>{[1, 2, 3, 4, 5].map((b) => <option key={b} value={b}>{b}+</option>)}
              </select>
            </label>
          </div>
          <div>
            <p className="mb-2 text-sm text-slate-300">Areas you like</p>
            <div className="flex flex-wrap gap-2">
              {AREAS.map((a) => <button type="button" key={a} onClick={() => toggleArea(a)} className={chip(f.areas.includes(a))} aria-pressed={f.areas.includes(a)}>{a}</button>)}
            </div>
          </div>
          <input className={input} placeholder="Your name" autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} aria-label="Your name" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={input} type="tel" placeholder="Phone" autoComplete="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} aria-label="Phone" />
            <input className={input} type="email" placeholder="Email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} aria-label="Email" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={f.firstTime} onChange={(e) => set("firstTime", e.target.checked)} className="h-4 w-4 accent-yellow-400" />
            I'm a first-time buyer
          </label>
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button type="submit" disabled={state === "sending"}
            className="rounded-lg bg-yellow-400 px-5 py-3 font-semibold text-black hover:bg-yellow-300 disabled:opacity-60">
            {state === "sending" ? "Sending…" : "Send me homes"}
          </button>
          <p className="text-[11px] text-slate-500">By sending, you agree I can contact you about homes by phone, text or email. Msg & data rates may apply.</p>
        </div>
      </div>
    </form>
  );
}
