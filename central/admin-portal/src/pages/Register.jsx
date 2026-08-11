import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register, login } from '../api'
import { useApp } from '../contexts/AppContext'
import { HiUserAdd } from 'react-icons/hi'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { handleLoginSuccess, addToast } = useApp()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // 1. Register with role PUBLIC_USER
      await register({
        name,
        email,
        password,
        role: 'PUBLIC_USER'
      })
      
      // 2. Automatically login after successful registration
      const loginRes = await login(email, password)
      const data = loginRes.data
      
      handleLoginSuccess(data)
      localStorage.setItem('fedcare_admin_token', data.access_token)
      addToast(`Account created! Welcome, ${data.user.name}.`, 'success')
      navigate('/user-dashboard')
    } catch (err) {
      let msg = 'Registration failed. Please try again.'
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
            <HiUserAdd size={30} style={{ color: '#fff' }} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>Create Account</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '6px' }}>Join the FedCare Patient Portal</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="input-group" style={{ margin: 0 }}>
            <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Full Name</label>
            <input
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                background: 'rgba(250, 250, 253, 0.8)', border: '1px solid rgba(91, 101, 220, 0.15)',
                color: 'var(--color-text-primary)', outline: 'none'
              }}
              required
            />
          </div>

          <div className="input-group" style={{ margin: 0 }}>
            <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Email Address</label>
            <input
              type="email"
              placeholder="user@example.com"
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
            <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Password</label>
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
            {loading ? <span className="spinner-small" style={{ borderColor: '#fff' }}></span> : 'Register'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '10px' }}>
             <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                Already have an account? <span onClick={() => navigate('/login')} style={{ color: 'var(--color-accent-blue)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>Sign in</span>
             </p>
          </div>
        </form>
      </div>
    </div>
  )
}
