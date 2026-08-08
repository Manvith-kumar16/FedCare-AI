import { useNavigate } from 'react-router-dom'
import { HiOutlineUser, HiOutlineShieldCheck, HiOutlineKey, HiOutlineDesktopComputer, HiOutlineLogout } from 'react-icons/hi'
import { useApp } from '../contexts/AppContext'

export default function Profile() {
  const navigate = useNavigate()
  const { addToast, logout, userName, userEmail, userRole } = useApp()

  const handleLogout = () => {
    logout()
    addToast('Successfully safely logged out of Central Coordinator. Session cleared.', 'success')
    navigate('/login')
  }

  const initials = userName ? userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AD'

  return (
    <div className="profile-page fade-in">
      <div className="page-header">
        <div>
          <h2>Administrator Session profile</h2>
          <p>Review credentials and control access sessions.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px', marginTop: '20px' }}>
        {/* Left Card: Info & Logout */}
        <div className="glass-panel text-center" style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '96px', height: '96px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #00d2ff 0%, #764ba2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem', fontWeight: 800, color: '#fff',
            marginBottom: '20px', boxShadow: '0 8px 24px rgba(118,75,162,0.3)',
            textTransform: 'uppercase'
          }}>
            {initials}
          </div>

          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>{userName || 'FedCare Admin'}</h3>
          <p style={{ opacity: 0.6, fontSize: '0.85rem', marginTop: '4px', marginBottom: '20px' }}>{userEmail}</p>

          <span className="badge badge-active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 16px', marginBottom: '32px' }}>
            <HiOutlineShieldCheck /> Active Session
          </span>

          <button 
            className="btn btn-danger" 
            onClick={handleLogout}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '12px' }}
          >
            <HiOutlineLogout /> Secure Session Logout
          </button>
        </div>

        {/* Right Card: Security Audit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3>Administrative Context</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', fontSize: '0.85rem' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <div style={{ opacity: 0.6, fontSize: '0.75rem', marginBottom: '4px' }}>Role</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  <HiOutlineShieldCheck style={{ color: '#00d2ff' }} /> {userRole?.toUpperCase()}
                </div>
              </div>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <div style={{ opacity: 0.6, fontSize: '0.75rem', marginBottom: '4px' }}>Scope</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  <HiOutlineDesktopComputer style={{ color: '#00d2ff' }} /> Full Network Governance & Auditing
                </div>
              </div>
              <div>
                <div style={{ opacity: 0.6, fontSize: '0.75rem', marginBottom: '4px' }}>Authority Level</div>
                <div style={{ fontFamily: 'monospace', color: '#00d2ff' }}>
                  Root Access Level (Tier 1 Coordinator)
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ width: '40px', height: '40px', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', flexShrink: 0 }}>
              <HiOutlineKey size={20} />
            </div>
            <div>
              <h4 style={{ fontWeight: 600, color: '#fff' }}>Coordinator Keys Status</h4>
              <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '4px', lineHeight: 1.4 }}>
                Global models are signed centrally. Private weights from hospitals are protected by homomorphic algorithms and model update verification checks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
