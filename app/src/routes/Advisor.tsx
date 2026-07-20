import { Link } from 'react-router-dom'
import { Orb } from '../components/Brand'

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-al-line bg-white/[0.02] p-4">
      <div className="text-[7px] font-black tracking-[0.12em] text-al-muted">{label}</div>
      <div className="mt-2 text-[25px] font-black tracking-[-0.045em]">{value}</div>
      <div className="mt-1 text-[8px] text-[#758194]">{sub}</div>
    </div>
  )
}

export default function Advisor() {
  return (
    <div className="grid gap-3">
      {/* Hero briefing */}
      <section className="panel animate-fadeUp p-6">
        <div className="flex items-center gap-3">
          <Orb size={34} />
          <div>
            <div className="eyebrow">TODAY&rsquo;S ADVISOR BRIEFING</div>
            <div className="mt-1 text-[8px] text-al-muted">Good morning, Denis &middot; Jet Geeks Aviation</div>
          </div>
          <div className="ml-auto text-[8px] text-[#5f6b7c]">Last swept 6 min ago &middot; next review 09:00</div>
        </div>

        <p className="mt-5 max-w-[820px] text-[20px] leading-[1.34] tracking-[-0.03em]">
          I worked overnight and cleared the noise. One as-removed unit now has a{' '}
          <span className="text-al-cyan">purchase-ready buyer</span> — after a single bridge — and your floor was
          never exposed.
        </p>

        <div className="mt-5 grid grid-cols-4 gap-3 max-[720px]:grid-cols-2">
          <Metric label="COMBINATIONS SWEPT" value="412" sub="silently discarded" />
          <Metric label="QUALIFIED FOR YOU" value="1" sub="clears your 85% bar" />
          <Metric label="EST. YOUR TIME" value="4 min" sub="to a decision" />
          <Metric label="PROTECTED" value="4 fields" sub="minimum · identity · location · history" />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/pilot" className="btn btn-primary">Start with one part — talk to Vector &rarr;</Link>
          <Link to="/opportunities" className="btn">Open the opportunity &middot; 1 waiting</Link>
        </div>
      </section>

      {/* What Vector did / highest-value action */}
      <section className="grid grid-cols-[minmax(0,1fr)_340px] gap-3 max-[900px]:grid-cols-1">
        <div className="panel p-5">
          <div className="eyebrow">HIGHEST-VALUE RECOMMENDATION</div>
          <div className="mt-3 flex items-start gap-3 rounded-2xl border border-[rgba(145,244,169,.2)] bg-[rgba(145,244,169,.05)] p-4">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[rgba(145,244,169,.1)] font-black text-al-lime">▶</span>
            <div>
              <b className="text-[12px]">Authorize an independent bench evaluation</b>
              <p className="mt-1 text-[10px] leading-relaxed text-al-muted">
                Turns your partial-trace EFIS display into a unit the buyer can accept — without touching your floor.
                Raises probability 74 &rarr; 89.
              </p>
            </div>
            <Link to="/pilot" className="ml-auto self-center btn btn-lime whitespace-nowrap">Review</Link>
          </div>
          <div className="mt-3 rounded-2xl border border-[rgba(255,200,117,.2)] bg-[rgba(255,200,117,.045)] p-4">
            <b className="text-[11px] text-[#ffdfa6]">Market note — advice runs both directions</b>
            <p className="mt-1.5 text-[10px] leading-relaxed text-[#c7b48f]">
              Surplus for this display family is thin this quarter and 3 buyers asked for it in 14 days. Hold your
              floor; if this buyer lapses, raising your target 6&ndash;9% is defensible. Don&rsquo;t discount.
            </p>
          </div>
        </div>

        <div className="panel p-5">
          <div className="eyebrow">ADVISOR RAIL</div>
          <ul className="mt-3 grid gap-2 text-[10px] text-al-muted">
            <li className="flex justify-between border-b border-white/[0.05] pb-2"><span>Current reasoning</span><b className="text-[#dfe5f2]">Bridging 1 opportunity</b></li>
            <li className="flex justify-between border-b border-white/[0.05] pb-2"><span>Missing evidence</span><b className="text-[#dfe5f2]">Tag scan (pending)</b></li>
            <li className="flex justify-between border-b border-white/[0.05] pb-2"><span>Active sweeps</span><b className="text-[#dfe5f2]">3 running</b></li>
            <li className="flex justify-between border-b border-white/[0.05] pb-2"><span>Authority envelope</span><b className="text-al-purple">Level 2 · bounded</b></li>
            <li className="flex justify-between"><span>Next scheduled review</span><b className="text-[#dfe5f2]">09:00 UTC</b></li>
          </ul>
        </div>
      </section>
    </div>
  )
}
