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
import { FaHospital } from 'react-icons/fa'

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
    const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
    const sse = new EventSource(`${baseUrl}/api/v1/training/stream/${id}`)
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
    return (
      <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
        <div style={{ height: '50px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite', width: '200px' }} />
        <div style={{ height: '80px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
          <div style={{ height: '400px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: '400px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
        </div>
      </div>
    )
  }

  if (!server) {
    return (
      <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-primary)' }}>Coordinating server workspace not found.</p>
        <Link to="/servers" className="btn btn-secondary" style={{ marginTop: '16px' }}>Back to Servers</Link>
      </div>
    )
  }

  const pendingMembers = members.filter(m => m.status === 'PENDING')
  const approvedMembers = members.filter(m => m.status === 'APPROVED')

  return (
    <div className="server-detail-page fade-in">
      <div style={{ marginBottom: '24px' }}>
        <Link to="/servers" className="btn btn-secondary btn-sm">
          <HiOutlineChevronLeft size={16} /> Back to Servers
        </Link>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-bg-secondary)', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HiOutlineServer size={22} /> 
          </div>
          {server.name}
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>{server.description}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
        {/* Left Column: Server Status & Node Membership list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Configuration Summary */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '16px' }}>Pipeline Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Target Feature</span>
                <strong style={{ color: 'var(--color-text-primary)' }}>{server.disease_type}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Model Architecture</span>
                <span className="badge badge-inactive">{server.model_type?.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Federated Scheme</span>
                <strong style={{ color: 'var(--color-text-primary)' }}>{server.fl_algorithm}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Current Round</span>
                <span className="badge badge-training">Round {server.current_round} / {server.num_rounds}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Pipeline State</span>
                <span className={`badge ${server.status === 'TRAINING' ? 'badge-error' : 'badge-active'}`}>
                  {server.status}
                </span>
              </div>
            </div>
          </div>

          {/* Hospital Membership Management */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '16px' }}>Hospital Membership Management ({members.length})</h3>
            
            {/* Pending Requests */}
            {pendingMembers.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: 'var(--color-accent-orange)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Approvals ({pendingMembers.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pendingMembers.map(m => (
                    <div key={m.id} style={{ padding: '12px', background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <strong style={{ color: '#C2410C' }}>{m.hospital_name}</strong>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-success btn-sm" onClick={() => handleUpdateStatus(m.id, 'APPROVED')} disabled={actionLoading}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleUpdateStatus(m.id, 'REJECTED')} disabled={actionLoading}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved Nodes */}
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Approved Members ({approvedMembers.length})</h4>
              {approvedMembers.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No approved hospital nodes registered.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {approvedMembers.map(m => (
                    <div key={m.id} style={{ padding: '12px', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--color-bg-secondary)', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FaHospital size={14} />
                        </div>
                        <strong style={{ color: 'var(--color-text-primary)' }}>{m.hospital_name}</strong>
                      </div>
                      <span className="badge badge-active">Approved</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Training controls & stream terminal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>Federated Round Controls</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
              Trigger training cycles on hospitals, wait for parameter updates, and aggregate tree ensembles or parameter coefficients centrally.
            </p>

            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                className="btn btn-primary"
                onClick={handleStartRound}
                disabled={actionLoading || server.status === 'TRAINING' || approvedMembers.length === 0}
                style={{ flex: 1, padding: '14px', fontSize: '0.9rem' }}
              >
                <HiOutlinePlay size={18} /> Trigger training round
              </button>

              <button 
                className="btn btn-secondary"
                onClick={handleAggregateRound}
                disabled={actionLoading || server.status !== 'TRAINING'}
                style={{ flex: 1, padding: '14px', fontSize: '0.9rem' }}
              >
                <HiOutlineShieldCheck size={18} /> Aggregate model updates
              </button>
            </div>

            {/* Realtime stream logs terminal */}
            {(logs.length > 0) && (
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                  <HiOutlineTerminal size={18} style={{ color: 'var(--color-accent-blue)' }} /> Real-time Execution Console
                </h4>
                <div style={{ height: '240px', background: '#FAFAFD', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-text-primary)', overflowY: 'auto' }}>
                  {logs.map((log, idx) => (
                    <div key={idx} style={{ marginBottom: '6px', whiteSpace: 'pre-wrap', color: log.includes('[ERROR]') ? 'var(--color-accent-red)' : log.includes('[WARNING]') ? 'var(--color-accent-orange)' : 'var(--color-text-primary)' }}>
                      {log}
                    </div>
                  ))}
                  <div ref={logTerminalEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* History of runs list */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '16px' }}>Pipeline Round History</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
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
                      <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>No round statistics log history.</td>
                    </tr>
                  ) : (
                    history.filter(h => h.log_type === 'global').map(hist => (
                      <tr key={hist.id}>
                        <td><span className="badge badge-success">Round {hist.round_number}</span></td>
                        <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{(hist.global_accuracy * 100).toFixed(1)}%</td>
                        <td style={{ color: 'var(--color-text-secondary)' }}>{hist.samples_trained} patients</td>
                        <td style={{ maxWidth: '200px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: 'var(--color-text-primary)' }}>
                          {hist.details}
                        </td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
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
