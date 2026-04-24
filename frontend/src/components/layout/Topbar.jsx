import { useLocation, Link } from 'react-router-dom'
import { useApp } from '../../contexts/AppContext'
import { HiOutlineShieldCheck, HiOutlineOfficeBuilding } from 'react-icons/hi'

const pageTitles = {
  '/': 'Dashboard',
  '/servers': 'Disease Servers',
  '/datasets': 'Datasets',
  '/training': 'Federated Training',
  '/predictions': 'Predictions',
  '/explainability': 'Explainable AI',
  '/profile': 'User Profile',
}

export default function Topbar() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'FedCare AI'
  const { userName, userRole, hospitalName } = useApp()

  const displayName = userRole === 'HOSPITAL' ? hospitalName : userName
  const displayRole = userRole === 'ADMIN' ? 'FedCare Admin' : 'Hospital Partner'

  return (
    <header className="topbar" id="main-topbar">
      <div className="topbar-left">
        <h2>{title}</h2>
      </div>
      <div className="topbar-right">
        <div className="status-indicator">
          <span className="status-dot"></span>
          <span>System Online</span>
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
            {userRole === 'ADMIN' ? <HiOutlineShieldCheck /> : <HiOutlineOfficeBuilding />}
          </span>
          <span style={{ fontWeight: 600 }}>{displayName || displayRole}</span>
        </Link>
      </div>
    </header>
  )
}

