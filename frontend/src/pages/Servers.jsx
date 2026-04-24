import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getServers, getServerMembers, joinServer, updateMemberStatus, createServer, deleteServer } from '../api'
import { useApp } from '../contexts/AppContext'
import JoinModal from '../components/shared/JoinModal'
import { 
  HiOutlineDesktopComputer, HiOutlinePlus, HiOutlineShieldCheck, 
  HiOutlineServer, HiOutlineTrash, HiOutlineChartBar, 
  HiOutlineRefresh, HiOutlineCheckCircle, HiOutlineUserGroup,
  HiOutlineAdjustments, HiOutlineCollection, HiOutlineLockClosed,
  HiOutlineDatabase, HiOutlineOfficeBuilding
} from 'react-icons/hi'

export default function Servers() {
  const [servers, setServers] = useState([])
  const [selectedServer, setSelectedServer] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [newServerForm, setNewServerForm] = useState({ name: '', disease_type: '', description: '', num_rounds: 5, target_column: 'target' })
  const { addToast, userRole, hospitalId, hospitalName, setHospitalName } = useApp()
  const isAdmin = userRole?.toUpperCase() === 'ADMIN'
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

  function handleJoinClick() {
    setShowJoinModal(true)
  }

  async function handleJoinConfirm(customName) {
    setActionLoading(true)
    try {
      await joinServer({
        server_id: selectedServer.id,
        hospital_id: hospitalId,
        hospital_name: customName
      })
      setHospitalName(customName)
      addToast('Successfully joined as ' + customName, 'success')
      setShowJoinModal(false)
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

  const isMember = members.some(m => m.hospital_id === hospitalId)
  const memberRecord = members.find(m => m.hospital_id === hospitalId)

  if (loading) return <div className="loader"><div className="spinner"></div></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <HiOutlineDesktopComputer style={{ color: 'var(--color-accent-violet)' }} /> Disease Servers
          </h1>
          <p style={{ fontSize: 'var(--font-size-xs)' }}>Manage AI pipelines for different disease predictions</p>
        </div>
      </div>

      <div className="content-grid">
        {/* Server List */}
        <div className="card">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Active Servers</h3>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {servers.length} disease prediction nodes available
              </p>
            </div>
            {isAdmin ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowCreate(!showCreate)}
                style={{ padding: '8px 16px', boxShadow: '0 0 15px rgba(102, 126, 234, 0.4)', fontSize: '0.75rem' }}
              >
                {showCreate ? '✕ Cancel' : <><HiOutlinePlus /> Create New Server</>}
              </button>
            ) : (
              <div className="privacy-badge" style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8, background: 'rgba(102, 126, 234, 0.1)', border: '1px solid rgba(102, 126, 234, 0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HiOutlineShieldCheck /> Admin Managed
              </div>
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
                <span className={`badge badge-${(srv.status || 'PENDING').toLowerCase()}`}>{srv.status || 'PENDING'}</span>
              </div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                {srv.description?.slice(0, 100) || `${srv.disease_type} prediction pipeline`}
              </p>
              <div style={{ display: 'flex', gap: '16px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><HiOutlineAdjustments /> {srv.model_type}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><HiOutlineRefresh /> {srv.fl_algorithm}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><HiOutlineUserGroup /> {srv.member_count} hospitals</span>
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
                {(!isMember) && (
                  <button className="btn btn-primary btn-sm" onClick={handleJoinClick} disabled={actionLoading} style={{ fontSize: '0.75rem' }}>
                    {actionLoading ? 'Joining...' : <><HiOutlinePlus /> Join Server</>}
                  </button>
                )}
                {isMember && !isAdmin && (
                  <span className={`badge badge-${(memberRecord?.status || 'PENDING').toLowerCase()}`}>
                    Your Status: {memberRecord?.status || 'PENDING'}
                  </span>
                )}
                {isAdmin && (
                  <button className="btn btn-secondary btn-sm" onClick={handleDeleteServer} disabled={actionLoading} style={{ color: 'var(--color-accent-red)', borderColor: 'rgba(255, 82, 82, 0.3)', background: 'rgba(255, 82, 82, 0.1)', fontSize: '0.75rem' }}>
                    <HiOutlineTrash /> Delete Server
                  </button>
                )}
              </div>
            </div>

            {(isAdmin || (isMember && memberRecord?.status === 'APPROVED')) ? (
              <>
                <div className="details-grid">
                  {[
                    { label: 'Disease Type', value: selectedServer.disease_type, icon: <HiOutlineCollection /> },
                    { label: 'Input Type', value: selectedServer.input_type, icon: <HiOutlineDatabase /> },
                    { label: 'Model', value: selectedServer.model_type, icon: <HiOutlineAdjustments /> },
                    { label: 'FL Algorithm', value: selectedServer.fl_algorithm, icon: <HiOutlineRefresh /> },
                    { label: 'Training Rounds', value: `${selectedServer.current_round || 0} / ${selectedServer.num_rounds || 0}`, icon: <HiOutlineRefresh /> },
                    { label: 'Global Accuracy', value: `${((selectedServer.global_accuracy || 0) * 100).toFixed(2)}%`, icon: <HiOutlineCheckCircle /> },
                    { label: 'Target Column', value: selectedServer.target_column, icon: <HiOutlineAdjustments /> },
                    { label: 'Datasets', value: selectedServer.dataset_count || 0, icon: <HiOutlineChartBar /> },
                  ].map((item, i) => (
                    <div key={i} className="detail-item">
                      <div className="detail-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{item.icon} {item.label}</div>
                      <div className="detail-value">{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Members */}
                <div className="section-header" style={{ marginTop: '32px' }}>
                  <h4 style={{ color: 'var(--color-text-bright)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-md)' }}>
                    <HiOutlineOfficeBuilding style={{ opacity: 0.7 }} /> Participating Hospitals
                  </h4>
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
                      <tr key={m.id} style={m.hospital_id === parseInt(hospitalId) ? { background: 'rgba(102, 126, 234, 0.1)' } : {}}>
                        <td style={{ fontWeight: 600 }}>
                          {m.hospital_id === parseInt(hospitalId) ? `${m.hospital_name} (You)` : m.hospital_name}
                        </td>
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
              </>
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px', marginTop: '20px', border: '1px dashed var(--color-border)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '16px', color: 'var(--color-text-muted)' }}><HiOutlineLockClosed /></div>
                <h4 style={{ fontSize: 'var(--font-size-md)' }}>Secure Access Restricted</h4>
                <p style={{ maxWidth: '400px', margin: '0 auto' }}>
                  {isMember
                    ? "Your join request is currently pending approval by the server administrator. You will gain access once approved."
                    : "Detailed metrics and participant identity are restricted to approved partners only. Join the server to request access."
                  }
                </p>
                {!isMember && (
                  <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={handleJoinClick}>
                    Request Access to Node
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <JoinModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onConfirm={handleJoinConfirm}
        initialName={hospitalName}
        loading={actionLoading}
      />
    </div>
  )
}
