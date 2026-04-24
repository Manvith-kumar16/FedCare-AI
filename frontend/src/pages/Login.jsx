import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiOutlineOfficeBuilding, HiOutlineShieldCheck, HiOutlineMail, HiOutlineLockClosed, HiOutlineUser, HiOutlineLocationMarker } from 'react-icons/hi'
import { useApp } from '../contexts/AppContext'
import api from '../api'
import './Login.css'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' or 'signup'
  const [role, setRole] = useState('HOSPITAL') // 'HOSPITAL' or 'ADMIN'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    hospital_name: '',
    location: ''
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { addToast, handleLoginSuccess } = useApp()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'login') {
        const response = await api.login({
          email: formData.email,
          password: formData.password
        })
        handleLoginSuccess(response.data)
        addToast(`Welcome back, ${response.data.user.name}!`, 'success')
      } else {
        // Sign Up
        const regData = {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: role,
          hospital_name: role === 'HOSPITAL' ? formData.hospital_name : undefined,
          location: role === 'HOSPITAL' ? formData.location : undefined
        }
        await api.register(regData)
        addToast('Registration successful! Please sign in.', 'success')
        setMode('login')
      }
      if (mode === 'login') navigate('/')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Authentication failed'
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      {/* Background Orbs */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">F</div>
          <h2>{mode === 'login' ? 'Welcome to FedCare AI' : 'Create Your Account'}</h2>
          <p>{mode === 'login' ? 'Privacy-Preserving Healthcare Intelligence' : 'Join the federated healthcare network'}</p>
        </div>

        {/* Role Toggle for Sign Up */}
        {mode === 'signup' && (
          <div className="role-toggle">
            <button
              className={`toggle-btn ${role === 'HOSPITAL' ? 'active' : ''}`}
              onClick={() => setRole('HOSPITAL')}
              type="button"
            >
              <HiOutlineOfficeBuilding className="toggle-icon" />
              Hospital
            </button>
            <button
              className={`toggle-btn ${role === 'ADMIN' ? 'active' : ''}`}
              onClick={() => setRole('ADMIN')}
              type="button"
            >
              <HiOutlineShieldCheck className="toggle-icon" />
              Admin
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'signup' && (
            <div className="input-group slide-down">
              <label>Full Name</label>
              <div className="input-field">
                <HiOutlineUser className="input-icon" />
                <input
                  type="text"
                  name="name"
                  placeholder="Dr. Sarah Johnson"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          )}

          <div className="input-group slide-down">
            <label>Email Address</label>
            <div className="input-field">
              <HiOutlineMail className="input-icon" />
              <input
                type="email"
                name="email"
                placeholder="email@organization.org"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="input-group slide-down">
            <label>Password</label>
            <div className="input-field">
              <HiOutlineLockClosed className="input-icon" />
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {mode === 'signup' && role === 'HOSPITAL' && (
            <>
              <div className="input-group slide-down">
                <label>Hospital Name</label>
                <div className="input-field">
                  <HiOutlineOfficeBuilding className="input-icon" />
                  <input
                    type="text"
                    name="hospital_name"
                    placeholder="General Medical Center"
                    value={formData.hospital_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="input-group slide-down">
                <label>Location</label>
                <div className="input-field">
                  <HiOutlineLocationMarker className="input-icon" />
                  <input
                    type="text"
                    name="location"
                    placeholder="New York, NY"
                    value={formData.location}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <button type="submit" className="login-btn slide-down" disabled={loading}>
            {loading ? <span className="spinner-small"></span> : (mode === 'login' ? 'Secure Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <span 
              className="mode-toggle-link" 
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </span>
          </p>
          <p style={{ marginTop: '12px', fontSize: '0.7rem', opacity: 0.7 }}>
            Protected by end-to-end homomorphic encryption
          </p>
        </div>
      </div>
    </div>
  )
}
