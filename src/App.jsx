import { useEffect, useState } from "react";
import InstagramCarousel from "./components/InstagramCarousel";
import AvailableHomes from "./components/AvailableHomes.jsx";
import CMASection from "./components/CMASection";

const CAL = import.meta.env.VITE_CALENDAR_URL || "#";
const FUB_API_URL = import.meta.env.VITE_FUB_API_URL || "/api/lead";

const HOMEBUYER_CLASS = {
  classNumber: "73523",
  title: "July Homebuyer Class",
  dates: "July 28 & 29, 2026",
  days: "Tuesday & Wednesday",
  time: "5:30 PM – 8:00 PM",
  format: "Virtual Class via Zoom",
};

const navLinks = [
  { name: "Available Homes", href: "#available" },
  { name: "Featured Homes", href: "#homes" },
  { name: "Areas", href: "#areas" },
  { name: "Process", href: "#process" },
  { name: "Reviews", href: "#reviews" },
  { name: "Sellers", href: "#cma" },
  { name: "Homebuyer Class", href: "#homebuyer-class" },
  { name: "FAQ", href: "#faq" },
];

function Section({ id, title, subtitle, children }) {
  return (
    <section id={id} className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(title || subtitle) && (
          <header className="mb-10">
            {subtitle && (
              <p className="text-xs font-semibold uppercase tracking-widest text-gold-500/90">
                {subtitle}
              </p>
            )}
            {title && (
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
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
  useEffect(() => {
    document.title = "FromStart2Keys — From Start to Keys";
  }, []);

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

      <header className="sticky top-0 z-30 border-b border-gold-500/20 bg-black/75 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" className="text-lg font-extrabold tracking-wide text-gold-500">
            FS2K
          </a>

          <nav className="hidden gap-6 text-sm sm:flex">
            {navLinks.map((l) => (
              <a key={l.name} href={l.href} className="text-slate-300 hover:text-gold-500">
                {l.name}
              </a>
            ))}
          </nav>

          <a
            href={CAL}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-xl border border-gold-500/40 bg-black px-4 py-2 text-sm font-semibold text-gold-500 transition hover:bg-gold-500 hover:text-black sm:inline-flex"
          >
            Book Free Consult
          </a>

          <button className="p-2 sm:hidden" onClick={() => setMenuOpen((v) => !v)}>
            <span className="mb-1 block h-0.5 w-6 bg-white" />
            <span className="mb-1 block h-0.5 w-6 bg-white" />
            <span className="block h-0.5 w-6 bg-white" />
          </button>
        </div>

        {menuOpen && (
          <div className="px-4 pb-4 sm:hidden">
            <div className="rounded-xl bg-neutral-900 p-2">
              {navLinks.map((l) => (
                <a
                  key={l.name}
                  href={l.href}
                  className="block rounded-lg px-3 py-3 text-white hover:bg-neutral-800"
                  onClick={() => setMenuOpen(false)}
                >
                  {l.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </header>

      <section id="top" className="relative isolate overflow-hidden bg-black">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/hero-poster.jpg"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/20" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-32">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">
              FromStart2Keys
            </p>

            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              From start to <span className="text-gold-500">keys</span>, your homebuying plan starts here.
            </h1>

            <p className="mt-5 text-lg text-slate-300">
              Helping Washington buyers move with confidence through pre-approval, home tours,
              offer strategy, negotiation, and closing day.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a href={CAL} target="_blank" rel="noreferrer" className="rounded-lg bg-gold-500 px-5 py-3 font-semibold text-black hover:bg-gold-600">
                Book Free Consult
              </a>
              <a href="#homebuyer-class" className="rounded-lg border border-gold-500/40 px-5 py-3 font-semibold text-gold-500 hover:bg-gold-500 hover:text-black">
                Join Homebuyer Class
              </a>
            </div>

            <ul className="mt-6 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <li>✓ First-time buyer guidance</li>
              <li>✓ Down payment assistance help</li>
              <li>✓ VA, FHA & Conventional strategy</li>
              <li>✓ Negotiation that protects you</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="holiday-banner">
        <span className="badge">Free Class</span>
        <div>
          🏡 {HOMEBUYER_CLASS.title} · {HOMEBUYER_CLASS.dates} · {HOMEBUYER_CLASS.time} (Zoom)
          <br />
          Build your 2026 homebuying plan with confidence.
        </div>
      </div>

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

      <Section id="homebuyer-class" subtitle="Free Washington State Homebuyer Education" title="Upcoming Homebuyer Class">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-xl border border-gold-500/25 bg-[#0b0b0b] p-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-gold-500">
              Class #{HOMEBUYER_CLASS.classNumber}
            </p>

            <h3 className="mt-3 text-2xl font-bold text-white">{HOMEBUYER_CLASS.title}</h3>

            <p className="mt-4 text-slate-300">
              Join this free virtual class to learn the buying process, loan options,
              down payment assistance, offer strategy, closing costs, and how to move
              from start to keys with a real plan.
            </p>

            <div className="mt-6 space-y-2 text-sm text-slate-300">
              <p>📅 {HOMEBUYER_CLASS.days}</p>
              <p>🗓 {HOMEBUYER_CLASS.dates}</p>
              <p>🕠 {HOMEBUYER_CLASS.time}</p>
              <p>📍 {HOMEBUYER_CLASS.format}</p>
            </div>

            <a href={CAL} target="_blank" rel="noreferrer" className="mt-6 inline-block rounded-lg bg-gold-500 px-5 py-3 font-semibold text-black hover:bg-gold-600">
              Reserve Your Seat
            </a>
          </div>

          <div className="rounded-xl border border-gold-500/25 bg-[#0b0b0b] p-6">
            <h3 className="text-lg font-semibold text-white">What you’ll learn</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>✓ Down payment assistance programs</li>
              <li>✓ FHA, VA, Conventional, and first-time buyer options</li>
              <li>✓ Credit and approval preparation</li>
              <li>✓ How to shop with confidence</li>
              <li>✓ Offer strategy and negotiation basics</li>
              <li>✓ Closing costs, inspections, timelines, and next steps</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section id="instagram" title="Follow @devinmyagent" subtitle="Tap any image to connect on Instagram">
        <InstagramCarousel
          images={["/images/instagram/1.png", "/images/instagram/2.png", "/images/instagram/3.png"]}
          instagramUrl="https://instagram.com/devinmyagent"
          intervalMs={3500}
        />
      </Section>

      <AvailableHomes />

      <Section id="homes" subtitle="On the Market" title="Featured Homes">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              price: "$624,900",
              beds: 4,
              baths: 3,
              area: "Tacoma",
              img: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1400&auto=format&fit=crop",
            },
            {
              price: "$459,000",
              beds: 3,
              baths: 2,
              area: "Lacey",
              img: "https://images.unsplash.com/photo-1597047084897-51e81819a499?q=80&w=1400&auto=format&fit=crop",
            },
            {
              price: "$739,500",
              beds: 5,
              baths: 3,
              area: "DuPont",
              img: "https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=1400&auto=format&fit=crop",
            },
          ].map((h) => (
            <article key={h.img} className="overflow-hidden rounded-xl border border-gold-500/20 bg-[#0b0b0b]">
              <div className="aspect-[4/3] bg-cover bg-center" style={{ backgroundImage: `url(${h.img})` }} />
              <div className="p-4">
                <div className="flex justify-between">
                  <h3 className="text-lg font-semibold text-white">{h.price}</h3>
                  <span className="text-sm text-gold-500">{h.area}</span>
                </div>
                <p className="mt-1 text-sm text-slate-300">{h.beds} beds • {h.baths} baths</p>
                <a href={CAL} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-gold-500 hover:underline">
                  Schedule a tour →
                </a>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section id="areas" subtitle="Neighborhoods" title="Where we help buyers win">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {["Tacoma", "University Place", "Lacey", "DuPont", "Lakewood", "Olympia", "Puyallup", "Steilacoom"].map((a) => (
            <div key={a} className="rounded-lg border border-gold-500/25 bg-[#0b0b0b] p-4 text-center">
              {a}
            </div>
          ))}
        </div>
      </Section>

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
      </Section>

      <CMASection />

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

      <footer className="border-t border-gold-500/20 py-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-4 text-sm text-slate-400 sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} FromStart2Keys. All rights reserved.</p>
          <p>Built for Washington buyers in Pierce, Thurston, Tacoma & JBLM.</p>
        </div>
      </footer>
    </div>
  );
}
