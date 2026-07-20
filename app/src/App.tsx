import { Routes, Route } from 'react-router-dom'
import Shell from './components/Shell'
import Advisor from './routes/Advisor'
import PilotFlow from './routes/PilotFlow'
import Placeholder from './routes/Placeholder'

export default function App() {
  return (
    <Routes>
      {/* Immersive pilot walk-through, outside the app shell */}
      <Route path="/pilot" element={<PilotFlow />} />

      {/* The product shell */}
      <Route element={<Shell />}>
        <Route path="/" element={<Advisor />} />
        <Route path="/missions" element={<Placeholder title="Missions" blurb="Create and manage Goal Contracts — your objectives, priorities, boundaries and the authority Vector holds." />} />
        <Route path="/inventory" element={<Placeholder title="Inventory" blurb="Asset Passports: status, evidence, freshness, private settings, demand and Vector's recommended action path." />} />
        <Route path="/requirements" element={<Placeholder title="Requirements" blurb="Requirement Passports: exact need, accepted alternatives, mandatory paperwork, authority and private exposure." />} />
        <Route path="/opportunities" element={<Placeholder title="Opportunities" blurb="Qualified, bridge, permission and critical-exception inbox — only work that clears your bar." />} />
        <Route path="/dealroom" element={<Placeholder title="Deal Room" blurb="Approved transactions: the decision-ready Deal Card, staged identity, documents, milestones and fees." />} />
        <Route path="/outcomes" element={<Placeholder title="Outcomes" blurb="Verified Close, the Advisor Impact Ledger and evidence-based reliability." />} />
        <Route path="/organization" element={<Placeholder title="Organization" blurb="Users, roles, authority scopes, verification, permissions, integrations and audit." />} />
      </Route>
    </Routes>
  )
}
