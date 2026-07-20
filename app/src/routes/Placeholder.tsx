export default function Placeholder({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="panel animate-fadeUp p-6">
      <div className="eyebrow">AEROLOOP · COMING NEXT</div>
      <h1 className="mt-3 text-[26px] tracking-[-0.04em]">{title}</h1>
      <p className="mt-2 max-w-[560px] text-[13px] leading-relaxed text-al-muted">{blurb}</p>
      <p className="mt-4 text-[11px] text-al-muted2">
        This area is scaffolded. The pilot flow — conversational intake to a decision-ready Deal Card — is built and
        live under <span className="text-al-cyan">Advisor → Start with one part</span>. We build these screens next,
        one at a time, on the same design system.
      </p>
    </div>
  )
}
