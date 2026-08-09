import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getTrainingRounds, getServers } from '../api'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineLightningBolt, HiOutlineRefresh, HiOutlineServer,
  HiOutlineCheckCircle, HiOutlineClock, HiOutlineExclamationCircle 
} from 'react-icons/hi'

export default function Rounds() {
  const [rounds, setRounds] = useState([])
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useApp()

  useEffect(() => {
    loadRounds()
  }, [])

  async function loadRounds() {
    try {
      setLoading(true)
      const [roundsRes, serversRes] = await Promise.all([
        getTrainingRounds().catch(() => ({ data: [] })),
        getServers().catch(() => ({ data: [] }))
      ])

      setRounds(roundsRes.data || [])
      setServers(serversRes.data || [])
    } catch (e) {
      addToast('Failed to load training rounds registry', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
        <div style={{ height: '100px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ height: '400px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
      </div>
    )
  }

  return (
    <div className="rounds-page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Federated Orchestration Rounds
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Audit system-wide federated aggregation checkpoints and client participation logs.
          </p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={loadRounds}
        >
          <HiOutlineRefresh size={18} /> Refresh Log
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
        
        {/* Left Column: Timeline List */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '24px' }}>
            Clinical Aggregation Log ({rounds.length} rounds)
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {rounds.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                No orchestration rounds logged yet.
              </div>
            ) : (
              rounds.map((r, index) => {
                const srv = servers.find(s => s.id === r.server_id)
                const isCompleted = r.status === 'COMPLETED'
                return (
                  <div key={r.id} style={{ display: 'flex', gap: '16px' }}>
                    {/* Timeline Line & Icon */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ 
                        width: '36px', height: '36px', borderRadius: '50%', 
                        background: isCompleted ? 'rgba(0, 230, 118, 0.1)' : 'rgba(102, 126, 234, 0.1)', 
                        color: isCompleted ? 'var(--color-accent-green)' : 'var(--color-accent-blue)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {isCompleted ? <HiOutlineCheckCircle size={20} /> : <HiOutlineLightningBolt size={20} />}
                      </div>
                      {index !== rounds.length - 1 && (
                        <div style={{ width: '2px', flex: 1, background: 'var(--color-border)', margin: '8px 0' }} />
                      )}
                    </div>
                    
                    {/* Event Content */}
                    <div style={{ flex: 1, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px', marginBottom: index !== rounds.length - 1 ? '0' : '0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Round {r.round_number} <span style={{ color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.85rem' }}>#{r.id}</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-accent-blue)', fontWeight: 600, marginTop: '4px' }}>
                            {srv ? srv.name : `Server #${r.server_id}`}
                          </div>
                        </div>
                        <span className={`badge ${isCompleted ? 'badge-active' : 'badge-training'}`} style={{ padding: '6px 12px' }}>
                          {r.status}
                        </span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Participation</div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                            {r.successful_clients} / {r.expected_clients} Nodes
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Global Accuracy</div>
                          <div style={{ fontSize: '0.9rem', color: isCompleted ? 'var(--color-accent-green)' : 'var(--color-text-primary)', fontWeight: 600 }}>
                            {r.global_accuracy > 0 ? (r.global_accuracy * 100).toFixed(1) + '%' : 'Pending...'}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '16px', fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <HiOutlineClock />
                        {r.completed_at ? `Completed at ${new Date(r.completed_at).toLocaleString()}` : 'Currently orchestrating...'}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Server Pipelines Links */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>Start / Coordinate</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
            Select one of the approved active servers below to navigate to its details workspace and trigger rounds.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {servers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>No coordinated servers configured yet.</div>
            ) : (
              servers.map(srv => (
                <div key={srv.id} style={{ padding: '16px', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)', marginBottom: '4px' }}>{srv.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                      Round: {srv.current_round} / {srv.num_rounds}
                    </span>
                  </div>
                  <Link to={`/servers/${srv.id}`} className="btn btn-primary btn-sm">
                    Open Server
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
