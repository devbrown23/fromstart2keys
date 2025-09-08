import { useState } from "react";
const FUB_API_URL = import.meta.env.VITE_FUB_API_URL || "/api/lead";

export default function CMASection() {
  return (
    <section id="cma" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-500/90">Sellers</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            What’s my home worth? Get a CMA.
          </h2>
          <p className="mt-2 text-slate-300">
            Choose a quick estimate (fast) or a full CMA (most accurate). Both send to my phone & Follow Up Boss.
          </p>
        </header>
        <div className="grid gap-8 lg:grid-cols-2">
          <QuickCMA />
          <FullCMA />
        </div>
      </div>
    </section>
  );
}

function QuickCMA() {
  const [form, setForm] = useState({
    address:"", city:"", zip:"", beds:"", baths:"", email:"", phone:"",
    timeline:"0-3 months", notes:"", company:"",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e)=>setForm(f=>({...f,[e.target.name]:e.target.value}));

  async function submit(e){
    e.preventDefault(); setSubmitting(true); setError("");
    if ((form.company ?? "").trim() !== "") { setSubmitting(false); return; }
    try {
      const params = new URLSearchParams(window.location.search);
      const res = await fetch(FUB_API_URL,{
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          type:"CMA_QUICK", submittedAt:new Date().toISOString(),
          source:"FromStart2Keys.com",
          utm:{ source:params.get("utm_source")||"", medium:params.get("utm_medium")||"", campaign:params.get("utm_campaign")||"" },
          ...form,
        })
      });
      if(!res.ok) throw new Error();
      setSubmitted(true);
      setForm({address:"",city:"",zip:"",beds:"",baths:"",email:"",phone:"",timeline:"0-3 months",notes:"",company:""});
    } catch { setError("Couldn’t send. Please try again."); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="rounded-xl border border-gold-500/25 bg-[#0b0b0b] p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-white">Quick CMA (Fast Estimate)</h3>
      <form onSubmit={submit} className="mt-4 grid gap-4">
        <input type="text" name="company" className="hidden" onChange={onChange}/>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Street address"><input name="address" value={form.address} onChange={onChange} className="inp" required/></Field>
          <Field label="City"><input name="city" value={form.city} onChange={onChange} className="inp" required/></Field>
          <Field label="ZIP"><input name="zip" value={form.zip} onChange={onChange} className="inp" required/></Field>
          <Field label="Beds"><input name="beds" value={form.beds} onChange={onChange} className="inp"/></Field>
          <Field label="Baths"><input name="baths" value={form.baths} onChange={onChange} className="inp"/></Field>
          <Field label="Email"><input type="email" name="email" value={form.email} onChange={onChange} className="inp" required/></Field>
          <Field label="Phone"><input name="phone" value={form.phone} onChange={onChange} className="inp"/></Field>
          <Field label="Timeline">
            <select name="timeline" value={form.timeline} onChange={onChange} className="inp">
              <option>0-3 months</option><option>3-6 months</option><option>6-12 months</option><option>12+ months</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes (optional)"><textarea name="notes" value={form.notes} onChange={onChange} rows={3} className="inp"/></Field>
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {submitted && <p className="text-sm text-gold-500">Got it! I’ll send your quick estimate.</p>}
        <button disabled={submitting} className="btn-primary">{submitting ? "Sending…" : "Get Quick Estimate"}</button>
      </form>
    </div>
  );
}

function FullCMA() {
  const [form, setForm] = useState({
    address:"", city:"", zip:"", beds:"", baths:"", sqft:"", yearBuilt:"",
    condition:"Average", upgrades:"", email:"", phone:"", timeline:"0-3 months",
    photosUrl:"", notes:"", company:"",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e)=>setForm(f=>({...f,[e.target.name]:e.target.value}));

  async function submit(e){
    e.preventDefault(); setSubmitting(true); setError("");
    if ((form.company ?? "").trim() !== "") { setSubmitting(false); return; }
    try {
      const params = new URLSearchParams(window.location.search);
      const res = await fetch(FUB_API_URL,{
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          type:"CMA_FULL", submittedAt:new Date().toISOString(),
          source:"FromStart2Keys.com",
          utm:{ source:params.get("utm_source")||"", medium:params.get("utm_medium")||"", campaign:params.get("utm_campaign")||"" },
          ...form,
        })
      });
      if(!res.ok) throw new Error();
      setSubmitted(true);
      setForm({address:"",city:"",zip:"",beds:"",baths:"",sqft:"",yearBuilt:"",condition:"Average",upgrades:"",email:"",phone:"",timeline:"0-3 months",photosUrl:"",notes:"",company:""});
    } catch { setError("Couldn’t send. Please try again."); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="rounded-xl border border-gold-500/25 bg-[#0b0b0b] p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-white">Full CMA (Most Accurate)</h3>
      <form onSubmit={submit} className="mt-4 grid gap-4">
        <input type="text" name="company" className="hidden" onChange={onChange}/>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Street address"><input name="address" value={form.address} onChange={onChange} className="inp" required/></Field>
          <Field label="City"><input name="city" value={form.city} onChange={onChange} className="inp" required/></Field>
          <Field label="ZIP"><input name="zip" value={form.zip} onChange={onChange} className="inp" required/></Field>
          <Field label="Beds"><input name="beds" value={form.beds} onChange={onChange} className="inp"/></Field>
          <Field label="Baths"><input name="baths" value={form.baths} onChange={onChange} className="inp"/></Field>
          <Field label="Sq Ft"><input name="sqft" value={form.sqft} onChange={onChange} className="inp"/></Field>
          <Field label="Year built"><input name="yearBuilt" value={form.yearBuilt} onChange={onChange} className="inp"/></Field>
          <Field label="Condition">
            <select name="condition" value={form.condition} onChange={onChange} className="inp">
              <option>Excellent</option><option>Good</option><option>Average</option><option>Needs work</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Upgrades / recent work"><textarea name="upgrades" value={form.upgrades} onChange={onChange} rows={3} className="inp"/></Field>
          </div>
          <Field label="Email"><input type="email" name="email" value={form.email} onChange={onChange} className="inp" required/></Field>
          <Field label="Phone"><input name="phone" value={form.phone} onChange={onChange} className="inp"/></Field>
          <Field label="Timeline">
            <select name="timeline" value={form.timeline} onChange={onChange} className="inp">
              <option>0-3 months</option><option>3-6 months</option><option>6-12 months</option><option>12+ months</option>
            </select>
          </Field>
          <Field label="Photos/Drive link (optional)"><input name="photosUrl" value={form.photosUrl} onChange={onChange} placeholder="Google Drive / iCloud link" className="inp"/></Field>
          <div className="sm:col-span-2">
            <Field label="Anything else we should know?"><textarea name="notes" value={form.notes} onChange={onChange} rows={3} className="inp"/></Field>
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {submitted && <p className="text-sm text-gold-500">Thanks! I’ll build your full CMA and follow up.</p>}
        <button disabled={submitting} className="btn-primary">{submitting ? "Sending…" : "Request Full CMA"}</button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

