import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { BrandMark, Orb } from '../components/Brand'

/* ---------- types ---------- */
type GC = { obj?: string; part?: string; pri?: string; min?: string; paths?: string; id?: string; secured?: boolean }
type Msg = { role: 'a' | 'u'; text: string }
type Opt = { label: string; gc?: Partial<GC> }
type Toast = { id: number; kind: 'op' | 'ur' | 'si'; icon: string; title: string; msg: string }

/* ---------- intake script ---------- */
const SCRIPT: { a: string; opts: Opt[] }[] = [
  {
    a: "Morning, Denis. You've got one unit you want to move. Tell me the goal in your words — I'll only ask what actually changes the outcome.",
    opts: [
      { label: 'Sell this EFIS display — best recovery, no rush', gc: { obj: 'Maximum recovery', pri: 'Net recovery', part: 'EFIS Display · PN 7003110-901' } },
      { label: 'Sell it fast, I need the cash', gc: { obj: 'Fastest liquidity', pri: 'Payment speed', part: 'EFIS Display · PN 7003110-901' } },
    ],
  },
  {
    a: "Got it. Is this the only one — or is there more where it came from? It changes whether I play this as a one-off or open a package angle.",
    opts: [{ label: 'Just this one for now' }, { label: "There's more, but start with this" }],
  },
  {
    a: "Honest condition check — I'll represent it exactly as it is, never overstate it. What's the trace situation?",
    opts: [
      { label: 'As removed, partial trace', gc: { part: 'EFIS · as removed · partial trace' } },
      { label: 'No trace at all', gc: { part: 'EFIS · no trace represented' } },
    ],
  },
  {
    a: "Fine — that doesn't shut you out, it just changes who can accept it. Now the important one: your floor. I lock it in a protected store, and I will never disclose it or even hint at it to the other side.",
    opts: [
      { label: 'Enter my private minimum 🔒', gc: { min: '•••• protected', secured: true } },
      { label: "I'd rather not say yet", gc: { min: '•••• protected', secured: true } },
    ],
  },
  {
    a: 'Locked. Which paths am I allowed to work — beyond a straight sale?',
    opts: [
      { label: 'Outright, exchange, or repair evaluation', gc: { paths: 'Outright · exchange · repair eval' } },
      { label: 'Outright only', gc: { paths: 'Outright only' } },
    ],
  },
  {
    a: 'Last one. When may I release your identity to a counterparty?',
    opts: [
      { label: 'Only after we both approve a Deal Card', gc: { id: 'After mutual Deal Card' } },
      { label: "Once they're verified & serious", gc: { id: 'After verify + intent' } },
    ],
  },
]

const TH_COUNT: Record<number, string> = { 55: '7', 65: '5', 75: '3', 85: '1', 95: '1' }
const TH_TXT: Record<number, string> = {
  55: 'incl. 4 research-grade leads', 65: 'incl. 3 bridge opportunities', 75: 'incl. 2 bridge opportunities',
  85: 'that meets every mandatory gate', 95: 'high-priority only',
}

export default function PilotFlow() {
  const [stage, setStage] = useState(0)
  const [gc, setGc] = useState<GC>({})
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [step, setStep] = useState(0)
  const [typing, setTyping] = useState(false)
  const [showThresh, setShowThresh] = useState(false)
  const [thresh, setThresh] = useState(85)
  const [toasts, setToasts] = useState<Toast[]>([])
  const bodyRef = useRef<HTMLDivElement>(null)

  const toast = useCallback((kind: Toast['kind'], icon: string, title: string, msg: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, kind, icon, title, msg }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  // reveal agent line for a given step (with typing delay)
  const speak = useCallback((s: number) => {
    setTyping(true)
    const t = setTimeout(() => {
      setTyping(false)
      setMsgs((m) => [...m, { role: 'a', text: SCRIPT[s].a }])
    }, 620)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => speak(0), [speak])
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [msgs, typing])

  function choose(opt: Opt) {
    setMsgs((m) => [...m, { role: 'u', text: opt.label }])
    if (opt.gc) setGc((g) => ({ ...g, ...opt.gc }))
    if (opt.gc?.secured) {
      setShowThresh(true)
      toast('si', '🔒', 'Private minimum secured', 'Stored server-side. Excluded from analytics, prompts and every counterparty message.')
    }
    const next = step + 1
    setStep(next)
    if (next < SCRIPT.length) {
      speak(next)
    } else {
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        setMsgs((m) => [...m, { role: 'a', text: "That's everything I need — no forms, no 40-field upload. Set the bar for what earns your attention, then I'll go to work and stay quiet until I have something real." }])
      }, 620)
    }
  }

  const intakeDone = step >= SCRIPT.length

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-24 pt-6 sm:px-8">
      {/* toasts */}
      <div className="fixed right-4 top-4 z-[80] grid gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="grid w-[300px] animate-slideIn grid-cols-[28px_1fr] gap-2.5 rounded-[13px] border border-al-line2 bg-[rgba(10,15,24,.96)] p-3 backdrop-blur-lg shadow-lg">
            <div className={`grid h-7 w-7 place-items-center rounded-lg text-[12px] ${t.kind === 'op' ? 'bg-[rgba(67,221,255,.1)] text-al-cyan' : t.kind === 'ur' ? 'bg-[rgba(255,109,128,.1)] text-al-red' : 'bg-[rgba(143,154,172,.12)] text-al-muted'}`}>{t.icon}</div>
            <div><b className="text-[10px]">{t.title}</b><p className="mt-[3px] text-[9px] leading-snug text-al-muted">{t.msg}</p></div>
          </div>
        ))}
      </div>

      {/* top bar */}
      <div className="flex h-[60px] items-center justify-between">
        <Link to="/" className="flex items-center gap-[11px] font-black tracking-[0.06em]"><BrandMark /> AEROLOOP <span className="rounded-full border border-[rgba(67,221,255,.25)] px-[6px] py-[3px] text-[9px] text-al-cyan">PILOT</span></Link>
        <Link to="/" className="text-[10px] font-black tracking-[0.16em] text-al-muted hover:text-al-text">&larr; BACK TO ADVISOR</Link>
      </div>

      {/* stepper */}
      <div className="my-5 flex flex-wrap gap-2">
        {['Tell Vector your goal', 'Vector works silently', 'One qualified opportunity', 'Approve & set alerts'].map((label, i) => (
          <div key={i} className={`min-w-[150px] flex-1 rounded-xl border p-3 transition ${i === stage ? 'border-[rgba(67,221,255,.32)] bg-[rgba(67,221,255,.05)] opacity-100' : i < stage ? 'border-[rgba(145,244,169,.25)] opacity-100' : 'border-al-line opacity-50'}`}>
            <div className="text-[8px] font-black tracking-[0.14em] text-al-muted">STEP 0{i + 1}</div>
            <b className="mt-1.5 block text-[12px]">{label}{i < stage && <span className="text-al-lime"> ✓</span>}</b>
          </div>
        ))}
      </div>

      {/* STAGE 0 — intake */}
      {stage === 0 && (
        <div className="animate-fadeUp">
          <div className="panel mb-3.5 p-5">
            <div className="eyebrow">TRANSACTION INTELLIGENCE FOR AVIATION</div>
            <h1 className="my-3 text-[clamp(30px,4.6vw,48px)] leading-none tracking-[-0.045em]">Don&rsquo;t list it. <span className="bg-gradient-to-r from-white via-[#9eaaff] to-[#45deff] bg-clip-text text-transparent">Tell your advisor.</span></h1>
            <p className="max-w-[640px] text-[15px] leading-relaxed text-[#aeb8c8]">You have one part to move. Instead of blasting an RFQ and chasing quotes, you tell Vector your goal and limits — once — and it brings back only a real, qualified path.</p>
            <p className="mt-3.5 text-[12px] italic text-al-muted">&ldquo;The industry doesn&rsquo;t lack inventory. It lacks intelligence.&rdquo;</p>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-3.5 max-[900px]:grid-cols-1">
            {/* chat */}
            <div className="panel flex min-h-[420px] flex-col">
              <div className="flex items-center gap-[11px] border-b border-al-line p-4"><Orb /><div><b className="text-[12px]">Vector</b><span className="mt-[3px] block text-[8px] text-al-muted">Your commercial advisor · building your Goal Contract</span></div></div>
              <div ref={bodyRef} className="flex max-h-[430px] flex-1 flex-col gap-2.5 overflow-auto p-4">
                {msgs.map((m, i) => (
                  <div key={i} className={`max-w-[86%] animate-fadeUp rounded-[14px] px-3 py-[11px] text-[12.5px] leading-[1.55] ${m.role === 'a' ? 'self-start border border-[rgba(117,135,255,.18)] bg-[rgba(117,135,255,.07)]' : 'self-end border border-al-line bg-white/[0.05]'}`}>{m.text}</div>
                ))}
                {typing && <div className="flex gap-1 self-start p-2.5">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-blink rounded-full bg-[#78849a]" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>}
              </div>
              {!typing && !intakeDone && (
                <div className="flex flex-wrap gap-2 p-4 pt-0">
                  {SCRIPT[step].opts.map((o) => (
                    <button key={o.label} onClick={() => choose(o)} className="rounded-[11px] border border-al-line2 bg-white/[0.03] px-3 py-[9px] text-[11px] font-bold transition hover:-translate-y-px hover:border-al-cyan hover:bg-[rgba(67,221,255,.08)]">{o.label}</button>
                  ))}
                </div>
              )}
              {!typing && intakeDone && (
                <div className="p-4 pt-0"><button onClick={() => setStage(1)} className="btn btn-primary">Send Vector to work &rarr;</button></div>
              )}
            </div>

            {/* goal contract */}
            <div className="panel sticky top-3.5 self-start p-5">
              <h3 className="mb-1 text-[11px]">Goal Contract</h3>
              <div className="mb-3 text-[8px] text-al-muted">Built from your answers · Vector&rsquo;s optimization target &amp; authority boundary</div>
              {([['Objective', gc.obj], ['Part', gc.part], ['Top priority', gc.pri], ['Private minimum', gc.min], ['Allowed paths', gc.paths], ['Identity release', gc.id]] as [string, string | undefined][]).map(([k, v], i) => (
                <div key={i} className="flex justify-between gap-3 border-b border-white/[0.05] py-[9px] last:border-0">
                  <span className="text-[9px] text-al-muted">{k}</span>
                  <b className={`text-right text-[10px] ${!v ? 'font-normal italic text-al-muted2' : k === 'Private minimum' ? 'text-al-purple' : 'text-[#dfe5f2]'}`}>{v ?? '—'}</b>
                </div>
              ))}
              {showThresh && (
                <div className="mt-3 rounded-[13px] border border-al-line bg-white/[0.02] p-3.5">
                  <label className="flex justify-between text-[9px] font-bold tracking-wide text-al-muted">Match threshold <span>{thresh}%+</span></label>
                  <input type="range" min={55} max={95} step={10} value={thresh} onChange={(e) => setThresh(+e.target.value)} className="my-2.5 w-full accent-al-cyan" />
                  <div className="text-[11px] text-al-cyan"><b className="text-white">{TH_COUNT[thresh]}</b> qualified {TH_COUNT[thresh] === '1' ? 'opportunity' : 'opportunities'} — <span className="text-al-muted">{TH_TXT[thresh]}</span></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {stage === 1 && <Working onDone={() => { toast('op', '◆', 'Qualified opportunity', 'A purchase-ready buyer meets every mandatory requirement after one bridge.'); setStage(2) }} />}
      {stage === 2 && <Decision onApprove={() => { toast('op', '✓', 'Evaluation authorized', 'Bench slot reserved. Assembling your decision-ready Deal Card.'); setStage(3) }} onRaise={() => toast('si', '↑', 'Strategy noted', 'Vector will hold your floor and model a 6–9% target lift against live demand.')} />}
      {stage === 3 && <DealCard toast={toast} />}

      <div className="mt-6 border-t border-al-line pt-4 text-[10px] leading-relaxed text-al-muted2">
        <b className="text-al-muted">Pilot flow.</b> Seller-side liquidation of one avionics LRU: conversational intake &rarr; silent qualification &rarr; one interrogatable opportunity &rarr; protected private-price bridge &rarr; decision-ready Deal Card. Logic is scripted for the walk-through; the private minimum is never displayed, and hard eligibility is a deterministic gate. Not a promise of commercial, legal or regulatory results.
      </div>
    </div>
  )
}

/* ---------- STAGE 1 ---------- */
function Working({ onDone }: { onDone: () => void }) {
  const [lit, setLit] = useState(0)
  const [n, setN] = useState(0)
  const steps = [
    'Reading your unit & representing its true status',
    'Applying hard eligibility gates (deterministic)',
    'Testing compatibility with other advisors — privately',
    'Comparing value-creating paths before price',
    'Checking freshness, authority & trust confidence',
  ]
  useEffect(() => {
    const timers: number[] = []
    steps.forEach((_, i) => timers.push(window.setTimeout(() => setLit(i + 1), 560 * (i + 1))))
    const start = 560 * steps.length + 400
    const counter = window.setTimeout(() => {
      const iv = window.setInterval(() => setN((x) => x + Math.floor(7 + Math.random() * 23)), 90)
      window.setTimeout(() => { window.clearInterval(iv); setN(412); window.setTimeout(onDone, 1100) }, 1500)
    }, start)
    timers.push(counter)
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="panel animate-fadeUp py-12 text-center">
      <div className="mx-auto mb-5"><Orb size={64} /></div>
      <div className="eyebrow">SILENCE IS A FEATURE</div>
      <h1 className="my-3 text-[26px]">Vector is working so you don&rsquo;t have to</h1>
      <div className="mx-auto grid max-w-[440px] gap-2 text-left">
        {steps.map((s, i) => (
          <div key={i} className={`flex items-center gap-2.5 text-[11px] transition ${i < lit ? 'text-[#dfe5f2] opacity-100' : 'text-al-muted opacity-40'}`}>
            <span className={`grid h-4 w-4 flex-none place-items-center rounded-full border text-[9px] ${i < lit ? 'border-al-lime text-al-lime' : 'border-al-line2'}`}>{i < lit ? '✓' : i + 1}</span>{s}
          </div>
        ))}
      </div>
      <div className="mt-4 text-[11px] text-al-muted">{n < 412 ? <>Silently discarded <b className="text-al-cyan">{n}</b> weak combinations…</> : <>Silently discarded <b className="text-al-cyan">412</b> weak combinations. Surfacing the <b className="text-al-cyan">1</b> that clears your bar.</>}</div>
    </div>
  )
}

/* ---------- STAGE 2 ---------- */
const ANSWERS: Record<string, string> = {
  a1: 'This buyer is a verified operator with represented purchase authority and a budget that clears the gate. They explicitly accept an evaluation path for partial-trace units — most buyers in this pool don\'t, which is why they\'re the one surfaced and 411 others weren\'t.',
  a2: 'The one soft spot is documentation: partial trace. The evaluation bridge is exactly what neutralizes it. Risk if you skip it: the buyer can\'t accept installation-ready, and the deal reverts to a lower core/teardown path. Nothing here can bind you before you approve.',
  a3: 'You\'re not seeing their identity, and you don\'t need to yet. You\'re also not seeing that this buyer lapsed one similar deal 9 months ago on slow document response — so I\'ve pre-set a tighter evidence deadline in the Deal Card to protect your time.',
}
function Decision({ onApprove, onRaise }: { onApprove: () => void; onRaise: () => void }) {
  const [open, setOpen] = useState(false)
  const [ans, setAns] = useState<string>('')
  const facs: [string, number][] = [['Technical', 94], ['Documentation', 62], ['Commercial', 78], ['Operational', 88], ['Trust confidence', 83]]
  return (
    <div className="animate-fadeUp">
      <div className="panel mb-3 p-5">
        <div className="eyebrow">DECISION QUEUE · CALM ON TOP, RECEIPTS ON DEMAND</div>
        <h1 className="my-2.5 text-[24px] tracking-[-0.03em]">Vector rejected 412 combinations. Here is the one worth your time.</h1>
        <p className="max-w-[640px] text-[13px] leading-relaxed text-[#aeb8c8]">One card. One number. One action. Everything behind it is one click away — nothing is a magic number.</p>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-[rgba(67,221,255,.22)]" style={{ background: 'linear-gradient(140deg,rgba(67,221,255,.05),rgba(117,135,255,.03))' }}>
        <div className="flex justify-between gap-4 p-[18px] pb-3">
          <div>
            <div className="text-[8px] font-black tracking-[0.15em] text-al-gold">QUALIFIED BRIDGE OPPORTUNITY</div>
            <div className="mt-[7px] text-[18px] font-black tracking-[-0.02em]">PN 7003110-901 — EFIS Display Unit</div>
            <div className="mt-[5px] text-[10px] leading-relaxed text-al-muted">As removed · partial trace · availability confirmed 26 min ago · your unit</div>
          </div>
          <Gauge value={74} />
        </div>
        <div className="flex flex-wrap gap-1.5 px-[18px] pb-1">
          <span className="chip border-[rgba(145,244,169,.24)] bg-[rgba(145,244,169,.07)] text-[#cbffd5]">Buyer verified</span>
          <span className="chip border-[rgba(145,244,169,.24)] bg-[rgba(145,244,169,.07)] text-[#cbffd5]">Purchase authority</span>
          <span className="chip">Accepts evaluation path</span>
          {['identity', 'minimum', 'exact location', 'customer history'].map((p) => <span key={p} className="chip border-[rgba(183,140,255,.28)] bg-[rgba(183,140,255,.08)] text-[#d8c6ff]">Protected: {p}</span>)}
        </div>
        <div className="mx-[18px] mt-3 flex items-center gap-3 rounded-[14px] border border-[rgba(145,244,169,.2)] bg-[rgba(145,244,169,.05)] p-3">
          <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] bg-[rgba(145,244,169,.1)] font-black text-al-lime">▶</span>
          <div><b className="text-[11px]">Recommended action — authorize an independent bench evaluation</b><p className="mt-[3px] text-[9px] text-al-muted">Turns an as-removed unit a buyer can&rsquo;t yet accept into one they can, without touching your floor.</p></div>
          <div className="ml-auto text-right text-[9px] text-al-muted">after action<br /><b className="text-[13px] text-al-lime">74 &rarr; 89</b></div>
        </div>
        <div className="flex items-center gap-2.5 p-[18px]">
          <button onClick={() => setOpen((o) => !o)} className="btn border-0 bg-transparent">{open ? 'Hide the receipts ▴' : 'Why this? Show the receipts ▾'}</button>
          <span className="ml-auto text-[9px] text-al-muted">Estimated of your time: <b className="text-[#dfe5f2]">4 minutes</b></span>
        </div>

        <div className={`grid overflow-hidden border-t border-al-line transition-all duration-500 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="min-h-0">
            <div className="p-[18px]">
              <Dt>HARD ELIGIBILITY — DETERMINISTIC, NOT AVERAGED</Dt>
              <div className="grid gap-1.5">
                <Gate label="Part identity — exact PN match" verdict="pass" />
                <Gate label="Quantity — 1 of 1 accepted" verdict="pass" />
                <Gate label="Documentation — partial trace, buyer accepts after evaluation" verdict="cond" />
                <Gate label="Operational — logistics & deadline feasible" verdict="pass" />
                <Gate label="Authority — you own it; buyer purchase-ready" verdict="pass" />
              </div>

              <Dt>COMPATIBILITY — WITH CONFIDENCE, NOT A BARE SCORE</Dt>
              {facs.map(([l, v]) => (
                <div key={l} className="mb-1.5 grid grid-cols-[120px_1fr_30px] items-center gap-2.5">
                  <span className="text-[9px] text-[#9ca7b8]">{l}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><span className="block h-full rounded-full" style={{ width: `${v}%`, background: 'linear-gradient(90deg,#7587ff,#43ddff)' }} /></span>
                  <b className="text-right text-[9px] text-[#aab4c4]">{v}</b>
                </div>
              ))}

              <Dt>PRIVATE-PRICE BRIDGE — COMPUTED SERVER-SIDE, VALUES NEVER EXCHANGED</Dt>
              <div className="grid grid-cols-[1fr_132px_1fr] items-center gap-2.5 max-[620px]:grid-cols-1">
                <PCard label="YOUR FLOOR" />
                <div className="text-center"><div className="text-[10px] font-bold text-al-lime">Bridgeable ✓</div><small className="mt-1.5 block text-[8px] leading-snug text-al-muted">Neither side&rsquo;s number is shared. Only &ldquo;a responsible change can close this&rdquo; crosses the wire.</small></div>
                <PCard label="BUYER CEILING" />
              </div>

              <Dt>MARKET CONTEXT — ADVICE RUNS BOTH DIRECTIONS</Dt>
              <div className="rounded-[13px] border border-[rgba(255,200,117,.2)] bg-[rgba(255,200,117,.045)] p-3">
                <b className="text-[10px] text-[#ffdfa6]">Hold your floor — don&rsquo;t discount.</b>
                <p className="mt-1.5 text-[10px] leading-relaxed text-[#c7b48f]">Surplus for this display family is unusually thin this quarter, and 3 buyers requested it in the last 14 days. Vector recommends the evaluation bridge over any price reduction; if this buyer lapses, raising your target 6–9% is defensible. Cutting price here would leave money on the table.</p>
              </div>

              <Dt>BEFORE YOU MEET ANYONE — INTERROGATE IT</Dt>
              <div className="flex flex-wrap gap-1.5">
                {[['a1', 'Why this buyer?'], ['a2', "What's the risk?"], ['a3', 'What am I not seeing?']].map(([k, q]) => (
                  <button key={k} onClick={() => setAns(ANSWERS[k])} className="rounded-[10px] border border-al-line2 bg-[rgba(117,135,255,.06)] px-2.5 py-[7px] text-[10px] font-bold hover:border-al-cyan">{q}</button>
                ))}
              </div>
              {ans && <p className="mt-2.5 animate-fadeUp border-l-2 border-al-cyan pl-3 text-[11px] leading-relaxed text-[#cdd6e6]">{ans}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2.5">
        <button onClick={onApprove} className="btn btn-lime">Authorize evaluation &amp; assemble Deal Card</button>
        <button onClick={() => { setOpen(true); onRaise() }} className="btn btn-gold">Adjust — hold / raise my target instead</button>
      </div>
    </div>
  )
}
function Gauge({ value }: { value: number }) {
  return (
    <div className="relative grid h-[92px] w-[92px] flex-none place-items-center rounded-full" style={{ background: `conic-gradient(#43ddff ${value}%, rgba(255,255,255,.07) 0)` }}>
      <div className="absolute rounded-full" style={{ inset: 7, background: '#0a1018', border: '1px solid rgba(180,205,255,.10)' }} />
      <div className="relative text-center"><strong className="text-[28px] tracking-[-0.05em]">{value}</strong><span className="block text-[7px] uppercase tracking-[0.1em] text-al-muted">Match</span></div>
    </div>
  )
}
function Dt({ children }: { children: React.ReactNode }) { return <div className="mb-2 mt-3.5 text-[8px] font-black tracking-[0.14em] text-al-muted first:mt-0">{children}</div> }
function Gate({ label, verdict }: { label: string; verdict: 'pass' | 'cond' }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[10px] border border-al-line bg-white/[0.015] px-2.5 py-2 text-[10px]">
      {label}
      <span className={`ml-auto rounded-full px-[7px] py-[3px] text-[8px] font-black ${verdict === 'pass' ? 'bg-[rgba(145,244,169,.1)] text-[#cbffd5]' : 'bg-[rgba(255,200,117,.1)] text-[#ffdfa6]'}`}>{verdict === 'pass' ? 'PASS' : 'CONDITIONAL'}</span>
    </div>
  )
}
function PCard({ label }: { label: string }) {
  return (
    <div className="rounded-[13px] border border-[rgba(183,140,255,.22)] bg-[rgba(183,140,255,.05)] p-3 text-center">
      <span className="block text-[8px] tracking-wide text-al-muted">{label}</span>
      <strong className="my-2 block text-[22px] tracking-[2px] text-al-purple">••••</strong>
      <small className="text-[8px] text-[#8f83b0]">protected — never disclosed</small>
    </div>
  )
}

/* ---------- STAGE 3 ---------- */
const NOTES: Record<string, string> = {
  silent: 'Hard mismatches and noise never reach you. You\'ll see activity only when you open AeroLoop.',
  digest: 'Non-urgent changes batch into a once-a-day briefing. No pings in between.',
  opportunity: 'You\'ll be interrupted only when a credible executable path exists — like the one you just approved.',
  urgent: 'Silence unless something is time-critical: a closing authority window, a fraud or fulfillment risk.',
}
function DealCard({ toast }: { toast: (k: Toast['kind'], i: string, t: string, m: string) => void }) {
  const [level, setLevel] = useState('opportunity')
  const [voice, setVoice] = useState('terse')
  const [closed, setClosed] = useState(false)
  const note = NOTES[level] + (voice === 'jarvis' ? " I'll say it like a colleague, not a dashboard." : '')
  return (
    <div className="grid animate-fadeUp grid-cols-[minmax(0,1fr)_340px] gap-3.5 max-[900px]:grid-cols-1">
      <div className="panel p-5">
        <div className="eyebrow">DECISION-READY DEAL CARD · BLINDED BEFORE IDENTITY</div>
        <div className="mt-3 rounded-[14px] border border-[rgba(117,135,255,.2)] p-4" style={{ background: 'linear-gradient(130deg,rgba(117,135,255,.1),rgba(67,221,255,.03))' }}>
          <span className="text-[8px] font-black tracking-[0.12em] text-[#aeb8ff]">MUTUAL APPROVAL BEFORE IDENTITY UNLOCK</span>
          <h3 className="my-2 text-[16px]">EFIS Display Unit — evaluation bridge</h3>
          <p className="text-[10px] text-al-muted">Both sides approve this exact structure before any name, document or location is released.</p>
        </div>
        <div className="mt-3.5">
          {[['Structure', 'Outright after independent bench evaluation'], ['Part & condition', 'PN 7003110-901 · as removed · partial trace'], ['Evidence status', 'Evaluation slot reserved · tag scan pending'], ['Your net (protected math)', 'At or above your floor — guaranteed by the engine'], ['AeroLoop fee', 'Disclosed & capped · visible before you approve'], ['Identity', 'Unlocks only on mutual approval']].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-white/[0.05] py-2.5 text-[11px]"><span className="text-al-muted">{k}</span><b className="text-right">{v}</b></div>
          ))}
          <div className="mt-3 flex items-center justify-between rounded-xl border border-[rgba(145,244,169,.18)] bg-[rgba(145,244,169,.05)] p-3"><span className="text-[9px] text-[#9fb4a3]">PROBABILITY OF A VERIFIED CLOSE</span><strong className="text-[20px] text-[#c8ffd2]">89%</strong></div>
        </div>
        <div className="mt-3.5"><button onClick={() => { setClosed(true); toast('op', '✓', 'Your side approved', 'Waiting on the buyer to approve the same blinded structure. Identity unlocks when both sides sign.') }} className="btn btn-primary">Approve my side of the Deal Card</button></div>

        {closed && (
          <div className="mt-4 animate-fadeUp rounded-2xl border border-[rgba(145,244,169,.2)] bg-[rgba(145,244,169,.04)] p-4">
            <div className="eyebrow text-al-lime">OUTCOME PASSPORT · VERIFIED CLOSE PATH</div>
            <h3 className="mt-2 text-[16px]">That&rsquo;s the whole loop — with one part and none of your position exposed.</h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#aeb8c8]">You told Vector a goal and a floor. It rejected the noise, protected your minimum, found a buyer you&rsquo;d never have reached, and structured a path you&rsquo;d not have built alone. Every close like this makes the next recommendation smarter.</p>
            <Link to="/" className="mt-3 inline-block btn">Back to Advisor Home</Link>
          </div>
        )}
      </div>

      <div className="panel self-start p-5">
        <h3 className="text-[11px]">How should Vector reach you?</h3>
        <div className="mb-3 mt-1 text-[9px] text-al-muted">Meaningful only. Silence by default. You tune the bar and the voice.</div>
        <div className="flex flex-wrap gap-1.5">
          {['silent', 'digest', 'opportunity', 'urgent'].map((l) => (
            <button key={l} onClick={() => setLevel(l)} className={`rounded-[10px] border px-2.5 py-2 text-[10px] font-bold capitalize ${level === l ? 'border-al-cyan bg-[rgba(67,221,255,.08)] text-white' : 'border-al-line text-al-muted'}`}>{l === 'urgent' ? 'Urgent only' : l}</button>
          ))}
        </div>
        <div className="mb-2 mt-3 text-[9px] text-al-muted">Advisor voice</div>
        <div className="flex gap-1.5">
          {[['terse', 'Terse terminal'], ['jarvis', 'Conversational']].map(([v, l]) => (
            <button key={v} onClick={() => { setVoice(v); if (v === 'jarvis') toast('op', '◆', 'Vector', '"Good call, Denis. I\'ll keep your floor covered and only bring you the buyer once they\'ve earned the introduction."') }} className={`rounded-[10px] border px-2.5 py-2 text-[10px] font-bold ${voice === v ? 'border-al-cyan bg-[rgba(67,221,255,.08)] text-white' : 'border-al-line text-al-muted'}`}>{l}</button>
          ))}
        </div>
        <p className="mt-2.5 border-l-2 border-al-line2 pl-3 text-[10px] leading-relaxed text-al-muted">{note}</p>
      </div>
    </div>
  )
}
