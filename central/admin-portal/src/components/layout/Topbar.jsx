import { useLocation, Link } from 'react-router-dom'
import { useApp } from '../../contexts/AppContext'
import { HiOutlineShieldCheck } from 'react-icons/hi'

const pageTitles = {
  '/': 'Admin Dashboard',
  '/hospitals': 'Hospitals Registry',
  '/servers': 'Federated Servers',
  '/rounds': 'Training Rounds Control',
  '/models': 'Global Models',
  '/metrics': 'Evaluation Metrics',
  '/explainability': 'Global Explainable AI',
  '/history': 'System Training History',
  '/profile': 'User Profile',
}

export default function Topbar() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'FedCare Admin'
  const { userName, userRole } = useApp()

  const displayName = userName || 'FedCare Admin'
  const displayRole = userRole === 'ADMIN' ? 'Administrator' : 'User'

  return (
    <header className="topbar" id="main-topbar">
      <div className="topbar-left">
        <h2>{title}</h2>
      </div>
      <div className="topbar-right">
        <div className="status-indicator">
          <span className="status-dot"></span>
          <span>Coordinator Active</span>
        </div>
        <Link to="/profile" style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 14px',
          background: 'rgba(102, 126, 234, 0.1)',
          borderRadius: '8px',
          fontSize: '0.8125rem',
          color: 'var(--color-text-secondary)',
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }} onMouseOver={e => e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)'}>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '1rem', color: 'var(--color-accent-blue)' }}>
            <HiOutlineShieldCheck />
          </span>
          <span style={{ fontWeight: 600 }}>{displayName} ({displayRole})</span>
        </Link>
      </div>
    </header>
  )
}
