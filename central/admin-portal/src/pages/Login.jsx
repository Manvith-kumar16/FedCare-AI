import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'
import { useApp } from '../contexts/AppContext'
import { HiLockClosed } from 'react-icons/hi'

export default function Login() {
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
      // Save token specifically for admin
      localStorage.setItem('fedcare_admin_token', data.access_token)
      addToast('Welcome back, Admin! Session authenticated securely.', 'success')
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Authentication failed. Please check credentials.'
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'radial-gradient(circle at center, #0a1128 0%, #060b18 100%)'
    }}>
      <div className="login-card glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '40px', borderRadius: '16px' }}>
        <div className="text-center" style={{ marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #00d2ff 0%, #00d2ff22 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px auto', boxShadow: '0 8px 24px rgba(0,210,255,0.2)'
          }}>
            <HiLockClosed size={30} style={{ color: '#00d2ff' }} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>Central Admin</h2>
          <p style={{ fontSize: '0.875rem', opacity: 0.6, marginTop: '6px' }}>Collaborative Federated Health Network</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="input-group" style={{ margin: 0 }}>
            <label style={{ color: '#9ea7c0', fontSize: '0.8rem', fontWeight: 600 }}>Administrator Email</label>
            <input
              type="email"
              placeholder="admin@fedcare.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', outline: 'none'
              }}
              required
            />
          </div>

          <div className="input-group" style={{ margin: 0 }}>
            <label style={{ color: '#9ea7c0', fontSize: '0.8rem', fontWeight: 600 }}>Security Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', outline: 'none'
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
              fontWeight: 700, fontSize: '0.95rem', background: '#00d2ff',
              color: '#060b18', border: 'none', cursor: 'pointer',
              display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}
          >
            {loading ? <span className="spinner-small" style={{ borderColor: '#060b18' }}></span> : 'Authenticate Admin Session'}
          </button>
        </form>
      </div>
    </div>
  )
}
