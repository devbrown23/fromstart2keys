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
  export default function App() {
return (
  <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-800">
    <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="font-semibold">FS2K</div>
        <a
          href={import.meta.env.VITE_CALENDAR_URL}
          className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:shadow-sm"
          target="_blank"
          rel="noreferrer"
        >
          Get Started
        </a>
      </div>
    </header>

    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold tracking-tight">FromStart2Keys</h1>
      <p className="mt-4 text-lg">
        Start → Keys: your smoothest path to homeownership.
      </p>
      <div className="mt-8">
        <a
          href={import.meta.env.VITE_CALENDAR_URL}
          className="rounded-md bg-black text-white px-5 py-3 inline-flex items-center"
          target="_blank"
          rel="noreferrer"
        >
          Book Free Consult
        </a>
      </div>
    </main>
  </div>
);
  }
  
