import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BrandMark } from './Brand'

const NAV: { to: string; label: string; hint?: string }[] = [
  { to: '/', label: 'Advisor' },
  { to: '/missions', label: 'Missions' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/requirements', label: 'Requirements' },
  { to: '/opportunities', label: 'Opportunities', hint: '1' },
  { to: '/dealroom', label: 'Deal Room' },
  { to: '/outcomes', label: 'Outcomes' },
  { to: '/organization', label: 'Organization' },
]

export default function Shell() {
  const loc = useLocation()
  const title = NAV.find((n) => n.to === loc.pathname)?.label ?? 'Advisor'
  return (
    <div className="grid min-h-screen grid-cols-[248px_minmax(0,1fr)] max-[900px]:grid-cols-1">
      {/* Nav rail */}
      <aside className="sticky top-0 h-screen border-r border-al-line bg-[rgba(5,8,13,.9)] p-3 backdrop-blur-xl max-[900px]:hidden">
        <div className="flex h-[52px] items-center gap-[11px] px-2">
          <BrandMark size={34} />
          <span className="font-black tracking-[0.06em]">AEROLOOP</span>
        </div>
        <nav className="mt-3 flex flex-col gap-[3px]">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex h-[39px] items-center gap-2 rounded-[11px] border px-[10px] text-[11px] font-semibold transition ${
                  isActive
                    ? 'border-[rgba(117,135,255,.14)] bg-gradient-to-r from-[rgba(117,135,255,.13)] to-[rgba(67,221,255,.045)] text-al-text'
                    : 'border-transparent text-[#7e899b] hover:bg-white/[0.03] hover:text-[#cdd5e4]'
                }`
              }
            >
              <span className="flex-1">{n.label}</span>
              {n.hint && (
                <span className="rounded-full bg-[rgba(255,200,117,.11)] px-[6px] py-[3px] text-[8px] font-black text-[#ffd594]">
                  {n.hint}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto" />
      </aside>

      {/* Workspace */}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-al-line bg-[rgba(5,8,13,.78)] px-6 backdrop-blur-xl">
          <div>
            <div className="text-[8px] font-black tracking-[0.15em] text-[#667285]">WORKSPACE</div>
            <h2 className="mt-[2px] text-[15px] tracking-[-0.02em]">{title}</h2>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.16em] text-[#8792a7]">
            <span className="h-[7px] w-[7px] animate-blink rounded-full bg-al-lime shadow-[0_0_12px_#91f4a9]" />
            VECTOR · ONLINE
          </div>
        </header>
        <main className="mx-auto max-w-[1180px] px-6 py-6 pb-24">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
