import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiOutlineOfficeBuilding, HiOutlineShieldCheck, HiOutlineMail, HiOutlineLockClosed, HiOutlineUser, HiOutlineLocationMarker } from 'react-icons/hi'
import { useApp } from '../contexts/AppContext'
import api from '../api'
import './Login.css'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' or 'signup'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    hospital_name: '',
    location: ''
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { addToast, handleLoginSuccess, logout } = useApp()

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
        
        // Ensure user is HOSPITAL role
        if (response.data.user.role !== 'HOSPITAL') {
          logout()
          addToast('Access denied: Only Hospital Investigators can access this portal.', 'error')
          setLoading(false)
          return
        }

        handleLoginSuccess(response.data)
        addToast(`Welcome back, ${response.data.user.name}!`, 'success')
        navigate('/')
      } else {
        // Sign Up
        const regData = {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: 'HOSPITAL',
          hospital_name: formData.hospital_name,
          location: formData.location
        }
        await api.register(regData)
        addToast('Registration submitted successfully! Please sign in.', 'success')
        setMode('login')
      }
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
          <div className="logo-icon">H</div>
          <h2>{mode === 'login' ? 'Hospital Node Sign In' : 'Register Hospital Node'}</h2>
          <p>{mode === 'login' ? 'Local Preprocessing & Federated AI Gateway' : 'Register this local node with the coordinator'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'signup' && (
            <div className="input-group slide-down">
              <label>Investigator Full Name</label>
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
            <label>Investigator Email Address</label>
            <div className="input-field">
              <HiOutlineMail className="input-icon" />
              <input
                type="email"
                name="email"
                placeholder="investigator@hospital.org"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="input-group slide-down">
            <label>Secure Password</label>
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

          {mode === 'signup' && (
            <>
              <div className="input-group slide-down">
                <label>Hospital Institution Name</label>
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
                <label>Location / City</label>
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
            {loading ? <span className="spinner-small"></span> : (mode === 'login' ? 'Secure Sign In' : 'Register Node')}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {mode === 'login' ? "Need to register a node? " : "Already registered? "}
            <span 
              className="mode-toggle-link" 
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? 'Register Now' : 'Sign In'}
            </span>
          </p>
          <p style={{ marginTop: '12px', fontSize: '0.7rem', opacity: 0.7 }}>
            Protected under local zero-trust tenant constraints
          </p>
        </div>
      </div>
    </div>
  )
}
