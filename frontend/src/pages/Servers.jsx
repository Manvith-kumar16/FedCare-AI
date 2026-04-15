import { useState, useEffect } from 'react'
import { getServers, getServerMembers, joinServer, updateMemberStatus } from '../api'
import { useApp } from '../contexts/AppContext'

export default function Servers() {
  const [servers, setServers] = useState([])
  const [selectedServer, setSelectedServer] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const { addToast } = useApp()

  useEffect(() => { loadServers() }, [])

  async function loadServers() {
    try {
      const res = await getServers()
      setServers(res.data)
      if (res.data.length > 0 && !selectedServer) {
        selectServer(res.data[0])
      }
    } catch (e) {
      addToast('Failed to load servers', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function selectServer(server) {
    setSelectedServer(server)
    try {
      const res = await getServerMembers(server.id)
      setMembers(res.data)
    } catch (e) {
      setMembers([])
    }
  }

  async function handleJoin() {
    setActionLoading(true)
    try {
      await joinServer({ server_id: selectedServer.id, hospital_id: 1 })
      addToast('Join request sent! Pending approval.', 'success')
      selectServer(selectedServer)
    } catch (e) {
      addToast(e.response?.data?.detail || 'Failed to join', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleStatusUpdate(memberId, status) {
    setActionLoading(true)
    try {
      await updateMemberStatus(memberId, { status })
      addToast(`Hospital ${status.toLowerCase()}ed successfully`, 'success')
      selectServer(selectedServer)
    } catch (e) {
      addToast('Failed to update status', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const isMember = members.some(m => m.hospital_id === 1)
  const memberRecord = members.find(m => m.hospital_id === 1)

  if (loading) return <div className="loader"><div className="spinner"></div></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🖥️ Disease Servers</h1>
          <p>Manage AI pipelines for different disease predictions</p>
        </div>
      </div>

      <div className="content-grid">
        {/* Server List */}
        <div className="card">
          <div className="section-header">
            <h3>Active Servers</h3>
            <span className="badge badge-active">{servers.length} servers</span>
          </div>
          {servers.map(srv => (
            <div
              key={srv.id}
              onClick={() => selectServer(srv)}
              className={`server-item ${selectedServer?.id === srv.id ? 'active' : ''}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-bright)' }}>{srv.name}</span>
                <span className={`badge badge-${srv.status.toLowerCase()}`}>{srv.status}</span>
              </div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                {srv.description?.slice(0, 100) || `${srv.disease_type} prediction pipeline`}
              </p>
              <div style={{ display: 'flex', gap: '16px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                <span>📊 {srv.model_type}</span>
                <span>🔄 {srv.fl_algorithm}</span>
                <span>🏖️ {srv.member_count} hospitals</span>
              </div>
            </div>
          ))}
        </div>

        {/* Server Details */}
        {selectedServer && (
          <div className="card">
            <div className="section-header">
              <h3>Server Details</h3>
              {!isMember ? (
                <button className="btn btn-primary btn-sm" onClick={handleJoin} disabled={actionLoading}>
                  {actionLoading ? 'Joining...' : '➕ Join Server'}
                </button>
              ) : (
                <span className={`badge badge-${memberRecord?.status.toLowerCase()}`}>
                  Your Status: {memberRecord?.status}
                </span>
              )}
            </div>

            <div className="details-grid">
              {[
                { label: 'Disease Type', value: selectedServer.disease_type, icon: '🦠' },
                { label: 'Input Type', value: selectedServer.input_type, icon: '📋' },
                { label: 'Model', value: selectedServer.model_type, icon: '🤖' },
                { label: 'FL Algorithm', value: selectedServer.fl_algorithm, icon: '🔄' },
                { label: 'Training Rounds', value: `${selectedServer.current_round} / ${selectedServer.num_rounds}`, icon: '🔁' },
                { label: 'Global Accuracy', value: `${(selectedServer.global_accuracy * 100).toFixed(2)}%`, icon: '🎯' },
                { label: 'Target Column', value: selectedServer.target_column, icon: '🎯' },
                { label: 'Datasets', value: selectedServer.dataset_count || 0, icon: '📊' },
              ].map((item, i) => (
                <div key={i} className="detail-item">
                  <div className="detail-label">{item.icon} {item.label}</div>
                  <div className="detail-value">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Members */}
            <div className="section-header" style={{ marginTop: '32px' }}>
              <h4 style={{ color: 'var(--color-text-bright)' }}>🏥 Participating Hospitals</h4>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hospital</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.hospital_name}</td>
                    <td>
                      <span className={`badge badge-${m.status.toLowerCase()}`}>
                        {m.status}
                      </span>
                    </td>
                    <td>
                      {m.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-primary btn-xs" 
                            style={{ padding: '2px 8px', fontSize: '10px' }}
                            onClick={() => handleStatusUpdate(m.id, 'APPROVED')}
                            disabled={actionLoading}
                          >
                            Approve
                          </button>
                          <button 
                            className="btn btn-secondary btn-xs"
                            style={{ padding: '2px 8px', fontSize: '10px', background: 'rgba(255, 82, 82, 0.2)', border: '1px solid rgba(255, 82, 82, 0.3)' }}
                            onClick={() => handleStatusUpdate(m.id, 'REJECTED')}
                            disabled={actionLoading}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
