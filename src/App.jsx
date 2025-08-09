import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

export default function App() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'Buyer',
    timeline: '0-3 months',
    area: 'Pierce / Thurston / JBLM',
    message: '',
    smsOptIn: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const CALENDAR_URL = import.meta.env.VITE_CALENDAR_URL || '#'

  useMemo(() => { document.title = 'From Start 2 Keys | Get Pre-Approved & House Hunt' }, [])

  const steps = [
    { title: 'Start', desc: 'Free 15‑min consult to map your goals & budget.' },
    { title: 'Finance', desc: 'Fast pre‑approval with our trusted lenders (or yours).' },
    { title: 'Tour', desc: 'Curated homes that fit your needs, schedule‑friendly showings.' },
    { title: 'Offer', desc: 'Winning strategies, comps, and terms that protect you.' },
    { title: 'Inspect', desc: 'Vetted inspectors + repair negotiations handled for you.' },
    { title: 'Keys', desc: 'Close with confidence. Welcome home!' },
  ]

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
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
        term: params.get('utm_term') || ''
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
    } catch (e) {
      console.error(e)
      setError("Something went wrong. Please text 803-627-3680 or email devbrownrealtor@gmail.com and we'll get you booked ASAP.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className=\"min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-800\">
      <header className=\"sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-slate-200/60\">
        <div className=\"mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between\">
          <div className=\"flex items-center gap-3\">
            <div className=\"h-9 w-9 rounded-2xl bg-black text-white grid place-items-center font-bold\">S2K</div>
            <div className=\"font-semibold\">FromStart2Keys<span className=\"hidden sm:inline\">.com</span></div>
          </div>
          <a href=\"#get-started\" className=\"inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:shadow-sm\">Get Started</a>
        </div>
      </header>

      <section className=\"relative overflow-hidden\">
        <div className=\"mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 grid lg:grid-cols-2 gap-10 items-center\">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className=\"text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight\">
              From <span className=\"bg-yellow-200 px-2 rounded\">Start</span> to <span className=\"bg-emerald-200 px-2 rounded\">Keys</span>— your smoothest path to homeownership.
            </h1>
            <p className=\"mt-5 text-lg text-slate-600\">Get pre‑approved, tour homes, write strong offers, and close with confidence in Washington State—guided by Devin Brown, your trusted local Realtor.</p>
            <div className=\"mt-6 flex flex-col sm:flex-row gap-3\">
              <a href=\"#get-started\" className=\"inline-flex items-center justify-center rounded-2xl px-5 py-3 font-semibold border border-slate-900 bg-slate-900 text-white hover:opacity-95\">Book Free Consult</a>
              <a href={CALENDAR_URL} target=\"_blank\" rel=\"noreferrer\" className=\"inline-flex items-center justify-center rounded-2xl px-5 py-3 font-semibold border border-slate-300 hover:bg-white\">Book on Calendar</a>
            </div>
            <div className=\"mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-500\">
              <div className=\"rounded-xl border border-slate-200 p-3\">VA Friendly</div>
              <div className=\"rounded-xl border border-slate-200 p-3\">First‑Time Buyers</div>
              <div className=\"rounded-xl border border-slate-200 p-3\">Down‑Payment Help</div>
              <div className=\"rounded-xl border border-slate-200 p-3\">PCS / Relocation</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }}>
            <div className=\"relative aspect-video w-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100\">
              <div className=\"absolute inset-0 grid place-items-center text-center p-6\">
                <div>
                  <div className=\"text-sm uppercase tracking-wide text-slate-500\">Intro Video</div>
                  <div className=\"mt-2 text-xl font-semibold\">Welcome to Start → Keys</div>
                  <p className=\"mt-2 text-slate-600\">Drop your YouTube or Loom link in this block when ready.</p>
                </div>
              </div>
            </div>
            <div className=\"mt-4 text-center text-sm text-slate-500\">Serving Tacoma · Puyallup · JBLM · Olympia · Vancouver WA</div>
          </motion.div>
        </div>
      </section>

      <section id=\"how-it-works\" className=\"py-16 sm:py-24 bg-white\">
        <div className=\"mx-auto max-w-7xl px-4 sm:px-6 lg:px-8\">
          <h2 className=\"text-3xl sm:text-4xl font-bold\">How it works</h2>
          <p className=\"mt-2 text-slate-600\">Six clear steps. Zero guesswork.</p>
          <div className=\"mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6\">
            {steps.map((s, i) => (
              <motion.div key={s.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }} className=\"rounded-2xl border border-slate-200 p-5 shadow-sm bg-gradient-to-b from-white to-slate-50\">
                <div className=\"flex items-center justify-between\">
                  <div className=\"text-sm font-semibold text-slate-500\">Step {i + 1}</div>
                  <div className=\"text-xs rounded-full px-2 py-1 bg-slate-900 text-white\">{s.title}</div>
                </div>
                <p className=\"mt-3 text-slate-700\">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className=\"py-16 sm:py-24\">
        <div className=\"mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-3 gap-8 items-start\">
          <div className=\"lg:col-span-1\">
            <h2 className=\"text-3xl sm:text-4xl font-bold\">Why work with Devin</h2>
            <p className=\"mt-3 text-slate-600\">Tactical empathy. Clear strategy. Local expertise across Pierce, Thurston, Clark & beyond.</p>
          </div>
          <div className=\"lg:col-span-2 grid sm:grid-cols-2 gap-6\">
            {[
              { h: 'Certified First‑Time Buyer Classes', p: 'Get clarity on loans, programs, and the exact path to keys.' },
              { h: 'Military‑savvy guidance', p: 'Experienced with VA, PCS, and relocation timelines.' },
              { h: 'Negotiation you can feel', p: 'Chris Voss‑inspired approach to protect your interests.' },
              { h: 'Team & partners', p: 'Trusted lenders, inspectors, and contractors to keep you moving.' },
            ].map((v, i) => (
              <motion.div key={v.h} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }} className=\"rounded-2xl border border-slate-200 p-5 shadow-sm\">
                <div className=\"text-lg font-semibold\">{v.h}</div>
                <p className=\"mt-1 text-slate-600\">{v.p}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className=\"py-16 sm:py-24 bg-white\">
        <div className=\"mx-auto max-w-7xl px-4 sm:px-6 lg:px-8\">
          <h2 className=\"text-3xl sm:text-4xl font-bold\">What clients say</h2>
          <div className=\"mt-8 grid md:grid-cols-3 gap-6\">
            {[1,2,3].map((i) => (
              <div key={i} className=\"rounded-2xl border border-slate-200 p-6 shadow-sm\">
                <p className=\"text-slate-700\">“Devin made everything simple. We went from confused to confident—then to keys.”</p>
                <div className=\"mt-4 text-sm text-slate-500\">— Happy Buyer, Tacoma</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id=\"get-started\" className=\"py-16 sm:py-24\">
        <div className=\"mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 items-start\">
          <div>
            <h2 className=\"text-3xl sm:text-4xl font-bold\">Tell us about you</h2>
            <p className=\"mt-2 text-slate-600\">Answer a few quick questions and we’ll reach out to lock your free consult.</p>
            <ul className=\"mt-6 space-y-3 text-slate-600\">
              <li>• Typical consult within 24 hours</li>
              <li>• Zoom or in‑person (Tacoma/Puyallup/JBLM/Vancouver)</li>
              <li>• No pressure—just a clear plan from start to keys</li>
            </ul>
          </div>

          <div className=\"rounded-3xl border border-slate-200 shadow-sm bg-white p-6\">
            {submitted ? (
              <div className=\"text-center py-8\">
                <div className=\"text-2xl font-semibold\">You’re in! 🎉</div>
                <p className=\"mt-2 text-slate-600\">Thanks for reaching out. We’ll contact you shortly. Want to skip the line?</p>
                <a href={CALENDAR_URL} target=\"_blank\" rel=\"noreferrer\" className=\"mt-4 inline-flex items-center justify-center rounded-2xl px-5 py-3 font-semibold border border-slate-900 bg-slate-900 text-white\">Book on our calendar</a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className=\"grid grid-cols-1 gap-4\">
                <div className=\"grid sm:grid-cols-2 gap-4\">
                  <div>
                    <label className=\"text-sm text-slate-600\">First name</label>
                    <input required name=\"firstName\" value={form.firstName} onChange={handleChange} className=\"mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400\" />
                  </div>
                  <div>
                    <label className=\"text-sm text-slate-600\">Last name</label>
                    <input required name=\"lastName\" value={form.lastName} onChange={handleChange} className=\"mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400\" />
                  </div>
                </div>
                <div className=\"grid sm:grid-cols-2 gap-4\">
                  <div>
                    <label className=\"text-sm text-slate-600\">Email</label>
                    <input required type=\"email\" name=\"email\" value={form.email} onChange={handleChange} className=\"mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400\" />
                  </div>
                  <div>
                    <label className=\"text-sm text-slate-600\">Phone</label>
                    <input required name=\"phone\" value={form.phone} onChange={handleChange} className=\"mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400\" />
                  </div>
                </div>
                <div className=\"grid sm:grid-cols-2 gap-4\">
                  <div>
                    <label className=\"text-sm text-slate-600\">I am a…</label>
                    <select name=\"role\" value={form.role} onChange={handleChange} className=\"mt-1 w-full rounded-xl border border-slate-300 px-3 py-2\">
                      <option>Buyer</option>
                      <option>Seller</option>
                      <option>Both</option>
                    </select>
                  </div>
                  <div>
                    <label className=\"text-sm text-slate-600\">Timeline</label>
                    <select name=\"timeline\" value={form.timeline} onChange={handleChange} className=\"mt-1 w-full rounded-xl border border-slate-300 px-3 py-2\">
                      <option>0-3 months</option>
                      <option>3-6 months</option>
                      <option>6-12 months</option>
                      <option>12+ months</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className=\"text-sm text-slate-600\">Preferred area</label>
                  <input name=\"area\" value={form.area} onChange={handleChange} className=\"mt-1 w-full rounded-xl border border-slate-300 px-3 py-2\" />
                </div>
                <div>
                  <label className=\"text-sm text-slate-600\">Anything else we should know?</label>
                  <textarea rows={4} name=\"message\" value={form.message} onChange={handleChange} className=\"mt-1 w-full rounded-xl border border-slate-300 px-3 py-2\" placeholder=\"VA loan? First home? Specific neighborhoods?\" />
                </div>
                <div className=\"flex items-start gap-3\">
                  <input type=\"checkbox\" name=\"smsOptIn\" checked={form.smsOptIn} onChange={handleChange} className=\"mt-1\" />
                  <p className=\"text-sm text-slate-600\">I agree to be contacted by phone, text, and email. Message/data rates may apply. Opt out anytime.</p>
                </div>
                {error && <div className=\"text-sm text-red-600\">{error}</div>}
                <button disabled={submitting} className=\"mt-2 inline-flex items-center justify-center rounded-2xl px-5 py-3 font-semibold border border-slate-900 bg-slate-900 text-white disabled:opacity-60\">
                  {submitting ? 'Submitting…' : 'Get my free consult'}
                </button>
                <div className=\"text-xs text-slate-500 text-center\">Secure • We never share your info</div>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className=\"py-10 border-t bg-slate-50\">
        <div className=\"mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500\">
          <div>
            © {new Date().getFullYear()} FromStart2Keys · Devin Brown · <a href=\"mailto:devbrownrealtor@gmail.com\" className=\"underline\">devbrownrealtor@gmail.com</a> · <a href=\"https://linktr.ee/devbrownrealtor\" target=\"_blank\" rel=\"noreferrer\" className=\"underline\">Linktree</a>
          </div>
          <div className=\"flex gap-4\">
            <a href=\"#\" className=\"underline\">Privacy</a>
            <a href=\"#\" className=\"underline\">Terms</a>
            <a href=\"#\" className=\"underline\">Fair Housing</a>
          </div>
        </div>
      </section>
    </div>
  )
}
