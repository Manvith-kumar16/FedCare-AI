import { NavLink, useLocation } from 'react-router-dom'
import {
  HiOutlineViewGrid, HiOutlineServer,
  HiOutlineLightningBolt, HiOutlineChartBar, HiOutlineEye,
  HiOutlineShieldCheck, HiOutlineDatabase, HiOutlineCheckCircle,
  HiOutlinePlay, HiOutlineGlobe, HiOutlineUser
} from 'react-icons/hi'
import { FaHospital } from 'react-icons/fa'

const navItems = [
  { path: '/', label: 'Dashboard', icon: <HiOutlineViewGrid />, section: 'overview' },
  { path: '/servers', label: 'Disease Servers', icon: <HiOutlineServer />, section: 'collaboration' },
  { path: '/training/federated', label: 'Federated Training', icon: <HiOutlineGlobe />, section: 'collaboration' },
  { path: '/datasets', label: 'Dataset Management', icon: <HiOutlineDatabase />, section: 'data' },
  { path: '/datasets/validation', label: 'Dataset Validation', icon: <HiOutlineCheckCircle />, section: 'data' },
  { path: '/training/local', label: 'Local Training', icon: <HiOutlinePlay />, section: 'development' },
  { path: '/predictions', label: 'Local Predictions', icon: <HiOutlineChartBar />, section: 'development' },
  { path: '/explainability', label: 'SHAP Explainability', icon: <HiOutlineEye />, section: 'explainability' },
  { path: '/profile', label: 'Investigator Profile', icon: <HiOutlineUser />, section: 'account' },
]

export default function Sidebar() {
  const location = useLocation()

  const sections = {
    overview: 'Overview',
    collaboration: 'Collaboration',
    data: 'Data',
    development: 'Model Development',
    explainability: 'Explainability',
    account: 'Account'
  }

  let currentSection = null

  return (
    <aside className="sidebar" id="main-sidebar">
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <FaHospital size={20} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>FedCare</h1>
          <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Hospital Node</p>
        </div>
      </div>

      <nav className="sidebar-nav" style={{ padding: '20px 12px', flex: 1, overflowY: 'auto' }}>
        {navItems.map(item => {
          let sectionHeader = null
          if (item.section !== currentSection) {
            currentSection = item.section
            sectionHeader = (
              <div style={{ marginTop: '24px', marginBottom: '8px', paddingLeft: '12px' }} key={`section-${item.section}`}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--color-text-muted)', fontWeight: 700 }}>{sections[item.section]}</span>
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
                style={{ borderRadius: '8px', marginBottom: '4px' }}
              >
                <span className="nav-icon" style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                <span style={{ fontSize: '0.9rem' }}>{item.label}</span>
              </NavLink>
            </div>
          )
        })}
      </nav>

      <div style={{ padding: '20px', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(0, 230, 118, 0.1)', borderRadius: '8px', color: 'var(--color-accent-green)', fontSize: '0.75rem', fontWeight: 600 }}>
          <HiOutlineShieldCheck size={18} />
          <span>Local Data Secure</span>
        </div>
      </div>
    </aside>
  )
}
