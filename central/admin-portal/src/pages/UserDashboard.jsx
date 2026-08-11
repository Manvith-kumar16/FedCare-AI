import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getServers } from '../api'
import { useApp } from '../contexts/AppContext'
import { HiOutlineServer, HiOutlineChevronRight } from 'react-icons/hi'
import Loader from '../components/Loader'

export default function UserDashboard() {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useApp()
  const navigate = useNavigate()

  useEffect(() => {
    fetchServers()
  }, [])

  const fetchServers = async () => {
    try {
      const res = await getServers()
      setServers(res.data)
    } catch (err) {
      addToast('Failed to load disease models', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loader />

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>Patient Prediction Portal</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>Select a disease model below to run a secure prediction using our highly-accurate Global AI.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {servers.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1' }}>
            <p style={{ color: 'var(--color-text-secondary)' }}>No global models are currently available.</p>
          </div>
        ) : (
          servers.map(server => (
            <div 
              key={server.id} 
              className="glass-panel" 
              style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '16px', transition: 'all 0.3s ease' }}
              onClick={() => navigate(`/predict/${server.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)'
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(91, 101, 220, 0.15)'
                e.currentTarget.style.border = '1px solid rgba(91, 101, 220, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(91, 101, 220, 0.08)'
                e.currentTarget.style.border = '1px solid rgba(91, 101, 220, 0.15)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '10px', background: 'rgba(91, 101, 220, 0.1)', borderRadius: '10px', color: 'var(--color-accent-blue)' }}>
                    <HiOutlineServer size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{server.name}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>{server.disease_type}</span>
                  </div>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {server.description || 'No description provided.'}
              </p>

              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-accent-blue)' }}>Start Prediction</span>
                <HiOutlineChevronRight style={{ color: 'var(--color-accent-blue)' }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
