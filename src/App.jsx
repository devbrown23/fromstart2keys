
import { useMemo, useState } from 'react'

const CAL = import.meta.env.VITE_CALENDAR_URL || '#'

function Section({ id, title, subtitle, children }) {
  return (
    <section id={id} className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(title || subtitle) && (
          <header className="mb-10">
            {subtitle && (
              <p className="text-sm font-semibold uppercase tracking-wider text-sky-600">
                {subtitle}
              </p>
            )}
            {title && (
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
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
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" className="text-lg font-bold tracking-tight">FS2K</a>
          <nav className="hidden gap-6 text-sm sm:flex">
            <a href="#homes" className="hover:text-slate-900">Featured Homes</a>
            <a href="#areas" className="hover:text-slate-900">Areas</a>
            <a href="#process" className="hover:text-slate-900">Process</a>
            <a href="#reviews" className="hover:text-slate-900">Reviews</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </nav>
          <a
            href={CAL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:shadow-sm"
          >
            Book Free Consult
          </a>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:grid-cols-2 sm:px-6 lg:px-8 lg:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-sky-600">FromStart2Keys</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Start → Keys: your smoothest path to homeownership.
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Local expertise. Winning strategy. Seamless experience—from pre-approval to keys in hand.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={CAL}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-slate-900"
              >
                Get Started
              </a>
              <a href="#lead" className="rounded-lg border border-slate-300 px-5 py-3 font-medium hover:shadow-sm">
                Ask a Question
              </a>
            </div>
            <ul className="mt-6 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <li>✓ Fast pre-approval guidance</li>
              <li>✓ Hyper-local tour strategy</li>
              <li>✓ Smart offers that win</li>
              <li>✓ Negotiation that protects you</li>
            </ul>
          </div>
          <div className="relative">
            {/* replace with your photo or branded graphic */}
            <div className="aspect-[4/3] w-full rounded-2xl bg-[url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1400&auto=format&fit=crop')] bg-cover bg-center shadow-lg" />
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
            <div key={h} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold">{h}</h3>
              <p className="mt-2 text-sm text-slate-600">{p}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Featured Homes (static placeholders — replace with your IDX or CMS later) */}
      <Section id="homes" subtitle="On the Market" title="Featured Homes">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { price: '$624,900', beds: 4, baths: 3, area: 'Tacoma', img: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1400&auto=format&fit=crop' },
            { price: '$459,000', beds: 3, baths: 2, area: 'Lacey', img: 'https://images.unsplash.com/photo-1597047084897-51e81819a499?q=80&w=1400&auto=format&fit=crop' },
            { price: '$739,500', beds: 5, baths: 3, area: 'DuPont', img: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=1400&auto=format&fit=crop' },
          ].map((h) => (
            <article key={h.img} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="aspect-[4/3] w-full bg-cover bg-center" style={{ backgroundImage: `url(${h.img})` }} />
              <div className="p-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-semibold">{h.price}</h3>
                  <span className="text-sm text-slate-500">{h.area}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {h.beds} beds • {h.baths} baths
                </p>
                <a href={CAL} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-sky-700 hover:underline">
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
            <div key={a} className="rounded-lg border border-slate-200 bg-white p-4 text-center">
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
            <li key={t} className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="absolute -left-3 -top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="text-base font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-slate-600">{d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <a href={CAL} target="_blank" rel="noreferrer" className="rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-slate-900">
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
            <blockquote key={q} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-slate-700">{q}</p>
              <footer className="mt-4 text-sm text-slate-500">{a}</footer>
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
            <details key={q} className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer list-none font-medium">{q}</summary>
              <p className="mt-2 text-sm text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* Lead Form */}
      <Section id="lead" subtitle="Have a question?" title="Message us">
        <div className="grid gap-8 lg:grid-cols-2">
          <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">First name</label>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-600 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last name</label>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-600 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-600 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Preferred area</label>
                <input
                  name="area"
                  value={form.area}
                  onChange={onChange}
                  placeholder="e.g., Tacoma, Lacey, DuPont…"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Timeline</label>
                <select
                  name="timeline"
                  value={form.timeline}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-600 focus:outline-none"
                >
                  <option>0-3 months</option>
                  <option>3-6 months</option>
                  <option>6-12 months</option>
                  <option>12+ months</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Message</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={onChange}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-600 focus:outline-none"
                  placeholder="Tell us what you’re looking for…"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="smsOptIn"
                  checked={form.smsOptIn}
                  onChange={onChange}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-600"
                />
                OK to text me about my inquiry
              </label>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            {submitted && <p className="mt-4 text-sm text-green-600">Thanks! We’ll be in touch shortly.</p>}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                disabled={submitting}
                className="inline-flex items-center rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-slate-900 disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Send message'}
              </button>
              <a
                href={CAL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-lg border border-slate-300 px-5 py-3 font-medium hover:shadow-sm"
              >
                Book a free consult instead
              </a>
            </div>
          </form>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">What you’ll get on our first call</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>• A clear budget & timeline</li>
              <li>• Neighborhoods that fit your lifestyle</li>
              <li>• Tour plan + offer strategy</li>
              <li>• Lender introductions if needed</li>
            </ul>
            <a
              href={CAL}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-slate-900"
            >
              Book your call
            </a>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} FromStart2Keys. All rights reserved.
            </p>
            <div className="text-sm text-slate-500">
              Built for buyers in Pierce, Thurston & JBLM.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
