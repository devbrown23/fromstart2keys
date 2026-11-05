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
  faq: "contact", lead: "contact",
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
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative px-6 text-center">
          <p className="text-sm font-semibold tracking-[0.18em] text-white/90 sm:text-base">Your Tacoma &amp; Seattle Homebuying Guide</p>
          <h1 className="font-display mt-4 text-6xl tracking-[0.04em] text-[#f4f1ea] sm:text-7xl lg:text-8xl">Devin <span className="italic text-gold-500">Brown</span></h1>
          <svg className="mx-auto mt-5 block h-4 w-[150px] text-gold-500" viewBox="0 0 150 16" aria-hidden="true"><path d="M0 8h42M108 8h42" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.5"/><circle cx="56" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M62 8h36M88 8v5M94 8v4" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
          <p className="font-display mt-3 text-xl tracking-[0.12em] text-[#f4f1ea] sm:text-2xl">From Start <span className="italic text-gold-500">2</span> Keys</p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a href="/search" className="border-2 border-white px-8 py-4 text-sm font-bold uppercase tracking-[0.22em] text-white transition hover:bg-white hover:text-black">Search Homes</a>
            <a href="#sell" className="border-2 border-white px-8 py-4 text-sm font-bold uppercase tracking-[0.22em] text-white transition hover:bg-white hover:text-black">Find Home Value</a>
          </div>
        </div>
        <a href="#class" className="absolute inset-x-0 bottom-6 mx-auto w-fit px-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-white/80 hover:text-gold-500">
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
                ["#class", "Homebuyer Class", `Free, state-certified · ${NEXT_CLASS.dates}`],
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
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            ["“Truly seamless from day one.”", "— First-time buyer"],
            ["“We felt prepared before we started shopping.”", "— Washington buyer"],
            ["“Great communication and strategy.”", "— Homebuyer client"],
          ].map(([q, a]) => (
            <blockquote key={q} className="rounded-xl border border-gold-500/20 bg-[#0b0b0b] p-6">
              <p className="italic text-slate-200">{q}</p>
              <footer className="mt-4 text-sm text-gold-500">{a}</footer>
            </blockquote>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-4 rounded-xl border border-gold-500/20 bg-[#0b0b0b] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-2xl tracking-widest text-gold-500">★★★★★</div>
            <p className="mt-1 text-white">
              <span className="font-bold">5.0</span> rating on Google
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="https://g.page/r/CQ_OMP7r6ax2EBM" target="_blank" rel="noreferrer" className="rounded-lg border border-gold-500/40 px-5 py-3 font-semibold text-gold-500 hover:bg-gold-500 hover:text-black">
              Read Google Reviews
            </a>
            <a href="/review.html" className="rounded-lg bg-gold-500 px-5 py-3 font-semibold text-black hover:bg-gold-600">
              Worked with me? Leave a review
            </a>
          </div>
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
