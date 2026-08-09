import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getServers, joinServer } from '../api'
import Loader from '../components/Loader'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineServer, HiOutlineRefresh, HiOutlineCheckCircle, 
  HiOutlineUserGroup, HiOutlineClock, HiOutlineChevronRight,
  HiOutlineOfficeBuilding
} from 'react-icons/hi'

export default function Servers() {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [joiningServerId, setJoiningServerId] = useState(null)
  const { addToast } = useApp()

  useEffect(() => {
    loadServers()
  }, [])

  async function loadServers() {
    try {
      setLoading(true)
      const res = await getServers()
      setServers(res.data || [])
    } catch (e) {
      addToast('Failed to load disease servers list', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinServer = async (serverId) => {
    setJoiningServerId(serverId)
    try {
      await joinServer({ server_id: serverId })
      addToast('Join request submitted successfully!', 'success')
      await loadServers() // Reload status
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to submit join request'
      addToast(msg, 'error')
    } finally {
      setJoiningServerId(null)
    }
  }

  if (loading) {
    return <Loader message="Discovering federated networks..." />
  }

  const joinedServers = servers.filter(s => s.is_member && s.member_status === 'APPROVED')
  const pendingServers = servers.filter(s => s.is_member && s.member_status === 'PENDING')
  const availableServers = servers.filter(s => !s.is_member)

  return (
    <div className="servers-page fade-in">
      <div className="page-header">
        <div>
          <h2>Disease Coordination Networks</h2>
          <p>Explore coordinating machine learning networks and register this node to participate in collaborative training.</p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={loadServers}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <HiOutlineRefresh /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginTop: '20px' }}>
        {/* Left Column: Joined Networks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3>Joined Networks ({joinedServers.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              {joinedServers.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 0' }}>
                  No approved memberships. Join one of the available networks on the right to start training.
                </div>
              ) : (
                joinedServers.map(srv => (
                  <div key={srv.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HiOutlineServer style={{ color: '#38bdf8' }} size={20} />
                        <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>{srv.name}</h4>
                      </div>
                      <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '4px' }}>{srv.description}</p>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.75rem' }}>
                        <span>Target Column: <strong>{srv.target_column}</strong></span>
                        <span>Model: <strong>{srv.model_type?.toUpperCase()}</strong></span>
                        <span>Rounds: <strong>{srv.current_round} / {srv.num_rounds}</strong></span>
                      </div>
                    </div>
                    <Link to={`/servers/${srv.id}`} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Manage Node <HiOutlineChevronRight />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Memberships */}
          {pendingServers.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3>Awaiting Registration Approval ({pendingServers.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {pendingServers.map(srv => (
                  <div key={srv.id} style={{ padding: '14px', background: 'rgba(251, 191, 36, 0.02)', border: '1px solid rgba(251, 191, 36, 0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{srv.name}</h4>
                      <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Targeting {srv.disease_type} using {srv.model_type?.toUpperCase()}</span>
                    </div>
                    <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <HiOutlineClock /> Awaiting Central Approval
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Available Networks */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3>Available Networks ({availableServers.length})</h3>
          <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '4px', marginBottom: '16px' }}>
            Register your local node to participate in these collaborative disease prediction pipelines.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {availableServers.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                No further available networks on the coordinator.
              </div>
            ) : (
              availableServers.map(srv => (
                <div key={srv.id} style={{ padding: '14px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                  <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{srv.name}</h4>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '2px' }}>{srv.disease_type} Predictor ({srv.model_type?.toUpperCase()})</div>
                  <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: '8px 0' }}>{srv.description}</p>
                  
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handleJoinServer(srv.id)}
                    disabled={joiningServerId === srv.id}
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', marginTop: '8px' }}
                  >
                    {joiningServerId === srv.id ? (
                      <span className="spinner-small"></span>
                    ) : (
                      <>
                        <HiOutlineOfficeBuilding /> Register Node to Join
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
