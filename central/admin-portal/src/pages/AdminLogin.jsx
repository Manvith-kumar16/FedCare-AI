import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'
import { useApp } from '../contexts/AppContext'
import { HiLockClosed } from 'react-icons/hi'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { handleLoginSuccess, addToast } = useApp()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await login(email, password)
      const data = res.data
      
      if (data.user.role !== 'ADMIN') {
        addToast('Access Denied: Only Administrator accounts are permitted access to this portal.', 'error')
        return
      }

      handleLoginSuccess(data)
      localStorage.setItem('fedcare_admin_token', data.access_token)
      addToast(`Welcome back, ${data.user.name}! Session authenticated securely.`, 'success')
      navigate('/')
    } catch (err) {
      let msg = 'Authentication failed. Please check credentials.'
      if (err.response?.data?.detail) {
        msg = typeof err.response.data.detail === 'string' 
          ? err.response.data.detail 
          : JSON.stringify(err.response.data.detail)
      }
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--color-bg-primary)'
    }}>
      <div className="login-card glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '40px', borderRadius: '16px', background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(91, 101, 220, 0.2)' }}>
        <div className="text-center" style={{ marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px auto', boxShadow: '0 8px 24px rgba(91, 101, 220, 0.2)'
          }}>
            <HiLockClosed size={30} style={{ color: '#fff' }} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>Central Admin</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '6px' }}>Collaborative Federated Health Network</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="input-group" style={{ margin: 0 }}>
            <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Administrator Email</label>
            <input
              type="email"
              placeholder="admin@fedcare.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                background: 'rgba(250, 250, 253, 0.8)', border: '1px solid rgba(91, 101, 220, 0.15)',
                color: 'var(--color-text-primary)', outline: 'none'
              }}
              required
            />
          </div>

          <div className="input-group" style={{ margin: 0 }}>
            <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Security Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                background: 'rgba(250, 250, 253, 0.8)', border: '1px solid rgba(91, 101, 220, 0.15)',
                color: 'var(--color-text-primary)', outline: 'none'
              }}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: '8px',
              fontWeight: 700, fontSize: '0.95rem', background: 'var(--color-accent-blue)',
              color: '#fff', border: 'none', cursor: 'pointer',
              display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}
          >
            {loading ? <span className="spinner-small" style={{ borderColor: '#fff' }}></span> : 'Authenticate Admin Session'}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
             <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                Are you a patient? <span onClick={() => navigate('/login')} style={{ color: 'var(--color-accent-blue)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>Patient Portal</span>
             </p>
          </div>
        </form>
      </div>
    </div>
  )
}
