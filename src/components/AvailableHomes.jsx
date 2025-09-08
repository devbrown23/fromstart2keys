import { useMemo, useState } from "react";

const CAL = import.meta.env.VITE_CALENDAR_URL || "#";
const FUB_API_URL = import.meta.env.VITE_FUB_API_URL || "/api/lead";

const INVENTORY = [
  {
    id: "tacoma-1",
    title: "Tacoma – 4bd/2.5ba",
    price: 624900,
    city: "Tacoma",
    beds: 4,
    baths: 2.5,
    sqft: 2210,
    address: "1234 N Pearl St, Tacoma, WA",
    img: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1400&auto=format&fit=crop",
    badge: "Open House Sat",
  },
  {
    id: "lacey-1",
    title: "Lacey – 3bd/2ba",
    price: 459000,
    city: "Lacey",
    beds: 3,
    baths: 2,
    sqft: 1650,
    address: "5678 Woodland Loop, Lacey, WA",
    img: "https://images.unsplash.com/photo-1597047084897-51e81819a499?q=80&w=1400&auto=format&fit=crop",
    badge: "New",
  },
  {
    id: "dupont-1",
    title: "DuPont – 5bd/3ba",
    price: 739500,
    city: "DuPont",
    beds: 5,
    baths: 3,
    sqft: 3010,
    address: "9012 Station Dr, DuPont, WA",
    img: "https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=1400&auto=format&fit=crop",
    badge: "Price Drop",
  },
];

export default function AvailableHomes() {
  const [q, setQ] = useState({ city: "All", min: "", max: "", beds: "Any" });
  const [open, setOpen] = useState(null);
  const cities = useMemo(() => ["All", ...new Set(INVENTORY.map(h => h.city))], []);

  const filtered = useMemo(() => {
    return INVENTORY.filter(h => {
      if (q.city !== "All" && h.city !== q.city) return false;
      if (q.beds !== "Any" && h.beds < Number(q.beds)) return false;
      if (q.min && h.price < Number(q.min)) return false;
      if (q.max && h.price > Number(q.max)) return false;
      return true;
    });
  }, [q]);

  const money = (n) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <section id="available" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-500/90">On the market</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Available Homes</h2>
        </header>

        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <select className="rounded-lg border border-gold-500/25 bg-black px-3 py-2 text-white"
                  value={q.city} onChange={(e)=>setQ({...q,city:e.target.value})}>
            {cities.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="rounded-lg border border-gold-500/25 bg-black px-3 py-2 text-white"
                  value={q.beds} onChange={(e)=>setQ({...q,beds:e.target.value})}>
            {["Any",2,3,4,5].map(b => <option key={b}>{b}</option>)}
          </select>
          <input placeholder="Min price" className="rounded-lg border border-gold-500/25 bg-black px-3 py-2 text-white"
                 value={q.min} onChange={(e)=>setQ({...q,min:e.target.value.replace(/\D/g,"")})}/>
          <input placeholder="Max price" className="rounded-lg border border-gold-500/25 bg-black px-3 py-2 text-white"
                 value={q.max} onChange={(e)=>setQ({...q,max:e.target.value.replace(/\D/g,"")})}/>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(h => (
            <article key={h.id} className="overflow-hidden rounded-xl border border-gold-500/20 bg-[#0b0b0b] shadow-sm transition hover:shadow-[0_0_0_1px_rgba(212,175,55,0.35)]">
              <button onClick={()=>setOpen(h)} className="block w-full text-left" aria-label={`View ${h.title}`}>
                <div className="aspect-[4/3] w-full bg-cover bg-center" style={{backgroundImage:`url(${h.img})`}}/>
                <div className="p-4">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-lg font-semibold text-white">{money(h.price)}</h3>
                    <span className="text-sm text-gold-500">{h.city}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{h.title} • {h.sqft.toLocaleString()} sq ft</p>
                  {h.badge && <span className="mt-2 inline-block text-xs rounded-full border border-gold-500/30 px-2 py-1 text-gold-500">{h.badge}</span>}
                </div>
              </button>
            </article>
          ))}
        </div>
      </div>

      {open && <HomeDrawer home={open} onClose={()=>setOpen(null)} />}
    </section>
  );
}

function HomeDrawer({ home, onClose }) {
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");

  async function askMore() {
    try {
      setSending(true); setErr("");
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
          message: `Interested in ${home.title} – ${home.address}`,
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

  const calUrl = `${CAL}?home=${encodeURIComponent(home.address)}`;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70" onClick={onClose}/>
      <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-auto bg-[#0b0b0b] border-l border-gold-500/20">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h4 className="text-xl font-semibold text-white">{home.title}</h4>
            <button onClick={onClose} className="rounded-lg border border-gold-500/25 px-3 py-1 text-gold-500 hover:bg-gold-500 hover:text-black">Close</button>
          </div>
          <p className="mt-1 text-sm text-slate-300">{home.address}</p>
          <div className="mt-4 aspect-[4/3] w-full rounded-lg bg-cover bg-center" style={{backgroundImage:`url(${home.img})`}}/>
          <ul className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            <li>Price: <span className="text-gold-500">${home.price.toLocaleString()}</span></li>
            <li>Beds: {home.beds}</li>
            <li>Baths: {home.baths}</li>
            <li>Sq Ft: {home.sqft.toLocaleString()}</li>
          </ul>

          {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
          {ok && <p className="mt-3 text-sm text-gold-500">Thanks! I’ll text you details on this home.</p>}

          <div className="mt-5 flex flex-wrap gap-3">
            <a href={calUrl} target="_blank" rel="noreferrer"
               className="inline-flex items-center rounded-lg bg-gold-500 px-5 py-3 font-semibold text-black hover:bg-gold-600">
              Schedule a Tour
            </a>
            <button onClick={askMore} disabled={sending}
                    className="inline-flex items-center rounded-lg border border-gold-500/40 px-5 py-3 font-semibold text-gold-500 hover:bg-gold-500 hover:text-black disabled:opacity-60">
              {sending ? "Sending…" : "Ask About This Home"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

