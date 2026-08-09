import { NavLink } from 'react-router-dom'
import {
  HiOutlineViewGrid, HiOutlineOfficeBuilding, HiOutlineServer,
  HiOutlineLightningBolt, HiOutlineGlobe, HiOutlineTrendingUp,
  HiOutlineEye, HiOutlineClock, HiOutlineUser, HiOutlineShieldCheck
} from 'react-icons/hi'
import { FaHeartbeat } from 'react-icons/fa'
import { Player } from '@lottiefiles/react-lottie-player'

const navItems = [
  { path: '/', label: 'Dashboard', icon: <Player autoplay loop src="/lottie/Dynamic Dashboard Icon.json" style={{ height: '24px', width: '24px', transform: 'scale(2.5)' }} />, section: 'overview' },
  { path: '/hospitals', label: 'Hospitals', icon: <Player autoplay loop src="/lottie/Hospital.json" style={{ height: '24px', width: '24px', transform: 'scale(1.4)' }} />, section: 'network' },
  { path: '/servers', label: 'Federated Servers', icon: <Player autoplay loop src="/lottie/Running Server.json" style={{ height: '24px', width: '24px', transform: 'scale(1.5)' }} />, section: 'network' },
  { path: '/rounds', label: 'Training Rounds', icon: <Player autoplay loop src="/lottie/ai.json" style={{ height: '24px', width: '24px', transform: 'scale(1.5)' }} />, section: 'network' },
  { path: '/models', label: 'Global Models', icon: <Player autoplay loop src="/lottie/Globe on mobile.json" style={{ height: '24px', width: '24px', transform: 'scale(1.5)' }} />, section: 'analytics' },
  { path: '/metrics', label: 'Evaluation Metrics', icon: <Player autoplay loop src="/lottie/VS- Data and Measure.json" style={{ height: '24px', width: '24px', transform: 'scale(1.5)' }} />, section: 'analytics' },
  { path: '/explainability', label: 'Explainable AI', icon: <Player autoplay loop src="/lottie/E V E.json" style={{ height: '24px', width: '24px', transform: 'scale(1.9)' }} />, section: 'analytics' },
  { path: '/history', label: 'Training History', icon: <Player autoplay loop src="/lottie/History.json" style={{ height: '24px', width: '24px', transform: 'scale(1.5)' }} />, section: 'analytics' },
  { path: '/profile', label: 'Administrator Profile', icon: <Player autoplay loop src="/lottie/Profile Avatar of Young Boy.json" style={{ height: '24px', width: '24px', transform: 'scale(2.5)' }} />, section: 'account' },
]

export default function Sidebar() {
  const sections = {
    overview: 'Overview',
    network: 'Network',
    analytics: 'AI & Analytics',
    account: 'Account'
  }

  let currentSection = null

  return (
    <aside className="sidebar" id="main-sidebar">
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <FaHeartbeat size={22} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>FedCare</h1>
          <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Healthcare AI Platform</p>
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
          <span>Coordinator Node</span>
        </div>
      </div>
    </aside>
  )
}
