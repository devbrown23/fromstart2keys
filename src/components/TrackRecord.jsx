import { useState } from "react";
import { SALES, STATS, AREA_GROUPS, money, millions } from "../data/sales";

const GOOGLE_RATING = "5.0";

/* Homepage stats bar: the numbers people look for first */
export function StatsBar({ reviewCount }) {
  const items = [
    [millions(STATS.volume), "In homes sold"],
    [String(STATS.count), "Homes sold"],
    [String(STATS.cities), "Washington cities"],
    [`${GOOGLE_RATING}★`, `${reviewCount} Google reviews`],
  ];
  return (
    <section aria-label="Track record" className="border-y border-gold-500/25 bg-[#0b0b0b]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
        {items.map(([n, l]) => (
          <div key={l} className="text-center">
            <div className="font-display text-4xl text-white sm:text-5xl">{n}</div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-500">{l}</div>
          </div>
        ))}
      </div>
      <p className="pb-6 text-center text-[11px] text-slate-500">Closed sales per NWMLS, 2019–2026.</p>
    </section>
  );
}

/* About Devin */
export function AboutDevin() {
  return (
    <section id="about" className="py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-500/90">Meet Devin</p>
          <h2 className="font-display mt-3 text-4xl text-white sm:text-5xl">
            Veteran. REALTOR®. <span className="italic text-gold-500">Your guide</span> from start to keys.
          </h2>
          <p className="mt-6 text-slate-300">
            I'm Devin Brown, a military veteran and REALTOR® with Unique Lifestyle Realty. In 7 years I've helped 50+
            families with their moves, closing {STATS.count} sales worth {millions(STATS.volume)} across {STATS.cities} Washington
            cities, plus referrals to trusted agents across the country.
          </p>
          <p className="mt-4 text-slate-300">
            I also teach free, state-certified homebuyer classes, so first-time buyers walk in with a plan instead of guesses.
            Whether you're buying your first home, selling, or investing, you get straight answers and a strategy built around your numbers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#contact" className="bg-gold-500 px-6 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-black hover:bg-gold-600">Talk to Devin</a>
            <a href="#class" className="border border-white/60 px-6 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-white hover:text-black">Free homebuyer class</a>
          </div>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {[
            ["Military veteran", "Disciplined, direct, and on your side. VA loan savvy."],
            ["Seller results", `Sellers average ${STATS.sellerRatio}% of asking in about ${STATS.sellerDom} days.`],
            ["First-time buyer pro", "State-certified homebuyer education and down payment help know-how."],
            ["Pierce to Thurston", "Tacoma, Puyallup, Spanaway, Olympia, Lacey and more."],
          ].map(([h, p]) => (
            <li key={h} className="rounded-xl border border-gold-500/20 bg-[#0b0b0b] p-6">
              <h3 className="font-semibold text-gold-500">{h}</h3>
              <p className="mt-2 text-sm text-slate-300">{p}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SaleCard({ s }) {
  const g = AREA_GROUPS[s.g];
  return (
    <li className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#0b0b0b] p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-500">Sold</span>
        <span className="text-[11px] text-slate-500">{s.type}</span>
      </div>
      <div className="font-display mt-3 text-3xl text-white">{money(s.price)}</div>
      <div className="mt-1 text-sm text-slate-300">{s.city}{g && s.area !== s.city ? ` · ${s.area}` : ""}</div>
      <div className="mt-3 text-xs text-slate-500">
        {[s.beds && `${s.beds} bd`, s.baths && `${s.baths} ba`, s.sqft && `${s.sqft.toLocaleString()} sq ft`].filter(Boolean).join(" · ")}
      </div>
    </li>
  );
}

/* Past sales: a short teaser (limit) or the full list with area filters */
export function PastSales({ limit, id = "sold" }) {
  const [g, setG] = useState("all");
  const list = SALES.filter((s) => g === "all" || s.g === g);
  const shown = limit ? list.slice(0, limit) : list;
  const counts = Object.fromEntries(Object.keys(AREA_GROUPS).map((k) => [k, SALES.filter((s) => s.g === k).length]));
  return (
    <section id={id} className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-500/90">Track record</p>
            <h2 className="font-display mt-3 text-4xl text-white sm:text-5xl">{limit ? "Recent sales" : `${STATS.count} homes sold`}</h2>
            <p className="mt-2 text-sm text-slate-400">{millions(STATS.volume)} in closed sales as a listing or buyer's broker. Newest first.</p>
          </div>
          {limit && (
            <a href="#sold" className="w-fit border border-gold-500 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-gold-500 hover:bg-gold-500 hover:text-black">
              See all {STATS.count}
            </a>
          )}
        </header>
        {!limit && (
          <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter by area">
            {[["all", `All ${STATS.count}`], ...Object.entries(AREA_GROUPS).map(([k, a]) => [k, `${a.name} ${counts[k]}`])].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setG(k)}
                aria-pressed={g === k}
                className={`rounded-full border px-4 py-2 text-xs font-semibold ${g === k ? "border-gold-500 bg-gold-500 text-black" : "border-white/20 text-slate-300 hover:border-gold-500/60"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((s, i) => <SaleCard key={i} s={s} />)}
        </ul>
        <p className="mt-6 text-[11px] text-slate-500">
          Source: NWMLS closed sales where Devin Brown was the listing, co-listing, buyer or co-buyer broker, 2019–2026. Not every sale was listed by Devin.
        </p>
      </div>
    </section>
  );
}

/* Seller proof, shown above the home value forms */
export function SellerStats() {
  return (
    <section className="pt-16 sm:pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 border border-gold-500/30 bg-[#0b0b0b] p-6 sm:p-8 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-500">Thinking of selling?</p>
            <p className="font-display mt-2 text-3xl text-white">Get your home value in <span className="italic text-gold-500">24 hours</span></p>
            <p className="mt-2 text-sm text-slate-400">Free, no pressure. A real CMA from Devin, not a robot estimate.</p>
          </div>
          {[
            [`${STATS.sellerRatio}%`, "Avg. of asking price"],
            [`~${STATS.sellerDom} days`, "Avg. time to sell"],
            [millions(STATS.volume), "Total homes sold"],
          ].map(([n, l]) => (
            <div key={l} className="text-center">
              <div className="font-display text-4xl text-white">{n}</div>
              <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-500">{l}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">Seller stats: Unique Lifestyle Realty listings Devin closed, per NWMLS, 2019–2026.</p>
      </div>
    </section>
  );
}

/* Area cards with real sale counts, linking to each neighborhood page */
export function AreaCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Object.entries(AREA_GROUPS).filter(([, a]) => a.href).map(([k, a]) => {
        const n = SALES.filter((s) => s.g === k).length;
        return (
          <a key={k} href={a.href} className="group rounded-xl border border-gold-500/25 bg-[#0b0b0b] p-6 transition hover:border-gold-500">
            <div className="font-display text-3xl text-white">{a.name}</div>
            <p className="mt-2 text-sm text-slate-400">{a.blurb}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">{n} homes sold · Explore →</p>
          </a>
        );
      })}
    </div>
  );
}
