import { useState, useEffect } from 'react'
import { getHospitals, registerHospital } from '../api'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineOfficeBuilding, HiOutlinePlus, HiOutlineShieldCheck,
  HiOutlineRefresh, HiOutlineMail, HiOutlineLocationMarker,
  HiOutlineUser, HiOutlineLockClosed
} from 'react-icons/hi'
import { FaHospital } from 'react-icons/fa'

export default function Hospitals() {
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    hospitalName: '',
    location: '',
    name: '',
    email: '',
    password: ''
  })
  
  const { addToast } = useApp()

  useEffect(() => {
    loadHospitals()
  }, [])

  async function loadHospitals() {
    try {
      setLoading(true)
      const res = await getHospitals()
      setHospitals(res.data || [])
    } catch (e) {
      addToast('Failed to load registered hospitals list', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setRegistering(true)
    try {
      await registerHospital({
        name: form.name,
        email: form.email,
        password: form.password,
        role: 'HOSPITAL',
        hospital_name: form.hospitalName,
        location: form.location
      })
      
      addToast('Hospital and investigator registered successfully!', 'success')
      setShowForm(false)
      setForm({ hospitalName: '', location: '', name: '', email: '', password: '' })
      await loadHospitals()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed'
      addToast(msg, 'error')
    } finally {
      setRegistering(false)
    }
  }

  if (loading && !showForm) {
    return (
      <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
        <div style={{ height: '100px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ height: '400px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
      </div>
    )
  }

  return (
    <div className="hospitals-page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Medical Institutions Registry
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Govern investigator credentials and audit registered hospital nodes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={loadHospitals}
          >
            <HiOutlineRefresh /> Refresh
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowForm(!showForm)}
          >
            <HiOutlinePlus /> {showForm ? 'Cancel Registration' : 'Register New Hospital'}
          </button>
        </div>
      </div>

      {/* Privacy Guarantee Alert */}
      <div style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0, 230, 118, 0.08)', border: '1px solid rgba(0, 230, 118, 0.2)', borderRadius: '12px' }}>
        <HiOutlineShieldCheck size={28} style={{ color: 'var(--color-accent-green)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--color-accent-green)' }}>Privacy Custody Protocol Enforced:</strong> Under no circumstances does the Central Coordinator collect, preview, or cache patient CSV datasets. Patient data resides exclusively within the local hospital boundary.
        </span>
      </div>

      {showForm && (
        <div className="card fade-in" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '24px' }}>Register Hospital Node & Investigator Account</h3>
          <form onSubmit={handleRegister} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Hospital Institution Name</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="e.g. Mayo Clinic"
                value={form.hospitalName}
                onChange={(e) => setForm(prev => ({ ...prev, hospitalName: e.target.value }))}
                required 
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Location / City</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="e.g. Rochester, MN"
                value={form.location}
                onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                required 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Lead Investigator Name</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="e.g. Dr. John Doe"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                required 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Investigator Email</label>
              <input 
                type="email" 
                className="form-input"
                placeholder="investigator@hospital.org"
                value={form.email}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                required 
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
              <label className="form-label">Initial Login Password</label>
              <input 
                type="password" 
                className="form-input"
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                required 
              />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={registering}
              >
                {registering ? 'Processing...' : 'Provision Hospital Node'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Hospitals List */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '24px' }}>Registered Institutions List</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Hospital Name</th>
                <th>Location</th>
                <th>Active Memberships</th>
                <th>Lead Investigator</th>
                <th>Node ID Hash</th>
                <th>Registered Date</th>
              </tr>
            </thead>
            <tbody>
              {hospitals.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>No hospitals registered yet.</td>
                </tr>
              ) : (
                hospitals.map(h => (
                  <tr key={h.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600 }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(91, 101, 220, 0.1)', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FaHospital size={14} />
                        </div>
                        {h.name}
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)' }}>
                        <HiOutlineLocationMarker size={16} />
                        {h.location}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-training" style={{ padding: '6px 12px' }}>{h.membership_count} active servers</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{h.name} Principal</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <HiOutlineMail size={12} /> User ID: #{h.user_id}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>
                      0x{h.user_id}A8FD...{(h.name || '').substring(0, 3).toUpperCase()}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)' }}>
                      {h.created_at ? new Date(h.created_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
