import { NavLink, useLocation } from 'react-router-dom'
import {
  HiOutlineViewGrid, HiOutlineServer,
  HiOutlineLightningBolt, HiOutlineChartBar, HiOutlineEye,
  HiOutlineShieldCheck
} from 'react-icons/hi'

const navItems = [
  { path: '/', label: 'Dashboard', icon: <HiOutlineViewGrid />, section: 'overview' },
  { path: '/servers', label: 'Disease Servers', icon: <HiOutlineServer />, section: 'management' },
  { path: '/training', label: 'FL Training', icon: <HiOutlineLightningBolt />, section: 'ai' },
  { path: '/predictions', label: 'Predictions', icon: <HiOutlineChartBar />, section: 'ai' },
  { path: '/explainability', label: 'Explainability', icon: <HiOutlineEye />, section: 'ai' },
]

export default function Sidebar() {
  const location = useLocation()

  const sections = {
    overview: 'Overview',
    management: 'Management',
    ai: 'AI & Analytics',
  }

  let currentSection = null

  return (
    <aside className="sidebar" id="main-sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">F</div>
        <div>
          <h1>FedCare AI</h1>
          <span className="logo-badge">v1.0</span>
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
          <span>Privacy-Preserving Mode</span>
        </div>
      </div>
    </aside>
  )
}
