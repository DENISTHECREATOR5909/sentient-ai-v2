export function BrandMark({ size = 38 }: { size?: number }) {
  return (
    <span
      className="relative inline-block overflow-hidden rounded-[12px]"
      style={{ width: size, height: size, background: 'linear-gradient(140deg,#7a8cff,#4bdfff 52%,#5ef3d5)', boxShadow: '0 0 34px rgba(82,102,255,.32)' }}
      aria-hidden
    >
      <span className="absolute rounded-[10px]" style={{ inset: 3, background: '#080c13' }} />
      <span className="absolute z-[2] rounded-full" style={{ height: 3, width: 20, left: 9, top: 13, transform: 'rotate(28deg)', transformOrigin: 'left', background: 'linear-gradient(90deg,#43ddff,#7587ff)' }} />
      <span className="absolute z-[2] rounded-full" style={{ height: 3, width: 16, left: 9, top: 22, transform: 'rotate(-28deg)', transformOrigin: 'left', background: 'linear-gradient(90deg,#43ddff,#7587ff)' }} />
    </span>
  )
}

export function Orb({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-block flex-none rounded-full animate-orb"
      style={{ width: size, height: size, background: 'radial-gradient(circle at 34% 30%,#fff,#8beaff 16%,#6e7eff 48%,#2a356d 72%,#0d1224)', boxShadow: '0 0 20px rgba(103,126,255,.6)' }}
      aria-hidden
    />
  )
}
