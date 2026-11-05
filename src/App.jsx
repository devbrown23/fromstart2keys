import { useEffect, useState } from "react";
import InstagramCarousel from "./components/InstagramCarousel";
import AvailableHomes from "./components/AvailableHomes.jsx";
import CMASection from "./components/CMASection";

const CAL = import.meta.env.VITE_CALENDAR_URL || "#";
const FUB_API_URL = import.meta.env.VITE_FUB_API_URL || "/api/lead";

const HOMEBUYER_CLASSES = [
  {
    id: "2026-11-03",
    classNumber: "", // state class # (add when Kelli sends it)
    title: "November Homebuyer Class",
    dates: "November 3 & 4, 2026",
    days: "Tuesday & Wednesday",
    time: "5:30 PM – 8:00 PM",
    format: "Virtual Class via Zoom",
    register: "https://www.eventbrite.com/e/2003331953802?aff=oddtdtcreator",
  },
  {
    id: "2026-11-10",
    classNumber: "",
    title: "November Homebuyer Class",
    dates: "November 10 & 11, 2026",
    days: "Tuesday & Wednesday",
    time: "5:30 PM – 8:00 PM",
    format: "Virtual Class via Zoom",
    register: "https://www.eventbrite.com/e/2003332084192?aff=oddtdtcreator",
  },
];

// Next class = first one whose second night hasn't ended yet (classes end 8 PM Pacific on night 2)
const classOver = (c) => Date.now() > new Date(`${c.id}T20:00:00-08:00`).getTime() + 864e5;
const UPCOMING = HOMEBUYER_CLASSES.filter((c) => !classOver(c));
const NEXT_CLASS = UPCOMING[0] || HOMEBUYER_CLASSES[HOMEBUYER_CLASSES.length - 1];

// Temporary compatibility while we upgrade the class section
const HOMEBUYER_CLASS = NEXT_CLASS;

// Each tab is its own page (hash routes, so old #links keep working)
const PAGES = [
  { key: "home", name: "Home", href: "#" },
  { key: "search", name: "Search Homes", href: "/search" },
  { key: "available", name: "Available Homes", href: "#available" },
  { key: "buy", name: "Buy", href: "#buy" },
  { key: "sell", name: "Sell / Home Value", href: "#sell" },
  { key: "class", name: "Homebuyer Class", href: "#class" },
  { key: "areas", name: "Areas", href: "#areas" },
  { key: "reviews", name: "Reviews", href: "#reviews" },
  { key: "agents", name: "Agent Tools", href: "#agents" },
  { key: "contact", name: "Contact", href: "#contact" },
];
const TOP_LINKS = ["search", "buy", "sell", "class", "reviews"];
const SECTION_PAGE = {
  top: "home", value: "home", instagram: "home",
  available: "available", areas: "areas", reviews: "reviews",
  process: "buy", "buyer-game-plan": "buy", cma: "sell",
  "homebuyer-class": "class", "agent-tools": "agents", "call-closer": "agents",
  faq: "contact", lead: "contact", guide: "class",
};
const PAGE_KEYS = PAGES.map((p) => p.key);
function pageFromHash() {
  const h = decodeURIComponent(window.location.hash.slice(1));
  if (PAGE_KEYS.includes(h)) return h;
  return SECTION_PAGE[h] || "home";
}
function usePage() {
  const [page, setPage] = useState(pageFromHash);
  useEffect(() => {
    const on = () => {
      const next = pageFromHash();
      setPage(next);
      const h = window.location.hash.slice(1);
      // jump to a specific section if the link pointed at one, else top of the page
      setTimeout(() => {
        const el = h && !PAGE_KEYS.includes(h) ? document.getElementById(h) : null;
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        else window.scrollTo({ top: 0 });
      }, 30);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return page;
}

const navLinks = [
  { name: "Search Homes", href: "/search" },
  { name: "Available Homes", href: "#available" },
  { name: "Areas", href: "#areas" },
  { name: "Process", href: "#process" },
  { name: "Reviews", href: "#reviews" },
  { name: "Sellers", href: "#cma" },
  { name: "Buyer Game Plan", href: "#buyer-game-plan" },
  { name: "Homebuyer Class", href: "#homebuyer-class" },
  { name: "Agent Tools", href: "#agent-tools" },
  { name: "FAQ", href: "#faq" },
];


// Real Google reviews (copied word for word from Devin Brown Realtor on Google Maps). Newest first.
const GOOGLE_PROFILE = "https://www.google.com/maps/place/?q=place_id:ChIJI5ggH7tSg24RD84w_uvprHY";
const GOOGLE_REVIEW_COUNT = 14;
const GOOGLE_REVIEWS = [
  { name: "Sareaya Wade", when: "October 2026", tag: "First-time buyers",
    text: "Seriously. Devin is an amazing realtor that’s knowledgeable, patient, and exceptional at his work. It was my husbands and I first time buying a house and I’m grateful to say Devin took ALL of the burden off our shoulders. He’s constantly doing work behind the scenes. Very communicative and authentically wants the best for your family. We can’t thank Devin enough!!" },
  { name: "Courtney Chandler", when: "2025", tag: "Homebuyer",
    text: "Devin and his team went above and beyond to help me find my perfect home. Devin even stayed up until almost midnight, on the phone with me the night I received my offer packet to answer every single question I had, to make sure I understood everything, and to support me through the process. Deashawn was kind, informative, and responsive, as well. He met me at every single house I wanted to look at, and was even willing to meet at the same house multiple times when I wanted to bring another pair of eyes to look at the places. Their service was amazing and I will be recommending them to anyone who is interested in buying a house. Devin also helped me connect with a lender that did the covenant loan, and he made sure I got the very best deal. I’m so happy with my new house purchase, with the service I received from Devin and his team, and just the overall experience. During a really major life event like buying a house, you want calm, confident, responsive,  knowledgeable people in your corner, and his team is exactly that. 10/10 highly recommend Devin and his team!" },
  { name: "Steve Chae", when: "2025", tag: "Bought from overseas",
    text: "Devin was incredible throughout the entire process. From the time we made contact with him from Korea, he was always available for clarification or questions we had. He went out of his way to make sure we matched the timezones and communicated with information that was important. He was able to answer every question we had and also ensured we received the best offer! His patience and understanding was top tier and it was only better once we arrived back in the United States. Highly recommend everyone work with him and his team!" },
];

function ReviewCard({ r }) {
  const [open, setOpen] = useState(false);
  const long = r.text.length > 320;
  const shown = !long || open ? r.text : r.text.slice(0, 300).replace(/\s+\S*$/, "") + "…";
  return (
    <figure className="flex flex-col border border-white/15 bg-[#0b0b0b] p-7">
      <div className="flex items-center justify-between">
        <span className="text-lg tracking-[0.2em] text-gold-500">★★★★★</span>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Google</span>
      </div>
      <span className="font-display mt-4 text-5xl leading-none text-gold-500">“</span>
      <blockquote className="mt-1 text-[15px] leading-relaxed text-slate-200">{shown}</blockquote>
      {long && (
        <button onClick={() => setOpen((v) => !v)} className="mt-3 self-start text-sm font-semibold text-gold-500 hover:underline">
          {open ? "Show less" : "Read more"}
        </button>
      )}
      <figcaption className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
        <span className="font-display flex h-11 w-11 items-center justify-center rounded-full bg-gold-500/15 text-xl text-gold-500">{r.name[0]}</span>
        <span>
          <span className="block font-semibold text-white">{r.name}</span>
          <span className="block text-xs text-slate-400">{r.tag} · {r.when}</span>
        </span>
      </figcaption>
    </figure>
  );
}


const GUIDE_URL = "/guides/FS2K-Homebuyer-Guide-2026.pdf";
function GuideDownload() {
  const [f, setF] = useState({ name: "", email: "", phone: "", sms: false });
  const [state, setState] = useState("idle");
  const [err, setErr] = useState("");
  useEffect(() => { try { if (localStorage.getItem("fs2k-guide")) setState("done"); } catch {} }, []);
  async function go(e) {
    e.preventDefault(); setErr("");
    if (!f.name.trim() || (!f.email.trim() && !f.phone.trim())) { setErr("Add your name and an email or phone."); return; }
    setState("sending");
    const [firstName, ...rest] = f.name.trim().split(/\s+/);
    try {
      const r = await fetch(FUB_API_URL, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName: rest.join(" "), email: f.email.trim(), phone: f.phone.trim(), smsOptIn: f.sms,
          pageUrl: window.location.href, message: "Downloaded the FS2K Homebuyer Guide (2026).", extraTags: ["Homebuyer Guide"] }) });
      if (!r.ok) throw new Error();
      try { localStorage.setItem("fs2k-guide", "1"); } catch {}
      setState("done"); window.open(GUIDE_URL, "_blank", "noopener");
    } catch { setState("idle"); setErr("Couldn't send. Please try again, or call or text (803) 658-1509."); }
  }
  const input = "w-full rounded-lg border border-white/10 bg-black px-3 py-3 text-white placeholder:text-slate-500 focus:border-gold-500 focus:outline-none";
  return (
    <div id="guide" className="mt-8 grid gap-8 border border-gold-500/30 bg-[#0b0b0b] p-6 sm:p-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-500">Free download</p>
        <h3 className="font-display mt-3 text-4xl text-white">The Homebuyer <span className="italic text-gold-500">Guide</span></h3>
        <p className="mt-2 text-sm text-slate-400">Washington · 2026 edition · 13 pages · PDF</p>
        <ul className="mt-5 space-y-2 text-sm text-slate-300">
          <li>✓ The 9 steps from start to keys, with a timeline</li>
          <li>✓ What you really need: FHA, VA, conventional, USDA</li>
          <li>✓ Washington down payment assistance programs explained</li>
          <li>✓ Pre-approval checklist + what not to do before closing</li>
          <li>✓ Fixed vs. adjustable rates, lender vs. broker</li>
          <li>✓ Offer-to-closing timeline and wire fraud warning</li>
          <li>✓ Home Search Worksheet to plan your must-haves</li>
        </ul>
      </div>
      {state === "done" ? (
        <div className="text-center lg:text-left">
          <p className="font-display text-3xl text-white">Your guide is <span className="italic text-gold-500">ready</span>.</p>
          <p className="mt-2 text-sm text-slate-400">If it didn't open, tap below. See you in class!</p>
          <a href={GUIDE_URL} target="_blank" rel="noreferrer" className="mt-5 inline-block bg-gold-500 px-6 py-3 font-semibold text-black hover:bg-gold-600">Download the guide</a>
        </div>
      ) : (
        <form onSubmit={go} className="grid gap-3">
          <input className={input} placeholder="Your name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={input} placeholder="Email" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <input className={input} placeholder="Phone" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-400"><input type="checkbox" className="mt-0.5" checked={f.sms} onChange={(e) => setF({ ...f, sms: e.target.checked })} /> OK to text me about homebuying tips and class dates. Reply STOP anytime.</label>
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button disabled={state === "sending"} className="bg-gold-500 px-6 py-4 font-semibold text-black hover:bg-gold-600 disabled:opacity-60">{state === "sending" ? "Sending…" : "Get the free guide"}</button>
          <p className="text-[11px] text-slate-500">Free. No spam. I'll send class dates and homebuying tips.</p>
        </form>
      )}
    </div>
  );
}

function Section({ id, title, subtitle, children }) {
  return (
    <section id={id} className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(title || subtitle) && (
          <header className="mb-10">
            {subtitle && (
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-500/90">
                {subtitle}
              </p>
            )}
            {title && (
              <h2 className="font-display mt-3 text-4xl text-white sm:text-5xl">
                {title}
              </h2>
            )}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

function SEOJsonLD() {
  const json = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: "Devin Brown — FromStart2Keys",
    areaServed: ["Tacoma WA", "Pierce County", "Thurston County", "JBLM"],
    sameAs: [
      "https://instagram.com/devinmyagent",
      "https://linktr.ee/devbrownrealtor",
    ],
    url: "https://www.fromstart2keys.com",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

export default function App() {
  const page = usePage();
  const show = (k) => page === k;
  useEffect(() => {
    const p = PAGES.find((x) => x.key === page);
    document.title = page === "home" ? "Devin Brown · From Start 2 Keys · Tacoma & Seattle Real Estate" : `${p ? p.name : ""} · From Start 2 Keys`;
  }, [page]);

  const [menuOpen, setMenuOpen] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    area: "",
    timeline: "0-3 months",
    message: "",
    smsOptIn: true,
    company: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if ((form.company ?? "").trim() !== "") {
      setSubmitting(false);
      return;
    }

    try {
      const params = new URLSearchParams(window.location.search);

      const payload = {
        ...form,
        source: "FromStart2Keys.com",
        pageUrl: window.location.href,
        submittedAt: new Date().toISOString(),
        utm: {
          source: params.get("utm_source") || "",
          medium: params.get("utm_medium") || "",
          campaign: params.get("utm_campaign") || "",
          content: params.get("utm_content") || "",
          term: params.get("utm_term") || "",
        },
      };

      const res = await fetch(FUB_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Network error");

      setSubmitted(true);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        area: "",
        timeline: "0-3 months",
        message: "",
        smsOptIn: true,
        company: "",
      });
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again or book a call.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-slate-200 selection:bg-gold-500/30">
      <SEOJsonLD />

      <header className={`${page === "home" ? "absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent" : "sticky top-0 border-b border-white/10 bg-black/90 backdrop-blur"} z-30`}>
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a href="#" className="flex flex-col leading-none">
            <span className="font-display text-2xl tracking-[0.04em] text-[#f4f1ea] sm:text-[28px]">From Start <span className="italic text-gold-500">2</span> Keys</span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300 sm:tracking-[0.28em]">Devin Brown<span className="hidden sm:inline"> · Unique Lifestyle Realty</span></span>
          </a>
          <nav className="hidden items-center gap-7 text-[13px] font-semibold uppercase tracking-[0.14em] lg:flex">
            {TOP_LINKS.map((k) => {
              const l = PAGES.find((x) => x.key === k);
              return (
                <a key={k} href={l.href} className={`pb-1 transition hover:text-gold-500 ${page === k ? "border-b border-gold-500 text-gold-500" : "text-white/90"}`}>
                  {l.name.replace(" / Home Value", "")}
                </a>
              );
            })}
          </nav>
          <div className="flex items-center gap-4">
            <a href="tel:+18036581509" className="hidden text-sm font-semibold tracking-wide text-white/90 hover:text-gold-500 sm:inline">(803) 658-1509</a>
            <button aria-label="Open menu" className="p-2" onClick={() => setMenuOpen(true)}>
              <span className="mb-1.5 block h-0.5 w-7 bg-white" />
              <span className="mb-1.5 block h-0.5 w-7 bg-white" />
              <span className="block h-0.5 w-7 bg-white" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/95 backdrop-blur" role="dialog" aria-modal="true">
          <div className="mx-auto flex max-w-7xl justify-end px-4 py-6 sm:px-6 lg:px-8">
            <button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="text-4xl leading-none text-white hover:text-gold-500">×</button>
          </div>
          <nav className="mx-auto grid max-w-3xl gap-1 px-6 pb-16 text-center">
            {PAGES.map((l) => (
              <a key={l.key} href={l.href} onClick={() => setMenuOpen(false)}
                className={`font-display py-2 text-3xl transition hover:text-gold-500 sm:text-4xl ${page === l.key ? "text-gold-500" : "text-white"}`}>
                {l.name}
              </a>
            ))}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href={CAL} target="_blank" rel="noreferrer" className="border border-gold-500 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-gold-500 hover:bg-gold-500 hover:text-black">Book Free Consult</a>
              <a href="tel:+18036581509" className="border border-white/60 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white hover:bg-white hover:text-black">Call (803) 658-1509</a>
            </div>
          </nav>
        </div>
      )}

{show("home") && (<>
      <section id="top" className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-black">
        <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline preload="auto" poster="/hero-poster.jpg">
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/70" />
        <div className="relative w-full max-w-3xl px-6 pb-16 pt-24 text-center sm:pb-0 sm:pt-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/85 sm:text-sm">Tacoma &amp; Seattle Homebuying</p>
          <h1 className="font-display mt-4 text-4xl leading-tight text-[#f4f1ea] sm:text-6xl">Your <span className="italic text-gold-500">keys</span> start here.</h1>
          <svg className="mx-auto mt-5 block h-4 w-[150px] text-gold-500" viewBox="0 0 150 16" aria-hidden="true"><path d="M0 8h42M108 8h42" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.5"/><circle cx="56" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M62 8h36M88 8v5M94 8v4" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
          <div className="mx-auto mt-8 flex max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
            <a href="/search" className="border-2 border-white bg-black/20 px-6 py-3.5 text-xs font-bold uppercase tracking-[0.22em] text-white backdrop-blur-sm transition hover:bg-white hover:text-black sm:px-8 sm:py-4 sm:text-sm">Search Homes</a>
            <a href="#sell" className="border-2 border-white bg-black/20 px-6 py-3.5 text-xs font-bold uppercase tracking-[0.22em] text-white backdrop-blur-sm transition hover:bg-white hover:text-black sm:px-8 sm:py-4 sm:text-sm">Find Home Value</a>
          </div>
        </div>
        <a href="#class" className="absolute inset-x-0 bottom-28 mx-auto w-fit px-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85 hover:text-gold-500 sm:bottom-8 sm:text-xs">
          Free homebuyer class · {NEXT_CLASS.dates} →
        </a>
      </section>


      <Section id="value" subtitle="Why FS2K" title="A smarter way to buy">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Clear Plan", "We map your budget, timeline, and next steps."],
            ["Loan Strategy", "Understand your approval options before you shop."],
            ["Tour Smart", "See homes that actually fit your lifestyle and numbers."],
            ["Win Protected", "Strong offers with smart terms and negotiation."],
          ].map(([h, p]) => (
            <div key={h} className="rounded-xl border border-gold-500/20 bg-[#0b0b0b] p-6">
              <h3 className="font-semibold text-gold-500">{h}</h3>
              <p className="mt-2 text-sm text-slate-300">{p}</p>
            </div>
          ))}
        </div>
      </Section>
</>)}

{show("class") && (
     <Section
  id="homebuyer-class"
  subtitle="Free Washington State Homebuyer Education"
  title="Upcoming Homebuyer Classes"
>
  <div className="grid gap-6 lg:grid-cols-2">
    {(UPCOMING.length ? UPCOMING : HOMEBUYER_CLASSES).map((homebuyerClass) => (
      <div
        key={homebuyerClass.id}
        className="rounded-xl border border-gold-500/25 bg-[#0b0b0b] p-6"
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-gold-500">
          {homebuyerClass.classNumber ? `Class #${homebuyerClass.classNumber}` : "Free · State-certified"}
        </p>

        <h3 className="mt-3 text-2xl font-bold text-white">
          {homebuyerClass.title}
        </h3>

        <p className="mt-4 text-slate-300">
          Join this free virtual class to learn the buying process, loan options,
          down payment assistance, offer strategy, closing costs, and how to move
          from start to keys with a real plan.
        </p>

        <div className="mt-6 space-y-2 text-sm text-slate-300">
          <p>📅 {homebuyerClass.days}</p>
          <p>🗓 {homebuyerClass.dates}</p>
          <p>🕠 {homebuyerClass.time}</p>
          <p>📍 {homebuyerClass.format}</p>
        </div>

        <a
          href={homebuyerClass.register || CAL}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block rounded-lg bg-gold-500 px-5 py-3 font-semibold text-black hover:bg-gold-600"
        >
          Reserve Your Seat
        </a>
        <p className="mt-3 text-xs text-slate-400">Register on Eventbrite and your Zoom link is sent to you.</p>
        <a href="/class" className="mt-2 inline-block text-sm font-semibold text-gold-500 hover:underline">Full agenda &amp; details →</a>
      </div>
    ))}
  </div>

  <div className="mt-8 rounded-xl border border-gold-500/25 bg-[#0b0b0b] p-6">
    <h3 className="text-lg font-semibold text-white">
      What you'll learn
    </h3>

    <ul className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
      <li>✓ Down payment assistance programs</li>
      <li>✓ FHA, VA, Conventional, and first-time buyer options</li>
      <li>✓ Credit and approval preparation</li>
      <li>✓ How to shop with confidence</li>
      <li>✓ Offer strategy and negotiation basics</li>
      <li>✓ Closing costs, inspections, timelines, and next steps</li>
    </ul>
  </div>
  <GuideDownload />
</Section>
)}

{show("home") && (
      <Section id="instagram" title="Follow @devinmyagent" subtitle="Tap any image to connect on Instagram">
        <InstagramCarousel
          images={["/images/instagram/fs2k.jpg", "/images/instagram/1.png", "/images/instagram/2.png", "/images/instagram/3.png"]}
          instagramUrl="https://instagram.com/devinmyagent"
          intervalMs={3500}
        />
      </Section>
)}

      {show("home") && (
        <section className="bg-black py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-gold-500">Explore</p>
            <h2 className="font-display mt-3 text-center text-4xl text-white sm:text-5xl">How can I help?</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["/search", "Search Homes", "Every active home, live from the MLS"],
                ["#available", "Available Homes", "Homes I'm sharing right now"],
                ["#buy", "Buy", "Your step-by-step game plan to keys"],
                ["#sell", "Sell / Home Value", "Find out what your home is worth"],
                ["#class", "Homebuyer Class", `Free class + free guide · ${NEXT_CLASS.dates}`],
                ["#reviews", "Reviews", "What clients say"],
              ].map(([href, t, d]) => (
                <a key={t} href={href} className="group border border-white/15 bg-[#0b0b0b] p-8 transition hover:border-gold-500">
                  <h3 className="font-display text-3xl text-white group-hover:text-gold-500">{t}</h3>
                  <p className="mt-2 text-sm text-slate-400">{d}</p>
                  <span className="mt-6 inline-block text-xs font-bold uppercase tracking-[0.22em] text-gold-500">View →</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {show("available") && <AvailableHomes />}

{show("areas") && (
      <Section id="areas" subtitle="Neighborhoods" title="Where we help buyers win">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {["Tacoma", "University Place", "Lacey", "DuPont", "Lakewood", "Olympia", "Puyallup", "Steilacoom"].map((a) => (
            <div key={a} className="rounded-lg border border-gold-500/25 bg-[#0b0b0b] p-4 text-center">
              {a}
            </div>
          ))}
        </div>
      </Section>
)}

      {show("buy") && (
        <div className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 border border-gold-500/30 bg-[#0b0b0b] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-500">Free download</p>
              <p className="font-display mt-2 text-3xl text-white">The Homebuyer <span className="italic text-gold-500">Guide</span></p>
              <p className="mt-1 text-sm text-slate-400">13 pages: steps, loans, Washington down payment help, checklists and a home search worksheet.</p>
            </div>
            <a href="#guide" className="shrink-0 bg-gold-500 px-6 py-4 text-center font-semibold text-black hover:bg-gold-600">Get the free guide</a>
          </div>
        </div>
      )}
{show("buy") && (
      <Section id="process" subtitle="How it works" title="From start to keys">
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Meet", "Plan your budget, timeline, and goals."],
            ["Approve", "Connect with the right lending strategy."],
            ["Tour", "Find homes that fit your life and numbers."],
            ["Offer", "Write strong, protected offers with confidence."],
          ].map(([t, d], i) => (
            <li key={t} className="relative rounded-xl border border-gold-500/20 bg-[#0b0b0b] p-6">
              <span className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-gold-500 text-sm font-bold text-black">
                {i + 1}
              </span>
              <h3 className="font-semibold text-white">{t}</h3>
              <p className="mt-2 text-sm text-slate-300">{d}</p>
            </li>
          ))}
        </ol>
      </Section>
)}

{show("reviews") && (
      <Section id="reviews" subtitle="Client Experience" title="Real guidance. Real strategy. Real keys.">
        <div className="mb-8 flex flex-col items-start gap-4 border border-white/15 bg-[#0b0b0b] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="font-display text-6xl leading-none text-white">5.0</span>
            <div>
              <div className="text-xl tracking-[0.2em] text-gold-500">★★★★★</div>
              <p className="mt-1 text-sm text-slate-300">{GOOGLE_REVIEW_COUNT} reviews on Google</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={GOOGLE_PROFILE} target="_blank" rel="noreferrer" className="border border-white/60 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-white hover:text-black">Read all on Google</a>
            <a href="/review.html" className="border border-gold-500 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-gold-500 hover:bg-gold-500 hover:text-black">Leave a review</a>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {GOOGLE_REVIEWS.map((r) => <ReviewCard key={r.name} r={r} />)}
        </div>
      </Section>
)}

      {show("sell") && <CMASection />}

{show("buy") && (
      <Section
  id="buyer-game-plan"
  subtitle="FREE PERSONALIZED BUYER PLAN"
  title="What Homes Fit Your Monthly Payment?"
>
  <div className="grid gap-8 lg:grid-cols-2">
    <div className="rounded-xl border border-gold-500/25 bg-[#0b0b0b] p-6">
      <h3 className="text-2xl font-bold text-white">
        Build Your Free Buyer Game Plan
      </h3>

      <p className="mt-4 text-slate-300">
        Buying a home shouldn't start with guessing a purchase price.
        Let's start with the monthly payment you're comfortable with and
        build your homebuying plan from there.
      </p>

      <div className="mt-6 space-y-3 text-sm text-slate-300">
        <p>✓ See what price range may fit your monthly budget</p>
        <p>✓ Explore VA, FHA, Conventional and first-time buyer options</p>
        <p>✓ Learn about possible down payment assistance</p>
        <p>✓ Identify seller credits and rate-buydown opportunities</p>
        <p>✓ Create a clear path from start to keys</p>
      </div>
    </div>

    <div className="rounded-xl border border-gold-500/25 bg-[#0b0b0b] p-6">
  <p className="text-sm font-semibold uppercase tracking-widest text-gold-500">
    YOUR GAME PLAN
  </p>

  <h3 className="mt-3 text-xl font-bold text-white">
    Start with your comfortable monthly payment.
  </h3>

  <p className="mt-3 text-sm text-slate-300">
    Answer a few quick questions and we'll help you understand your
    next best step.
  </p>

  <a
    href="#lead"
    className="mt-6 inline-block rounded-lg bg-gold-500 px-5 py-3 font-semibold text-black hover:bg-gold-600"
  >
    Build My Free Buyer Game Plan
  </a>

  <p className="mt-3 text-xs text-slate-400">
    No pressure. We'll help you understand your options and build a plan around your goals.
  </p>
</div>
</div>
  </Section>
)}

{show("agents") && (
      <Section id="agent-tools" subtitle="For Agents" title="FS2K Studio: listing marketing in a minute">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="text-slate-300">
              Pick a template, drop in your listing photos, and download a ready-to-post carousel with the caption
              already written. Built by an agent, for agents.
            </p>
            <ul className="mt-6 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
              {[
                "Just Listed, Open House, Just Sold and more",
                "Deal of the Week template",
                "Post, Story, Square and Landscape sizes",
                "Tap any slide to edit the text",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-gold-500">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="/studio"
                className="rounded-lg bg-gold-500 px-6 py-3 font-semibold text-black hover:opacity-90"
              >
                Try FS2K Studio free
              </a>
              <span className="text-xs text-slate-400">Free while in beta. No sign-up needed.</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { t: "Just Listed", img: "/images/studio-just-listed.jpg", pos: "62% 50%", z: 1 },
              { t: "Open House", img: "/images/studio-hero.jpg", pos: "45% 45%", z: 1 },
              { t: "Deal of the Week", img: "/images/studio-deal-week.jpg", pos: "55% 50%", z: 1 },
            ].map(({ t, img, pos, z }, i) => (
              <a
                key={t}
                href="/studio"
                className={`group relative flex aspect-[4/5] items-end overflow-hidden rounded-xl border border-gold-500/30 bg-black p-3 shadow-lg shadow-black/40 ${i === 1 ? "translate-y-6" : ""}`}
              >
                <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                  <img
                    src={img}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                    style={{ objectPosition: pos, transform: `scale(${z})`, transformOrigin: pos }}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="relative">
                  <span className="block h-px w-6 bg-gold-500" />
                  <span className="mt-2 block font-serif text-lg italic leading-tight text-white">{t}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </Section>
)}

{show("agents") && (
      <Section id="call-closer" subtitle="FS2K Studio · Free for agents" title="Call Closer: level up on the phone">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="text-slate-300">
              A free training game for real estate agents. Practice cold calls and negotiations, take short classes,
              earn XP, and climb from E-Rank to S on the agent leaderboard.
            </p>
            <ul className="mt-6 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
              {[
                "Cold Call Arena with endless practice dials",
                "10 negotiation calls, from lowballs to boss fights",
                "12 classes on cold calling, objections and offers",
                "Techniques inspired by Chris Voss and Tom Ferry",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-gold-500">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a href="/negotiate" className="rounded-lg bg-gold-500 px-6 py-3 font-semibold text-black hover:opacity-90">
                Play Call Closer free
              </a>
              <span className="text-xs text-slate-400">Free account. Your progress saves on any device.</span>
            </div>
          </div>
          <a href="/negotiate" className="block rounded-xl border border-gold-500/25 bg-gradient-to-b from-[#0d1d38] to-black p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Status</div>
            <div className="mt-4 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-md border-2 border-sky-400 text-3xl font-extrabold text-sky-400">E</div>
              <div>
                <div className="text-lg font-bold text-white">New agent</div>
                <div className="text-sm text-gold-500">Rank up to S</div>
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded bg-slate-800"><div className="h-full w-1/3 bg-sky-400" /></div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
              {["Dials", "Appts", "Classes"].map((t) => (
                <div key={t} className="rounded border border-slate-700 py-3"><div className="text-lg font-bold text-white">0</div>{t}</div>
              ))}
            </div>
          </a>
        </div>
      </Section>
)}

{show("contact") && (
      <Section id="faq" subtitle="FAQ" title="Quick answers">
        <div className="space-y-4">
          {[
            ["How fast can we start?", "Same day. Book a free call and we’ll map out your next steps."],
            ["Do I need a pre-approval first?", "No. If you need one, we can help you connect with a trusted lender."],
            ["Is the homebuyer class online?", `Yes. The next class is virtual on ${HOMEBUYER_CLASS.dates} from ${HOMEBUYER_CLASS.time}.`],
          ].map(([q, a]) => (
            <details key={q} className="rounded-lg border border-gold-500/20 bg-[#0b0b0b] p-4">
              <summary className="cursor-pointer font-semibold text-white">{q}</summary>
              <p className="mt-2 text-sm text-slate-300">{a}</p>
            </details>
          ))}
        </div>
      </Section>
)}

{show("contact") && (
      <Section id="lead" subtitle="Have a question?" title="Message Devin">
        <div className="grid gap-8 lg:grid-cols-2">
          <form onSubmit={onSubmit} className="rounded-xl border border-gold-500/25 bg-[#0b0b0b] p-6">
            <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" value={form.company} onChange={onChange} />

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["firstName", "First name", "text", true],
                ["lastName", "Last name", "text", true],
                ["email", "Email", "email", true],
                ["phone", "Phone", "text", false],
                ["area", "Preferred area", "text", false],
              ].map(([name, label, type, required]) => (
                <div key={name}>
                  <label className="text-sm font-medium text-slate-300">{label}</label>
                  <input
                    name={name}
                    type={type}
                    required={required}
                    value={form[name]}
                    onChange={onChange}
                    className="mt-1 w-full rounded-lg border border-gold-500/25 bg-black px-3 py-2 text-white focus:border-gold-500 focus:outline-none"
                  />
                </div>
              ))}

              <div>
                <label className="text-sm font-medium text-slate-300">Timeline</label>
                <select name="timeline" value={form.timeline} onChange={onChange} className="mt-1 w-full rounded-lg border border-gold-500/25 bg-black px-3 py-2 text-white">
                  <option>0-3 months</option>
                  <option>3-6 months</option>
                  <option>6-12 months</option>
                  <option>12+ months</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-300">Message</label>
                <textarea
                  name="message"
                  rows={4}
                  value={form.message}
                  onChange={onChange}
                  placeholder="Tell me what you’re looking for..."
                  className="mt-1 w-full rounded-lg border border-gold-500/25 bg-black px-3 py-2 text-white placeholder:text-slate-500"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="smsOptIn" checked={form.smsOptIn} onChange={onChange} />
                OK to text me about my inquiry
              </label>
            </div>

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            {submitted && <p className="mt-4 text-sm text-gold-500">Thanks! I’ll be in touch shortly.</p>}

            <button disabled={submitting} className="mt-6 rounded-lg bg-gold-500 px-5 py-3 font-semibold text-black hover:bg-gold-600 disabled:opacity-60">
              {submitting ? "Sending..." : "Send message"}
            </button>
          </form>

          <div className="rounded-xl border border-gold-500/25 bg-[#0b0b0b] p-6">
            <h3 className="text-lg font-semibold text-white">Ready to own instead of rent?</h3>
            <p className="mt-3 text-sm text-slate-300">
              Book a free strategy call and let’s walk through your buying power,
              timeline, and next best move.
            </p>
            <a href={CAL} target="_blank" rel="noreferrer" className="mt-6 inline-block rounded-lg bg-gold-500 px-5 py-3 font-semibold text-black hover:bg-gold-600">
              Book Free Consult
            </a>
          </div>
        </div>
      </Section>
)}

      {page !== "home" && page !== "contact" && (
        <section className="border-t border-white/10 bg-[#0b0b0b] py-14 text-center">
          <h2 className="font-display text-3xl text-white sm:text-4xl">Ready to talk about your move?</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href={CAL} target="_blank" rel="noreferrer" className="border border-gold-500 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-gold-500 hover:bg-gold-500 hover:text-black">Book Free Consult</a>
            <a href="#contact" className="border border-white/60 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white hover:bg-white hover:text-black">Message Devin</a>
          </div>
        </section>
      )}

      <footer className="border-t border-gold-500/20 py-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-4 text-sm text-slate-400 sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} FromStart2Keys. All rights reserved.</p>
          <p>Devin Brown, Real Estate Broker · Unique Lifestyle Realty · (803) 658-1509 · Equal Housing Opportunity</p>
        </div>
      </footer>
    </div>
  );
}
