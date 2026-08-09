import { useLocation, Link } from 'react-router-dom'
import { useApp } from '../../contexts/AppContext'
import { HiOutlineBell } from 'react-icons/hi'

const pageMap = {
  '/': { section: 'Overview', title: 'Dashboard' },
  '/hospitals': { section: 'Network Control', title: 'Hospitals' },
  '/servers': { section: 'Network Control', title: 'Federated Servers' },
  '/rounds': { section: 'Network Control', title: 'Training Rounds' },
  '/models': { section: 'AI & Analytics', title: 'Global Models' },
  '/metrics': { section: 'AI & Analytics', title: 'Evaluation Metrics' },
  '/explainability': { section: 'AI & Analytics', title: 'Explainable AI' },
  '/history': { section: 'AI & Analytics', title: 'Training History' },
  '/profile': { section: 'Account', title: 'Administrator Profile' },
}

export default function Topbar() {
  const location = useLocation()
  const pageInfo = pageMap[location.pathname] || { section: 'System', title: 'FedCare Admin' }
  const { userName, userRole } = useApp()

  const displayName = userName || 'Manvith Kumar'
  const displayRole = userRole === 'ADMIN' ? 'Administrator' : 'Administrator'

  return (
    <header className="topbar" id="main-topbar">
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>FedCare</span>
        <span style={{ color: 'var(--color-text-muted)' }}>/</span>
        <span style={{ color: 'var(--color-text-secondary)' }}>{pageInfo.section}</span>
        <span style={{ color: 'var(--color-text-muted)' }}>/</span>
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{pageInfo.title}</span>
      </div>
      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div className="status-indicator">
          <span className="status-dot"></span>
          <span style={{ fontWeight: 500 }}>System Online</span>
        </div>
        
        <div style={{ color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <HiOutlineBell size={22} />
        </div>

        <Link to="/profile" style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          textDecoration: 'none', cursor: 'pointer',
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>{displayName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{displayRole}</div>
          </div>
          <div style={{ 
            width: '36px', height: '36px', borderRadius: '50%', 
            background: 'var(--color-bg-secondary)', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', 
            color: 'var(--color-accent-blue)', fontWeight: 700, fontSize: '0.9rem' 
          }}>
            {displayName.charAt(0)}
          </div>
        </Link>
      </div>
    </header>
  )
}
