import { NavLink, useLocation } from 'react-router-dom'
import {
  HiOutlineViewGrid, HiOutlineServer,
  HiOutlineLightningBolt, HiOutlineChartBar, HiOutlineEye,
  HiOutlineShieldCheck, HiOutlineDatabase, HiOutlineCheckCircle,
  HiOutlinePlay, HiOutlineGlobe, HiOutlineUser
} from 'react-icons/hi'

const navItems = [
  { path: '/', label: 'Dashboard', icon: <HiOutlineViewGrid />, section: 'overview' },
  { path: '/servers', label: 'Disease Servers', icon: <HiOutlineServer />, section: 'management' },
  { path: '/datasets', label: 'Dataset Management', icon: <HiOutlineDatabase />, section: 'datasets' },
  { path: '/datasets/validation', label: 'Dataset Validation', icon: <HiOutlineCheckCircle />, section: 'datasets' },
  { path: '/training/local', label: 'Local Training', icon: <HiOutlinePlay />, section: 'training' },
  { path: '/training/federated', label: 'Federated Training', icon: <HiOutlineGlobe />, section: 'training' },
  { path: '/predictions', label: 'Local Predictions', icon: <HiOutlineChartBar />, section: 'ai' },
  { path: '/explainability', label: 'SHAP Explainability', icon: <HiOutlineEye />, section: 'ai' },
  { path: '/profile', label: 'Investigator Profile', icon: <HiOutlineUser />, section: 'account' },
]

export default function Sidebar() {
  const location = useLocation()

  const sections = {
    overview: 'Overview',
    management: 'Coordination',
    datasets: 'Data Management',
    training: 'Model Training',
    ai: 'AI & Interpretability',
    account: 'Account'
  }

  let currentSection = null

  return (
    <aside className="sidebar" id="main-sidebar">
      <div className="sidebar-logo">
        <div className="glass-brand">
          <h1>FedCare Hospital</h1>
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
          <span>Local Node Mode</span>
        </div>
      </div>
    </aside>
  )
}
