import { useMemo, useState } from 'react'

const CAL = import.meta.env.VITE_CALENDAR_URL || '#'

// Simple section wrapper
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
  )
}

export default function App() {
  useMemo(() => {
    document.title = 'FromStart2Keys — Your Smoothest Path to Homeownership'
  }, [])

  // ----- Lead form state -----
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    area: '',
    timeline: '0-3 months',
    message: '',
    smsOptIn: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const params = new URLSearchParams(window.location.search)
      const utm = {
        source: params.get('utm_source') || '',
        medium: params.get('utm_medium') || '',
        campaign: params.get('utm_campaign') || '',
        content: params.get('utm_content') || '',
        term: params.get('utm_term') || '',
      }
      const payload = {
        ...form,
        source: 'FromStart2Keys.com',
        pageUrl: window.location.href,
        submittedAt: new Date().toISOString(),
        utm,
      }
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Network error')
      setSubmitted(true)
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        area: '',
        timeline: '0-3 months',
        message: '',
        smsOptIn: true,
      })
    } catch (err) {
      console.error(err)
      setError('Something went wrong—please try again or use the Book button.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-slate-200 selection:bg-gold-500/30">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gold-500/20 bg-black/70 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" className="text-lg font-extrabold tracking-wide text-gold-500">
            FS2K
          </a>
          <nav className="hidden gap-6 text-sm sm:flex">
            <a href="#homes" className="text-slate-300 hover:text-gold-500">Featured Homes</a>
            <a href="#areas" className="text-slate-300 hover:text-gold-500">Areas</a>
            <a href="#process" className="text-slate-300 hover:text-gold-500">Process</a>
            <a href="#reviews" className="text-slate-300 hover:text-gold-500">Reviews</a>
            <a href="#faq" className="text-slate-300 hover:text-gold-500">FAQ</a>
          </nav>
          <a
            href={CAL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-xl border border-gold-500/40 bg-black px-4 py-2 text-sm font-semibold text-gold-500 hover:bg-gold-500 hover:text-black transition"
          >
            Book Free Consult
          </a>
        </div>
      </header>

      {/* Hero - VIDEO BACKGROUND */}
      <section id="top" className="relative isolate overflow-hidden bg-black">
        {/* Video layer */}
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

        {/* No-JS fallback */}
        <noscript>
          <img
  src="/hero-poster.jpg"
  alt=""
  className="absolute inset-0 h-full w-full object-cover"
/>

        </noscript>

        {/* Readability gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />

        {/* Content */}
        <div className="relative">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:px-8 lg:py-28 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gold-500/90">
                FromStart2Keys
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                Start <span className="text-gold-500">→ Keys</span>: your smoothest path to
                homeownership.
              </h1>
              <p className="mt-4 text-lg text-slate-300">
                Local expertise. Winning strategy. Seamless experience—from pre-approval to keys in hand.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={CAL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-gold-500 px-5 py-3 font-semibold text-black hover:bg-gold-600 transition"
                >
                  Get Started
                </a>
                <a
                  href="#lead"
                  className="rounded-lg border border-gold-500/40 px-5 py-3 font-semibold text-gold-500 hover:bg-gold-500 hover:text-black transition"
                >
                  Ask a Question
                </a>
              </div>
              <ul className="mt-6 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                <li>✓ Fast pre-approval guidance</li>
                <li>✓ Hyper-local tour strategy</li>
                <li>✓ Smart offers that win</li>
                <li>✓ Negotiation that protects you</li>
              </ul>
            </div>
            {/* spacer to let more video show on right */}
            <div className="h-[28rem] lg:h-[32rem]" />
          </div>
        </div>
      </section>

      {/* Value Props */}
      <Section id="value" subtitle="Why FS2K" title="A better way to buy">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Local Pros', 'Tacoma • JBLM • Thurston experts on speed-dial.'],
            ['Clear Plan', 'We map your budget + neighborhoods day one.'],
            ['Tour Smart', 'Curated homes that match your lifestyle.'],
            ['Win the Offer', 'Data-driven pricing + terms that protect you.'],
          ].map(([h, p]) => (
            <div
              key={h}
              className="rounded-xl border border-gold-500/20 bg-[#0b0b0b] p-6 shadow-sm transition hover:shadow-[0_0_0_1px_rgba(212,175,55,0.35)]"
            >
              <h3 className="text-base font-semibold text-gold-500">{h}</h3>
              <p className="mt-2 text-sm text-slate-300">{p}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Featured Homes */}
      <Section id="homes" subtitle="On the Market" title="Featured Homes">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { price: '$624,900', beds: 4, baths: 3, area: 'Tacoma', img: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1400&auto=format&fit=crop' },
            { price: '$459,000', beds: 3, baths: 2, area: 'Lacey', img: 'https://images.unsplash.com/photo-1597047084897-51e81819a499?q=80&w=1400&auto=format&fit=crop' },
            { price: '$739,500', beds: 5, baths: 3, area: 'DuPont', img: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=1400&auto=format&fit=crop' },
          ].map((h) => (
            <article
              key={h.img}
              className="overflow-hidden rounded-xl border border-gold-500/20 bg-[#0b0b0b] shadow-sm transition hover:shadow-[0_0_0_1px_rgba(212,175,55,0.35)]"
            >
              <div
                className="aspect-[4/3] w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${h.img})` }}
              />
              <div className="p-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-semibold text-white">{h.price}</h3>
                  <span className="text-sm text-gold-500">{h.area}</span>
                </div>
                <p className="mt-1 text-sm text-slate-300">
                  {h.beds} beds • {h.baths} baths
                </p>
                <a
                  href={CAL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm font-semibold text-gold-500 hover:underline"
                >
                  Schedule a tour →
                </a>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* Areas */}
      <Section id="areas" subtitle="Neighborhoods" title="Where we help buyers win">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {['Tacoma', 'University Place', 'Lacey', 'DuPont', 'Lakewood', 'Olympia', 'Puyallup', 'Steilacoom'].map((a) => (
            <div
              key={a}
              className="rounded-lg border border-gold-500/25 bg-[#0b0b0b] p-4 text-center text-slate-200"
            >
              <p className="font-medium">{a}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Process */}
      <Section id="process" subtitle="How it works" title="From start to keys">
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Meet', '15-minute consult to plan budget + timeline.'],
            ['Approve', 'Get pre-approved with a trusted lender.'],
            ['Tour', 'Curated homes + efficient, fun showings.'],
            ['Offer', 'Smart pricing, strong terms, low stress.'],
          ].map(([t, d], i) => (
            <li
              key={t}
              className="relative rounded-xl border border-gold-500/20 bg-[#0b0b0b] p-6 shadow-sm"
            >
              <span className="absolute -left-3 -top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gold-500 text-sm font-bold text-black">
                {i + 1}
              </span>
              <h3 className="text-base font-semibold text-white">{t}</h3>
              <p className="mt-2 text-sm text-slate-300">{d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <a
            href={CAL}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-gold-500 px-5 py-3 font-semibold text-black hover:bg-gold-600 transition"
          >
            Book your free consult
          </a>
        </div>
      </Section>

      {/* Reviews */}
      <Section id="reviews" subtitle="What clients say" title="5-star experience, start to finish">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            ['“Truly seamless from day one.”', '— A. Martinez'],
            ['“We won the first offer we wrote.”', '— J. Kim'],
            ['“Great communication and strategy.”', '— S. Roberts'],
          ].map(([q, a]) => (
            <blockquote
              key={q}
              className="rounded-xl border border-gold-500/20 bg-[#0b0b0b] p-6 shadow-sm"
            >
              <p className="italic text-slate-200">{q}</p>
              <footer className="mt-4 text-sm text-gold-500">{a}</footer>
            </blockquote>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" subtitle="FAQ" title="Quick answers">
        <div className="space-y-4">
          {[
            ['How fast can we start?', 'Same day. Book a 15-minute call and we’ll map your steps.'],
            ['Do I need a pre-approval first?', 'No—if you don’t have one, we’ll connect you with trusted lenders.'],
            ['What does it cost to hire you?', 'Our fee is typically paid by the seller—ask us for details by price range.'],
          ].map(([q, a]) => (
            <details
              key={q}
              className="group rounded-lg border border-gold-500/20 bg-[#0b0b0b] p-4 shadow-sm"
            >
              <summary className="cursor-pointer list-none font-semibold text-white">
                {q}
              </summary>
              <p className="mt-2 text-sm text-slate-300">{a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* Lead Form */}
      <Section id="lead" subtitle="Have a question?" title="Message us">
        <div className="grid gap-8 lg:grid-cols-2">
          <form onSubmit={onSubmit} className="rounded-xl border border-gold-500/25 bg-[#0b0b0b] p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-300">First name</label>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-gold-500/25 bg-black px-3 py-2 text-white placeholder:text-slate-500 focus:border-gold-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300">Last name</label>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-gold-500/25 bg-black px-3 py-2 text-white placeholder:text-slate-500 focus:border-gold-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-gold-500/25 bg-black px-3 py-2 text-white placeholder:text-slate-500 focus:border-gold-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300">Phone</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-gold-500/25 bg-black px-3 py-2 text-white placeholder:text-slate-500 focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300">Preferred area</label>
                <input
                  name="area"
                  value={form.area}
                  onChange={onChange}
                  placeholder="e.g., Tacoma, Lacey, DuPont…"
                  className="mt-1 w-full rounded-lg border border-gold-500/25 bg-black px-3 py-2 text-white placeholder:text-slate-500 focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300">Timeline</label>
                <select
                  name="timeline"
                  value={form.timeline}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-gold-500/25 bg-black px-3 py-2 text-white focus:border-gold-500 focus:outline-none"
                >
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
                  value={form.message}
                  onChange={onChange}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-gold-500/25 bg-black px-3 py-2 text-white placeholder:text-slate-500 focus:border-gold-500 focus:outline-none"
                  placeholder="Tell us what you’re looking for…"
                />
              </div>
              <label className="mt-1 flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  name="smsOptIn"
                  checked={form.smsOptIn}
                  onChange={onChange}
                  className="rounded border-gold-500/25 text-gold-500 focus:ring-gold-500"
                />
                OK to text me about my inquiry
              </label>
            </div>

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            {submitted && <p className="mt-4 text-sm text-gold-500">Thanks! We’ll be in touch shortly.</p>}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                disabled={submitting}
                className="inline-flex items-center rounded-lg bg-gold-500 px-5 py-3 font-semibold text-black hover:bg-gold-600 disabled:opacity-60 transition"
              >
                {submitting ? 'Sending…' : 'Send message'}
              </button>
              <a
                href={CAL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-lg border border-gold-500/40 px-5 py-3 font-semibold text-gold-500 hover:bg-gold-500 hover:text-black transition"
              >
                Book a free consult instead
              </a>
            </div>
          </form>

          <div className="rounded-xl border border-gold-500/25 bg-[#0b0b0b] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-white">What you’ll get on our first call</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>• A clear budget & timeline</li>
              <li>• Neighborhoods that fit your lifestyle</li>
              <li>• Tour plan + offer strategy</li>
              <li>• Lender introductions if needed</li>
            </ul>
            <a
              href={CAL}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block rounded-lg bg-gold-500 px-5 py-3 font-semibold text-black hover:bg-gold-600 transition"
            >
              Book your call
            </a>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-gold-500/20 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} FromStart2Keys. All rights reserved.
            </p>
            <div className="text-sm text-slate-400">
              Built for buyers in Pierce, Thurston & JBLM.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
