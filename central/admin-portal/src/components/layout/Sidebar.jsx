import { NavLink } from 'react-router-dom'
import {
  HiOutlineViewGrid, HiOutlineOfficeBuilding, HiOutlineServer,
  HiOutlineLightningBolt, HiOutlineGlobe, HiOutlineTrendingUp,
  HiOutlineEye, HiOutlineClock, HiOutlineUser, HiOutlineShieldCheck
} from 'react-icons/hi'

const navItems = [
  { path: '/', label: 'Dashboard', icon: <HiOutlineViewGrid />, section: 'overview' },
  { path: '/hospitals', label: 'Hospitals Registry', icon: <HiOutlineOfficeBuilding />, section: 'orchestration' },
  { path: '/servers', label: 'Federated Servers', icon: <HiOutlineServer />, section: 'orchestration' },
  { path: '/rounds', label: 'Training Rounds', icon: <HiOutlineLightningBolt />, section: 'orchestration' },
  { path: '/models', label: 'Global Models', icon: <HiOutlineGlobe />, section: 'analytics' },
  { path: '/metrics', label: 'Evaluation Metrics', icon: <HiOutlineTrendingUp />, section: 'analytics' },
  { path: '/explainability', label: 'Explainable AI (XAI)', icon: <HiOutlineEye />, section: 'analytics' },
  { path: '/history', label: 'Training History', icon: <HiOutlineClock />, section: 'analytics' },
  { path: '/profile', label: 'Admin Profile', icon: <HiOutlineUser />, section: 'account' },
]

export default function Sidebar() {
  const sections = {
    overview: 'Overview',
    orchestration: 'Network Control',
    analytics: 'Analytics & Models',
    account: 'Account'
  }

  let currentSection = null

  return (
    <aside className="sidebar" id="main-sidebar">
      <div className="sidebar-logo">
        <div className="glass-brand">
          <h1>FedCare Admin</h1>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => {
          let sectionHeader = null
          if (item.section !== currentSection) {
            currentSection = item.section
            sectionHeader = (
              <div className="sidebar-section" key={`section-${item.section}`}>
                <span className="sidebar-section-title">{sections[item.section]}</span>
              </div>
            )
          }

          return (
            <div key={item.path}>
              {sectionHeader}
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
                id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </div>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="privacy-badge">
          <HiOutlineShieldCheck size={16} />
          <span>Coordinator Node</span>
        </div>
      </div>
    </aside>
  )
}
