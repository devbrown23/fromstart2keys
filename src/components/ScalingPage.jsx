import { useMemo } from "react";

const CAL = import.meta.env.VITE_CALENDAR_URL || "#";

export default function ScalingPage() {
  useMemo(() => {
    document.title = "FromStart2Keys – Scaling Page";
  }, []);

  return (
    <div className="min-h-screen bg-black text-slate-200 selection:bg-gold-500/30">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-black">
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Ready to Scale <span className="text-gold-500">→</span> Your Next Move?
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Whether buying, selling, or investing—we’ll map your strategy from start to keys.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={CAL}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-gold-500 px-5 py-3 font-semibold text-black hover:bg-gold-600 transition"
            >
              Book Your Free Consult
            </a>
            <a
              href="#services"
              className="rounded-lg border border-gold-500/40 px-5 py-3 font-semibold text-gold-500 hover:bg-gold-500 hover:text-black transition"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            How We Help
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Buyers", "Smart search + negotiation that protects you."],
              ["Sellers", "CMA-driven pricing + marketing that sells fast."],
              ["Investors", "Property analysis to grow your portfolio."],
              ["Military Moves", "PCS relocation support around JBLM."],
            ].map(([title, desc]) => (
              <div
                key={title}
                className="rounded-xl border border-gold-500/20 bg-[#0b0b0b] p-6 shadow-sm hover:shadow-[0_0_0_1px_rgba(212,175,55,0.35)]"
              >
                <h3 className="text-base font-semibold text-gold-500">{title}</h3>
                <p className="mt-2 text-sm text-slate-300">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 sm:py-20 bg-[#0b0b0b]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Let’s talk about your next move
          </h2>
          <p className="mt-2 text-slate-300">
            No pressure. No obligation. Just strategy that gets results.
          </p>
          <a
            href={CAL}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-block rounded-lg bg-gold-500 px-6 py-3 font-semibold text-black hover:bg-gold-600 transition"
          >
            Schedule Your Call →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gold-500/20 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex justify-between text-sm text-slate-400">
          <p>© {new Date().getFullYear()} FromStart2Keys. All rights reserved.</p>
          <p>Serving Tacoma, Pierce, Thurston & JBLM</p>
        </div>
      </footer>
    </div>
  );
}

