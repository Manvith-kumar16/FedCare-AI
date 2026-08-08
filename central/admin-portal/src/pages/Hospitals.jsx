import { useState, useEffect } from 'react'
import { getHospitals, registerHospital } from '../api'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineOfficeBuilding, HiOutlinePlus, HiOutlineShieldCheck,
  HiOutlineRefresh, HiOutlineMail, HiOutlineLocationMarker,
  HiOutlineUser, HiOutlineLockClosed
} from 'react-icons/hi'

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
    return <div className="loader"><div className="spinner"></div></div>
  }

  return (
    <div className="hospitals-page fade-in">
      <div className="page-header">
        <div>
          <h2>Medical Institutions Registry</h2>
          <p>Govern investigator credentials and audit registered hospital nodes.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={loadHospitals}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <HiOutlineRefresh /> Refresh
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowForm(!showForm)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <HiOutlinePlus /> {showForm ? 'Cancel Registration' : 'Register New Hospital'}
          </button>
        </div>
      </div>

      {/* Privacy Guarantee Alert */}
      <div className="glass-panel alert-bar alert-success" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <HiOutlineShieldCheck size={28} style={{ color: '#34d399', flexShrink: 0 }} />
        <span style={{ fontSize: '0.85rem', opacity: 0.9, lineHeight: 1.5 }}>
          <strong>Privacy Custody Protocol Enforced:</strong> Under no circumstances does the Central Coordinator collect, preview, or cache patient CSV datasets. Patient data resides exclusively within the local hospital boundary.
        </span>
      </div>

      {showForm && (
        <div className="glass-panel fade-in" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3>Register Hospital Node & Investigator Account</h3>
          <form onSubmit={handleRegister} style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group">
              <label>Hospital Institution Name</label>
              <input 
                type="text" 
                placeholder="e.g. Mayo Clinic"
                value={form.hospitalName}
                onChange={(e) => setForm(prev => ({ ...prev, hospitalName: e.target.value }))}
                style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
                required 
              />
            </div>
            
            <div className="input-group">
              <label>Location / City</label>
              <input 
                type="text" 
                placeholder="e.g. Rochester, MN"
                value={form.location}
                onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
                required 
              />
            </div>

            <div className="input-group">
              <label>Lead Investigator Name</label>
              <input 
                type="text" 
                placeholder="e.g. Dr. John Doe"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
                required 
              />
            </div>

            <div className="input-group">
              <label>Investigator Email</label>
              <input 
                type="email" 
                placeholder="investigator@hospital.org"
                value={form.email}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
                required 
              />
            </div>

            <div className="input-group" style={{ gridColumn: 'span 2' }}>
              <label>Initial Login Password</label>
              <input 
                type="password" 
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
                required 
              />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={registering}
                style={{ padding: '12px 24px' }}
              >
                {registering ? <span className="spinner-small"></span> : 'Provision Hospital Node'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Hospitals List */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3>Registered Institutions List</h3>
        <div className="table-responsive" style={{ marginTop: '16px' }}>
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
                  <td colSpan="6" className="text-center">No hospitals registered yet.</td>
                </tr>
              ) : (
                hospitals.map(h => (
                  <tr key={h.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                        <HiOutlineOfficeBuilding style={{ color: '#00d2ff' }} />
                        {h.name}
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <HiOutlineLocationMarker style={{ opacity: 0.6 }} />
                        {h.location}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-info">{h.membership_count} approved servers</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{h.name} Principal</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <HiOutlineMail size={12} /> User ID: #{h.user_id}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', opacity: 0.6 }}>
                      0x{h.user_id}A8FD...{(h.name || '').substring(0, 3).toUpperCase()}
                    </td>
                    <td style={{ opacity: 0.7 }}>
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
