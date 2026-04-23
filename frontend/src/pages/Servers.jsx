import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getServers, getServerMembers, joinServer, updateMemberStatus, createServer, deleteServer } from '../api'
import { useApp } from '../contexts/AppContext'

export default function Servers() {
  const [servers, setServers] = useState([])
  const [selectedServer, setSelectedServer] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newServerForm, setNewServerForm] = useState({ name: '', disease_type: '', description: '', num_rounds: 5, target_column: 'target' })
  const { addToast, userRole } = useApp()
  const isAdmin = userRole === 'admin'
  const navigate = useNavigate()

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
      addToast('Successfully joined server', 'success')
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

  async function handleCreateServer(e) {
    e.preventDefault()
    setActionLoading(true)
    try {
      await createServer({
        ...newServerForm,
        input_type: 'tabular',
        model_type: 'xgboost',
        fl_algorithm: 'FedAvg'
      })
      addToast('Server created successfully', 'success')
      setShowCreate(false)
      loadServers()
    } catch (err) {
      addToast('Failed to create server', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeleteServer() {
    if (!window.confirm('Are you sure you want to delete this server?')) return
    setActionLoading(true)
    try {
      await deleteServer(selectedServer.id)
      addToast('Server deleted successfully', 'success')
      setSelectedServer(null)
      loadServers()
    } catch (err) {
      addToast('Failed to delete server', 'error')
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
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Active Servers</h3>
              <span className="badge badge-active" style={{ marginLeft: '8px' }}>{servers.length} servers</span>
            </div>
            {isAdmin && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowCreate(!showCreate)}
              >
                {showCreate ? 'Cancel' : '➕ Create Server'}
              </button>
            )}
          </div>

          {showCreate && isAdmin && (
            <form onSubmit={handleCreateServer} className="server-item active" style={{ cursor: 'default', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <h4 style={{ color: 'var(--color-text-bright)', margin: 0 }}>New Server</h4>
              <input type="text" placeholder="Server Name" required autoFocus className="input-field" style={{ width: '100%' }} value={newServerForm.name} onChange={e => setNewServerForm({ ...newServerForm, name: e.target.value })} />
              <input type="text" placeholder="Disease Type (e.g. Pneumonia)" required className="input-field" style={{ width: '100%' }} value={newServerForm.disease_type} onChange={e => setNewServerForm({ ...newServerForm, disease_type: e.target.value })} />
              <input type="text" placeholder="Description" required className="input-field" style={{ width: '100%' }} value={newServerForm.description} onChange={e => setNewServerForm({ ...newServerForm, description: e.target.value })} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" placeholder="Rounds" min="1" required className="input-field" style={{ flex: 1 }} value={newServerForm.num_rounds} onChange={e => setNewServerForm({ ...newServerForm, num_rounds: parseInt(e.target.value) })} />
                <input type="text" placeholder="Target Col" required className="input-field" style={{ flex: 1 }} value={newServerForm.target_column} onChange={e => setNewServerForm({ ...newServerForm, target_column: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={actionLoading}>
                {actionLoading ? 'Creating...' : 'Create Model'}
              </button>
            </form>
          )}

          {servers.map(srv => (
            <div
              key={srv.id}
              onClick={() => navigate(`/servers/${srv.id}`)}
              className={`server-item ${selectedServer?.id === srv.id ? 'active' : ''}`}
              style={{ cursor: 'pointer' }}
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
              <div style={{ display: 'flex', gap: '12px' }}>
                {!isAdmin && !isMember && (
                  <button className="btn btn-primary btn-sm" onClick={handleJoin} disabled={actionLoading}>
                    {actionLoading ? 'Joining...' : '➕ Join Server'}
                  </button>
                )}
                {!isAdmin && isMember && (
                  <span className={`badge badge-${memberRecord?.status.toLowerCase()}`}>
                    Your Status: {memberRecord?.status}
                  </span>
                )}
                {isAdmin && (
                  <button className="btn btn-secondary btn-sm" onClick={handleDeleteServer} disabled={actionLoading} style={{ color: 'var(--color-accent-red)', borderColor: 'rgba(255, 82, 82, 0.3)', background: 'rgba(255, 82, 82, 0.1)' }}>
                    🗑️ Delete Server
                  </button>
                )}
              </div>
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
                      {isAdmin && m.status === 'PENDING' && (
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
                      {isAdmin && m.status !== 'PENDING' && (
                        <button
                          className="btn btn-secondary btn-xs"
                          style={{ padding: '2px 8px', fontSize: '10px', background: 'rgba(255, 82, 82, 0.1)', border: '1px solid rgba(255, 82, 82, 0.2)', color: 'var(--color-accent-red)' }}
                          onClick={() => handleStatusUpdate(m.id, 'REJECTED')}
                          disabled={actionLoading}
                        >
                          Remove
                        </button>
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
