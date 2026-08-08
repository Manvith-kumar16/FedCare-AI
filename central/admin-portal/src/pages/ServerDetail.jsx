import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  getServer, getServerMembers, updateMemberStatus, 
  startTrainingRound, triggerCentralAggregation, getTrainingHistory 
} from '../api'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineChevronLeft, HiOutlineServer, HiOutlineUserGroup,
  HiOutlinePlay, HiOutlineShieldCheck, HiOutlineTerminal,
  HiOutlineCheckCircle, HiOutlineClock, HiOutlineBan
} from 'react-icons/hi'

export default function ServerDetail() {
  const { id } = useParams()
  const [server, setServer] = useState(null)
  const [members, setMembers] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const { addToast } = useApp()
  const logTerminalEndRef = useRef(null)
  const sseSourceRef = useRef(null)

  useEffect(() => {
    loadData()
    return () => disconnectSSE()
  }, [id])

  useEffect(() => {
    logTerminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  async function loadData() {
    try {
      setLoading(true)
      const [serverRes, membersRes, historyRes] = await Promise.all([
        getServer(id),
        getServerMembers(id),
        getTrainingHistory(id).catch(() => ({ data: [] }))
      ])

      setServer(serverRes.data)
      setMembers(membersRes.data || [])
      setHistory(historyRes.data || [])
    } catch (e) {
      addToast('Failed to load server workspace parameters', 'error')
    } finally {
      setLoading(false)
    }
  }

  function connectSSE() {
    disconnectSSE()
    setLogs(['[SYSTEM] Initializing SSE log stream to Central Coordinator...', '[SYSTEM] Waiting for execution output...'])
    
    // Connect to actual FastAPI Server Sent Events stream
    const sse = new EventSource(`/api/v1/training/stream/${id}`)
    sseSourceRef.current = sse

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.log === '__DONE__') {
          setLogs(prev => [...prev, '[SYSTEM] SSE Stream connection closed by coordinator.'])
          disconnectSSE()
        } else {
          setLogs(prev => [...prev, data.log])
        }
      } catch (err) {
        console.error(err)
      }
    }

    sse.onerror = () => {
      setLogs(prev => [...prev, '[WARNING] Log stream disconnected. Check backend server status.'])
      disconnectSSE()
    }
  }

  function disconnectSSE() {
    if (sseSourceRef.current) {
      sseSourceRef.current.close()
      sseSourceRef.current = null
    }
  }

  const handleUpdateStatus = async (memberId, status) => {
    setActionLoading(true)
    try {
      await updateMemberStatus(memberId, { status })
      addToast(`Hospital status updated to ${status.toLowerCase()} successfully`, 'success')
      // Reload members list
      const membersRes = await getServerMembers(id)
      setMembers(membersRes.data || [])
    } catch (err) {
      addToast('Failed to update status', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStartRound = async () => {
    setActionLoading(true)
    connectSSE()
    try {
      const res = await startTrainingRound(id)
      addToast(res.data.message || 'Federated round started successfully!', 'success')
      await loadData()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to start federated round'
      addToast(msg, 'error')
      setLogs(prev => [...prev, `[ERROR] Round Start aborted: ${msg}`])
    } finally {
      setActionLoading(false)
    }
  }

  const handleAggregateRound = async () => {
    setActionLoading(true)
    connectSSE()
    try {
      const res = await triggerCentralAggregation(id)
      addToast('Federated parameter aggregation complete!', 'success')
      await loadData()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Aggregation failed'
      addToast(msg, 'error')
      setLogs(prev => [...prev, `[ERROR] Aggregation aborted: ${msg}`])
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="loader"><div className="spinner"></div></div>
  }

  if (!server) {
    return (
      <div className="glass-panel text-center" style={{ padding: '48px' }}>
        <p>Coordinating server workspace not found.</p>
        <Link to="/servers" className="btn btn-secondary" style={{ marginTop: '16px' }}>Back to Servers</Link>
      </div>
    )
  }

  const pendingMembers = members.filter(m => m.status === 'PENDING')
  const approvedMembers = members.filter(m => m.status === 'APPROVED')

  return (
    <div className="server-detail-page fade-in">
      <div style={{ marginBottom: '20px' }}>
        <Link to="/servers" className="btn-small btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <HiOutlineChevronLeft /> Back to Servers
        </Link>
      </div>

      <div className="page-header" style={{ marginTop: 0 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HiOutlineServer style={{ color: '#00d2ff' }} /> {server.name}
          </h2>
          <p>{server.description}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
        {/* Left Column: Server Status & Node Membership list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Configuration Summary */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3>Pipeline Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.7 }}>Target Feature</span>
                <strong>{server.disease_type}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.7 }}>Model Architecture</span>
                <span className="badge badge-info">{server.model_type?.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.7 }}>Federated Scheme</span>
                <strong>{server.fl_algorithm}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.7 }}>Current Round</span>
                <span className="badge badge-success">Round {server.current_round} / {server.num_rounds}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.7 }}>Pipeline State</span>
                <span className={`badge ${server.status === 'TRAINING' ? 'badge-error' : 'badge-active'}`}>
                  {server.status}
                </span>
              </div>
            </div>
          </div>

          {/* Hospital Membership Management */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3>Hospital Membership Management ({members.length})</h3>
            
            {/* Pending Requests */}
            {pendingMembers.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ color: '#fbbf24', fontSize: '0.85rem', marginBottom: '8px' }}>Pending Approvals ({pendingMembers.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pendingMembers.map(m => (
                    <div key={m.id} style={{ padding: '10px', background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.15)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                      <strong>{m.hospital_name}</strong>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-small btn-primary" onClick={() => handleUpdateStatus(m.id, 'APPROVED')} disabled={actionLoading}>Approve</button>
                        <button className="btn-small btn-danger" onClick={() => handleUpdateStatus(m.id, 'REJECTED')} disabled={actionLoading}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved Nodes */}
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '8px' }}>Approved Members ({approvedMembers.length})</h4>
              {approvedMembers.length === 0 ? (
                <p style={{ fontSize: '0.85rem', opacity: 0.5, fontStyle: 'italic' }}>No approved hospital nodes registered.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {approvedMembers.map(m => (
                    <div key={m.id} style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <HiOutlineUserGroup style={{ color: '#00d2ff' }} />
                        <strong>{m.hospital_name}</strong>
                      </div>
                      <span className="badge badge-success">Approved</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Training controls & stream terminal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3>Federated Round Controls</h3>
            <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '4px', marginBottom: '16px' }}>
              Trigger training cycles on hospitals, wait for parameter updates, and aggregate tree ensembles or parameter coefficients centrally.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn btn-primary"
                onClick={handleStartRound}
                disabled={actionLoading || server.status === 'TRAINING' || approvedMembers.length === 0}
                style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '12px' }}
              >
                <HiOutlinePlay size={18} /> Trigger training round
              </button>

              <button 
                className="btn btn-secondary"
                onClick={handleAggregateRound}
                disabled={actionLoading || server.status !== 'TRAINING'}
                style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '12px' }}
              >
                <HiOutlineShieldCheck size={18} /> Aggregate model updates
              </button>
            </div>

            {/* Realtime stream logs terminal */}
            {(logs.length > 0) && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', marginBottom: '8px' }}>
                  <HiOutlineTerminal /> Real-time Execution Console
                </h4>
                <div style={{ height: '220px', background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '12px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#00d2ff', overflowY: 'auto' }}>
                  {logs.map((log, idx) => (
                    <div key={idx} style={{ marginBottom: '3px', whiteSpace: 'pre-wrap' }}>{log}</div>
                  ))}
                  <div ref={logTerminalEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* History of runs list */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3>Pipeline Round History</h3>
            <div className="table-responsive" style={{ marginTop: '12px' }}>
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Round</th>
                    <th>Global Acc</th>
                    <th>Samples Count</th>
                    <th>Hospital Client logs</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center">No round statistics log history.</td>
                    </tr>
                  ) : (
                    history.filter(h => h.log_type === 'global').map(hist => (
                      <tr key={hist.id}>
                        <td><span className="badge badge-success">Round {hist.round_number}</span></td>
                        <td style={{ fontWeight: 700 }}>{(hist.global_accuracy * 100).toFixed(1)}%</td>
                        <td>{hist.samples_trained} patients</td>
                        <td style={{ maxWidth: '200px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {hist.details}
                        </td>
                        <td style={{ opacity: 0.6 }}>
                          {new Date(hist.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
