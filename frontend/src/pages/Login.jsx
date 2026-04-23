import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiOutlineOfficeBuilding, HiOutlineShieldCheck, HiOutlineMail, HiOutlineLockClosed } from 'react-icons/hi'
import { useApp } from '../contexts/AppContext'
import './Login.css'

export default function Login() {
  const [role, setRole] = useState('hospital') // 'hospital' or 'admin'
  const [formData, setFormData] = useState({
    hospitalName: '',
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { addToast, setIsAuthenticated, setUserRole } = useApp()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleLogin = (e) => {
    e.preventDefault()
    setLoading(true)

    // Simulate authentication
    setTimeout(() => {
      setLoading(false)
      setIsAuthenticated(true)
      setUserRole(role)
      addToast(`Successfully logged in as ${role === 'hospital' ? 'Hospital' : 'Admin'}`, 'success')
      navigate('/')
    }, 1500)
  }

  return (
    <div className="login-container">
      {/* Background Orbs */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">
            F
          </div>
          <h2>Welcome to FedCare AI</h2>
          <p>Privacy-Preserving Healthcare Intelligence</p>
        </div>

        {/* Role Toggle */}
        <div className="role-toggle">
          <button
            className={`toggle-btn ${role === 'hospital' ? 'active' : ''}`}
            onClick={() => setRole('hospital')}
            type="button"
          >
            <HiOutlineOfficeBuilding className="toggle-icon" />
            Hospital
          </button>
          <button
            className={`toggle-btn ${role === 'admin' ? 'active' : ''}`}
            onClick={() => setRole('admin')}
            type="button"
          >
            <HiOutlineShieldCheck className="toggle-icon" />
            Admin
          </button>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {role === 'hospital' && (
            <div className="input-group slide-down">
              <label>Hospital Name</label>
              <div className="input-field">
                <HiOutlineOfficeBuilding className="input-icon" />
                <input
                  type="text"
                  name="hospitalName"
                  placeholder="e.g. Mount Sinai Medical"
                  value={formData.hospitalName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          )}

          <div className="input-group slide-down" style={{ animationDelay: '0.1s' }}>
            <label>Email Address</label>
            <div className="input-field">
              <HiOutlineMail className="input-icon" />
              <input
                type="email"
                name="email"
                placeholder="admin@hospital.org"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="input-group slide-down" style={{ animationDelay: '0.2s' }}>
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

          <button type="submit" className="login-btn slide-down" style={{ animationDelay: '0.3s' }} disabled={loading}>
            {loading ? <span className="spinner-small"></span> : 'Secure Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>Protected by end-to-end homomorphic encryption</p>
        </div>
      </div>
    </div>
  )
}
