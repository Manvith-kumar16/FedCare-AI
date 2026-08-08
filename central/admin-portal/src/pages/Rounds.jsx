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
    return <div className="loader"><div className="spinner"></div></div>
  }

  return (
    <div className="rounds-page fade-in">
      <div className="page-header">
        <div>
          <h2>Federated Orchestration Rounds</h2>
          <p>Audit system-wide federated aggregation checkpoints and client participation logs.</p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={loadRounds}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <HiOutlineRefresh /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginTop: '20px' }}>
        {/* Left Column: Rounds List */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3>Coordination Log ({rounds.length} rounds)</h3>
          <div className="table-responsive" style={{ marginTop: '16px' }}>
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>Round ID</th>
                  <th>Server Name</th>
                  <th>Round Number</th>
                  <th>Participants Ratio</th>
                  <th>Global Accuracy</th>
                  <th>Aggregation Status</th>
                  <th>Ended At</th>
                </tr>
              </thead>
              <tbody>
                {rounds.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center">No orchestration rounds logged yet.</td>
                  </tr>
                ) : (
                  rounds.map(r => {
                    const srv = servers.find(s => s.id === r.server_id)
                    return (
                      <tr key={r.id}>
                        <td>#{r.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{srv ? srv.name : `Server #${r.server_id}`}</div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{srv?.disease_type}</div>
                        </td>
                        <td>Round {r.round_number}</td>
                        <td>
                          <strong>{r.successful_clients}</strong> / {r.expected_clients} nodes
                        </td>
                        <td style={{ fontWeight: 700, color: '#34d399' }}>
                          {r.global_accuracy > 0 ? (r.global_accuracy * 100).toFixed(1) + '%' : 'N/A'}
                        </td>
                        <td>
                          <span className={`badge ${r.status === 'COMPLETED' ? 'badge-active' : r.status === 'ACTIVE' ? 'badge-error' : 'badge-secondary'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ opacity: 0.7 }}>
                          {r.completed_at ? new Date(r.completed_at).toLocaleString() : 'Active...'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Server Pipelines Links */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3>Start / Coordinate Rounds</h3>
          <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '4px', marginBottom: '16px' }}>
            Select one of the approved active servers below to navigate to its details workspace and trigger rounds.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {servers.length === 0 ? (
              <div className="empty-state">No coordinated servers configured yet.</div>
            ) : (
              servers.map(srv => (
                <div key={srv.id} style={{ padding: '14px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '0.9rem' }}>{srv.name}</h4>
                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Round: {srv.current_round} / {srv.num_rounds} • {srv.model_type?.toUpperCase()}</span>
                  </div>
                  <Link to={`/servers/${srv.id}`} className="btn-small btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
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
