import { useNavigate } from 'react-router-dom'
import { HiOutlineUser, HiOutlineShieldCheck, HiOutlineKey, HiOutlineDesktopComputer, HiOutlineLogout } from 'react-icons/hi'
import { useApp } from '../contexts/AppContext'

export default function Profile() {
  const navigate = useNavigate()
  const { addToast, setIsAuthenticated } = useApp()

  const handleLogout = () => {
    setIsAuthenticated(false)
    addToast('Successfully safely logged out of FedCare. Encrypted session closed.', 'success')
    navigate('/login')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>👤 User Profile</h1>
          <p>Manage your identity and authentication</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{
                width: '100px', height: '100px',
                borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '3rem', fontWeight: 800, color: 'white',
                marginBottom: '20px',
                boxShadow: '0 10px 25px rgba(102, 126, 234, 0.4)'
            }}>
                FA
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '4px', color: 'var(--color-text-bright)' }}>
                FedCare Admin
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>admin@fedcare.ai</p>
            
            <div className="badge badge-active" style={{ marginBottom: '32px', fontSize: '0.85rem', padding: '6px 16px' }}>
                <HiOutlineShieldCheck /> Active
            </div>

            <button onClick={handleLogout} className="btn btn-danger" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <HiOutlineLogout size={18} /> Secure Log Out
            </button>
        </div>

        <div>
            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="section-header">
                    <h3>Network Identity</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Role</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                            <HiOutlineUser className="input-icon" style={{ position: 'relative', left: 0 }} /> Super Administrator
                        </div>
                    </div>
                    <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Node ID</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace', color: 'var(--color-accent-blue)' }}>
                            <HiOutlineDesktopComputer style={{ position: 'relative', left: 0 }} /> 0x9A3B...421F
                        </div>
                    </div>
                </div>
            </div>

            <div className="metric-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div className="metric-icon green" style={{ width: '40px', height: '40px', fontSize: '1.2rem', marginBottom: 0 }}>
                        <HiOutlineKey />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-bright)' }}>Encryption Keys</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-accent-green)' }}>Synchronized & Secure</div>
                    </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    Your local node strictly utilizes Homomorphic Encryption to preserve data privacy. Keys rotate automatically every 24 hours.
                </p>
            </div>
        </div>
      </div>
    </div>
  )
}
