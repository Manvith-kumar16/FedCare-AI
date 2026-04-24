import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import {
  getServer, getServerMembers, joinServer, updateMemberStatus,
  deleteServer, getDatasets, getDatasetStats, getDatasetPreview,
  uploadDataset, trainFullModel, getTrainingStatus, clearDatasets
} from '../api'
import { useApp } from '../contexts/AppContext'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

// ─── Mini sparkline chart ──────────────────────────────────────────────────
function Sparkline({ data, color, label }) {
  const chartData = {
    labels: data.map((_, i) => `R${i + 1}`),
    datasets: [{
      label, data,
      borderColor: color,
      backgroundColor: color + '22',
      tension: 0.4, fill: true,
      pointRadius: 2, pointHoverRadius: 4,
    }]
  }
  return (
    <Line data={chartData} options={{
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${label}: ${ctx.parsed.y}` } } },
      scales: {
        x: { display: false },
        y: { display: false },
      }
    }} />
  )
}

// ─── Result metric card ────────────────────────────────────────────────────
function ResultCard({ icon, label, value, color, subtitle }) {
  return (
    <div style={{
      padding: '20px',
      borderRadius: '16px',
      background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`,
      border: `1px solid ${color}33`,
      display: 'flex', flexDirection: 'column', gap: '6px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ fontSize: '1.5rem' }}>{icon}</div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-bright)', opacity: 0.9 }}>{label}</div>
      {subtitle && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{subtitle}</div>}
      {/* Glow orb */}
      <div style={{ position: 'absolute', bottom: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: color + '18', filter: 'blur(20px)', pointerEvents: 'none' }} />
    </div>
  )
}

export default function ServerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast, userRole, hospitalId, hospitalName, setHospitalName } = useApp()
  const isAdmin = userRole === 'admin'

  const [server, setServer] = useState(null)
  const [members, setMembers] = useState([])
  const [datasets, setDatasets] = useState([])
  const [stats, setStats] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [expandedMemberId, setExpandedMemberId] = useState(null)

  // Training state
  const [trainingPhase, setTrainingPhase] = useState('idle') // idle | running | done
  const [trainRound, setTrainRound] = useState(0)
  const [trainLogs, setTrainLogs] = useState([]) // global logs
  const [localLogs, setLocalLogs] = useState([]) // local per-hospital logs
  const [trainStatus, setTrainStatus] = useState('')
  const [finalResults, setFinalResults] = useState(null)

  const fileInputRef = useRef(null)
  const pollRef = useRef(null)

  useEffect(() => { loadAll() }, [id])

  // Stop polling on unmount
  useEffect(() => () => clearInterval(pollRef.current), [])

  async function loadAll() {
    setLoading(true)
    try {
      const [srvRes, membersRes, dsRes, statsRes, statusRes] = await Promise.all([
        getServer(id),
        getServerMembers(id),
        getDatasets(id),
        getDatasetStats(id).catch(() => ({ data: null })),
        getTrainingStatus(id).catch(() => ({ data: null })),
      ])
      setServer(srvRes.data)
      setMembers(membersRes.data)
      setDatasets(dsRes.data)
      setStats(statsRes.data)

      // Restore training state if server is TRAINING or COMPLETED
      const status = statusRes?.data
      if (status) {
        const globalLogs = (status.logs || []).filter(l => l.log_type === 'global')
        const localLogsData = (status.logs || []).filter(l => l.log_type === 'local')
        setTrainLogs(globalLogs)
        setLocalLogs(localLogsData)

        if (srvRes.data.status === 'TRAINING') {
          setTrainingPhase('running')
          setTrainStatus('Training in progress...')
          setTrainRound(srvRes.data.current_round)
          startPolling()
        } else if (srvRes.data.status === 'COMPLETED' && globalLogs.length > 0) {
          setTrainingPhase('done')
          setTrainRound(srvRes.data.num_rounds)
          const last = globalLogs[globalLogs.length - 1]
          const lastLocal = localLogsData.filter(l => l.round_number === srvRes.data.num_rounds)
          setFinalResults({
            globalAccuracy: last.global_accuracy,
            globalLoss: last.global_loss,
            localF1: lastLocal[0]?.local_f1 || 0,
            localPrecision: lastLocal[0]?.local_precision || 0,
            localRecall: lastLocal[0]?.local_recall || 0,
            localAccuracy: lastLocal[0]?.local_accuracy || 0,
            samplesTotal: localLogsData.reduce((s, l) => s + (l.samples_trained || 0), 0),
            rounds: srvRes.data.num_rounds,
            hospitals: srvRes.data.member_count || members.length,
          })
        }
      }
    } catch (e) {
      addToast('Failed to load server details', 'error')
    } finally {
      setLoading(false)
    }
  }

  function startPolling() {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await getTrainingStatus(id)
        const data = res?.data
        if (!data) return

        const globalLogs = (data.logs || []).filter(l => l.log_type === 'global')
        const localLogsData = (data.logs || []).filter(l => l.log_type === 'local')
        setTrainLogs(globalLogs)
        setLocalLogs(localLogsData)
        setTrainRound(data.current_round || 0)

        if (data.status === 'TRAINING') {
          setTrainStatus('Running XGBoost on combined dataset...')
        } else if (data.status === 'COMPLETED') {
          clearInterval(pollRef.current)
          setTrainingPhase('done')
          setTrainStatus('Training Complete')
          // For train-full, all metrics are in the global log entry
          const last = globalLogs[globalLogs.length - 1]
          setFinalResults({
            globalAccuracy: last?.global_accuracy || data.global_accuracy || 0,
            globalLoss: last?.global_loss || 0,
            localF1: last?.local_f1 || 0,
            localPrecision: last?.local_precision || 0,
            localRecall: last?.local_recall || 0,
            localAccuracy: last?.local_accuracy || 0,
            samplesTotal: last?.samples_trained || 0,
            rounds: 1,
            hospitals: data.participating_hospitals,
          })
          addToast('🎉 XGBoost Training Complete!', 'success')
          loadAll()
        } else if (data.status === 'ACTIVE') {
          clearInterval(pollRef.current)
          setTrainingPhase('idle')
        }
      } catch (e) { console.error('Poll error', e) }
    }, 2000)
  }

  async function handleStartTraining() {
    setTrainingPhase('running')
    setTrainLogs([]); setLocalLogs([]); setTrainRound(0); setFinalResults(null)
    setTrainStatus('Initializing XGBoost...')
    try {
      await trainFullModel({ server_id: parseInt(id), num_rounds: 100 })
      startPolling()
    } catch (err) {
      setTrainingPhase('idle')
      addToast(err.response?.data?.detail || 'Failed to start training', 'error')
    }
  }

  async function handleJoin() {
    const customName = window.prompt('Welcome! Enter your professional Hospital Name (e.g., Metropolitan Health Center):', hospitalName || '')
    if (customName === null) return // Cancelled

    setActionLoading(true)
    try {
      await joinServer({
        server_id: parseInt(id),
        hospital_id: hospitalId,
        hospital_name: customName || hospitalName
      })
      if (customName) setHospitalName(customName)
      addToast('Successfully joined as ' + (customName || hospitalName), 'success')
      loadAll()
    } catch (e) {
      addToast(e.response?.data?.detail || 'Failed to join', 'error')
    } finally { setActionLoading(false) }
  }

  async function handleStatusUpdate(memberId, status) {
    setActionLoading(true)
    try {
      await updateMemberStatus(memberId, { status })
      addToast(`Hospital ${status.toLowerCase()}ed`, 'success')
      loadAll()
    } catch (e) { addToast('Failed to update status', 'error') }
    finally { setActionLoading(false) }
  }

  async function handleDeleteServer() {
    if (!window.confirm('Delete this server? Cannot be undone.')) return
    setActionLoading(true)
    try {
      await deleteServer(parseInt(id))
      addToast('Server deleted', 'success')
      navigate('/servers')
    } catch (e) { addToast('Failed to delete', 'error') }
    finally { setActionLoading(false) }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    addToast('Uploading ' + file.name + '...', 'info')
    try {
      await uploadDataset(parseInt(id), file)
      addToast('Dataset uploaded!', 'success')
      loadAll()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Upload failed', 'error')
    } finally { setUploading(false); e.target.value = '' }
  }

  async function handleClearDatasets() {
    if (!window.confirm('Clear all datasets?')) return
    try {
      await clearDatasets(parseInt(id))
      addToast('Datasets cleared!', 'success')
      loadAll()
    } catch (e) { addToast('Failed to clear', 'error') }
  }

  async function loadPreview(dsId) {
    try { const res = await getDatasetPreview(dsId, 8); setPreview(res.data) }
    catch (e) { addToast('Failed to load preview', 'error') }
  }

  const myMember = members.find(m =>
    m.hospital_name?.toLowerCase() === hospitalName?.toLowerCase() || m.hospital_id === hospitalId
  )
  const isMember = !!myMember

  const featureCols = (() => {
    try { return server?.feature_columns ? JSON.parse(server.feature_columns) : [] }
    catch { return [] }
  })()

  const numRounds = server?.num_rounds || 5
  const pct = trainRound > 0 ? Math.round((trainRound / numRounds) * 100) : 0

  // Chart data
  const globalAccData = trainLogs.map(l => parseFloat((l.global_accuracy * 100).toFixed(2)))
  const globalLossData = trainLogs.map(l => parseFloat(l.global_loss.toFixed(4)))
  const roundLabels = trainLogs.map(l => `Round ${l.round_number}`)

  const dualChartData = {
    labels: roundLabels,
    datasets: [
      {
        label: 'Global Accuracy (%)',
        data: globalAccData,
        borderColor: '#00d2ff',
        backgroundColor: 'rgba(0,210,255,0.08)',
        tension: 0.4, fill: true, yAxisID: 'y',
        pointBackgroundColor: '#00d2ff', pointRadius: 4, pointHoverRadius: 7,
      },
      {
        label: 'Global Loss',
        data: globalLossData,
        borderColor: '#ff6b6b',
        backgroundColor: 'rgba(255,107,107,0.05)',
        tension: 0.4, fill: false, yAxisID: 'y1',
        borderDash: [5, 3],
        pointBackgroundColor: '#ff6b6b', pointRadius: 3, pointHoverRadius: 5,
      }
    ]
  }

  if (loading) return <div className="loader"><div className="spinner"></div></div>
  if (!server) return (
    <div className="empty-state">
      <div className="empty-icon">⚠️</div><h4>Server Not Found</h4>
      <button className="btn btn-primary" onClick={() => navigate('/servers')}>← Back</button>
    </div>
  )

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/servers')}>← Back</button>
            <h1 style={{ margin: 0 }}>🖥️ {server.name}</h1>
            <span className={`badge badge-${server.status.toLowerCase()}`}>{server.status}</span>
          </div>
          <p>{server.description || `${server.disease_type} federated prediction pipeline`}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!isAdmin && !isMember && (
            <button className="btn btn-primary" onClick={handleJoin} disabled={actionLoading}>
              {actionLoading ? 'Joining...' : '➕ Join Server'}
            </button>
          )}
          {!isAdmin && isMember && (
            <span className={`badge badge-${myMember?.status?.toLowerCase()}`} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              Your Status: {myMember?.status}
            </span>
          )}
          {isAdmin && (
            <button className="btn btn-secondary btn-sm" onClick={handleDeleteServer} disabled={actionLoading}
              style={{ color: 'var(--color-accent-red)', borderColor: 'rgba(255,82,82,0.3)', background: 'rgba(255,82,82,0.1)' }}>
              🗑️ Delete
            </button>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="metrics-grid" style={{ marginBottom: 'var(--space-xl)' }}>
        {[
          { icon: '🦠', label: 'Disease', value: server.disease_type },
          { icon: '🤖', label: 'Model', value: server.model_type },
          { icon: '🔄', label: 'Algorithm', value: server.fl_algorithm },
          { icon: '🎯', label: 'Global Accuracy', value: `${(server.global_accuracy * 100).toFixed(2)}%`, cyan: true },
          { icon: '🔁', label: 'Rounds', value: `${server.current_round} / ${server.num_rounds}` },
          { icon: '🏥', label: 'Hospitals', value: members.length },
          { icon: '📁', label: 'Datasets', value: datasets.length },
          { icon: '📐', label: 'Features', value: featureCols.length || '—' },
        ].map((m, i) => (
          <div className="metric-card" key={i}>
            <div className="metric-icon blue">{m.icon}</div>
            <div className="metric-value" style={m.cyan ? { color: 'var(--color-accent-cyan)' } : {}}>{m.value}</div>
            <div className="metric-label">{m.label}</div>
          </div>
        ))}
      </div>

      {/* ── Hospitals ── */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="section-header">
          <h3>🏥 Participating Hospitals</h3>
          <span className="badge badge-active">{members.length} hospitals</span>
        </div>

        {members.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏥</div><h4>No Hospitals Yet</h4>
            <p>Join this server to participate in federated training</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map(m => {
              const isMe = m.hospital_name?.toLowerCase() === hospitalName?.toLowerCase() || m.hospital_id === hospitalId
              const isExpanded = expandedMemberId === m.id
              const hDatasets = datasets.filter(ds => ds.hospital_id === m.hospital_id)

              return (
                <div key={m.id} style={{
                  borderRadius: '12px',
                  border: isExpanded ? '1px solid rgba(102,126,234,0.4)' : '1px solid var(--color-border)',
                  background: isExpanded ? 'rgba(102,126,234,0.04)' : 'transparent',
                  overflow: 'hidden', transition: 'all 0.25s',
                }}>
                  {/* Row */}
                  <div onClick={() => (isMe || isAdmin) && setExpandedMemberId(isExpanded ? null : m.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', cursor: isMe || isAdmin ? 'pointer' : 'default' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                        background: isMe ? 'rgba(102,126,234,0.2)' : 'rgba(255,255,255,0.05)',
                        border: isMe ? '1px solid rgba(102,126,234,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      }}>🏥</span>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-bright)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {m.hospital_name}
                          {isMe && <span className="badge badge-training" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>You</span>}
                          {m.last_accuracy > 0 && (
                            <span style={{
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'rgba(0,210,255,0.15)',
                              color: 'var(--color-accent-cyan)',
                              border: '1px solid rgba(0,210,255,0.3)',
                              fontWeight: 700
                            }}>
                              Acc: {(m.last_accuracy * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {hDatasets.length} dataset{hDatasets.length !== 1 ? 's' : ''} {m.last_accuracy > 0 && ` • Local Training Active`}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className={`badge badge-${m.status.toLowerCase()}`}>{m.status}</span>
                      {isAdmin && m.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-primary btn-xs" style={{ padding: '3px 10px', fontSize: '11px' }}
                            onClick={e => { e.stopPropagation(); handleStatusUpdate(m.id, 'APPROVED') }} disabled={actionLoading}>Approve</button>
                          <button className="btn btn-secondary btn-xs"
                            style={{ padding: '3px 10px', fontSize: '11px', background: 'rgba(255,82,82,0.15)', borderColor: 'rgba(255,82,82,0.3)' }}
                            onClick={e => { e.stopPropagation(); handleStatusUpdate(m.id, 'REJECTED') }} disabled={actionLoading}>Reject</button>
                        </div>
                      )}
                      {(isMe || isAdmin) && (
                        <span style={{ color: 'var(--color-text-muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▼</span>
                      )}
                    </div>
                  </div>

                  {/* Expanded dataset panel */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(102,126,234,0.2)', padding: '20px 18px', background: 'rgba(10,18,45,0.4)' }}>
                      <div className="section-header" style={{ marginBottom: '16px' }}>
                        <h4 style={{ color: 'var(--color-text-bright)', margin: 0 }}>
                          📂 {isMe ? 'My' : m.hospital_name + "'s"} Datasets
                        </h4>
                        {isMe && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {hDatasets.length > 0 && <button className="btn btn-secondary btn-sm" onClick={handleClearDatasets}>🗑️ Clear</button>}
                            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept=".csv,.txt" />
                            <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current.click()} disabled={uploading}>
                              {uploading ? '⌛ Uploading...' : '📤 Upload CSV / TXT'}
                            </button>
                          </div>
                        )}
                      </div>

                      {hDatasets.length > 0 ? (
                        <>
                          <table className="data-table">
                            <thead>
                              <tr><th>Filename</th><th>Rows</th><th>Features</th><th>Size</th><th></th></tr>
                            </thead>
                            <tbody>
                              {hDatasets.map(ds => (
                                <tr key={ds.id}>
                                  <td style={{ fontWeight: 500 }}>{ds.filename}</td>
                                  <td>{ds.row_count?.toLocaleString()}</td>
                                  <td>{ds.feature_count}</td>
                                  <td>{ds.file_size_kb} KB</td>
                                  <td><button className="btn btn-secondary btn-sm" onClick={() => loadPreview(ds.id)}>Preview</button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {preview && (
                            <div style={{ marginTop: '16px' }}>
                              <div className="section-header" style={{ marginBottom: '10px' }}>
                                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>👁️ Preview</span>
                                <button className="btn btn-secondary btn-sm" onClick={() => setPreview(null)}>Close</button>
                              </div>
                              <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                  <thead><tr>{preview.columns?.map(col => <th key={col}>{col}</th>)}</tr></thead>
                                  <tbody>{preview.rows?.map((row, i) => (
                                    <tr key={i}>{preview.columns?.map(col => <td key={col}>{row[col]}</td>)}</tr>
                                  ))}</tbody>
                                </table>
                              </div>
                              <p style={{ marginTop: '8px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                {preview.rows?.length} of {preview.total_rows} rows · {preview.shape?.[0]} × {preview.shape?.[1]}
                              </p>
                            </div>
                          )}
                        </>
                      ) : isMe ? (
                        <div style={{ textAlign: 'center', padding: '28px 0' }}>
                          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📂</div>
                          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '14px' }}>No datasets yet. Upload your CSV or TXT to start.</p>
                          <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept=".csv,.txt" />
                          <button className="btn btn-primary" onClick={() => fileInputRef.current.click()} disabled={uploading}>📤 Upload Dataset</button>
                        </div>
                      ) : (
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '24px 0' }}>No datasets uploaded by this hospital yet.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Train XGBoost Button (shown when datasets exist) ── */}
      {datasets.length > 0 && trainingPhase === 'idle' && (
        <div style={{
          margin: '0 0 var(--space-xl)',
          padding: '28px 32px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(102,126,234,0.12) 0%, rgba(118,75,162,0.08) 100%)',
          border: '1px solid rgba(102,126,234,0.25)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '24px',
        }}>
          <div>
            <h3 style={{ margin: '0 0 6px', color: 'var(--color-text-bright)', fontSize: '1.15rem' }}>
              🚀 Ready to Train XGBoost
            </h3>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              {datasets.length} dataset{datasets.length !== 1 ? 's' : ''} across {members.length} hospital{members.length !== 1 ? 's' : ''} will be combined and used to train a single full XGBoost classifier (100 boosting rounds).
            </p>
          </div>
          <button
            onClick={handleStartTraining}
            style={{
              padding: '14px 32px', borderRadius: '12px', whiteSpace: 'nowrap',
              fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.02em',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none', color: '#fff', cursor: 'pointer',
              boxShadow: '0 4px 24px rgba(102,126,234,0.4)',
              transition: 'all 0.2s', flexShrink: 0,
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'none'}
          >
            ⚡ Train XGBoost Model
          </button>
        </div>
      )}

      {/* ── Live Training Panel ── */}
      {trainingPhase === 'running' && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)', border: '1px solid rgba(102,126,234,0.35)', background: 'rgba(102,126,234,0.04)' }}>
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00d2ff', animation: 'pulse 1s infinite' }} />
              <h3 style={{ margin: 0 }}>⚡ XGBoost Federated Training</h3>
              <span className="badge badge-training">LIVE</span>
            </div>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>{trainStatus}</span>
          </div>

          {/* Progress — indeterminate bar for single-shot training */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: '#00d2ff', animation: 'pulse 1s infinite',
                }} />
                XGBoost training in progress...
              </span>
              <span style={{ color: 'var(--color-accent-cyan)' }}>Please wait</span>
            </div>
            <div style={{ height: '10px', borderRadius: '9999px', background: 'rgba(102,126,234,0.15)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '9999px',
                background: 'linear-gradient(90deg, transparent, #667eea, #00d2ff, transparent)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s linear infinite',
                width: '60%',
              }} />
            </div>
          </div>

          {/* Inline metrics — hide until we have results */}
          <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '24px' }}>
            <div className="metric-card" style={{ padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Status</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>Training</div>
            </div>
            <div className="metric-card" style={{ padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Datasets</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#00d2ff' }}>{datasets.length}</div>
            </div>
            <div className="metric-card" style={{ padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Algorithm</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#c084fc' }}>XGBoost</div>
            </div>
          </div>

          {/* Live chart */}
          {trainLogs.length > 0 ? (
            <div style={{ height: '220px' }}>
              <Line data={dualChartData} options={{
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 300 },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: { labels: { color: '#8892b0', font: { size: 11 } } },
                  tooltip: { backgroundColor: 'rgba(15,23,52,0.9)', borderColor: 'rgba(102,126,234,0.3)', borderWidth: 1 }
                },
                scales: {
                  x: { ticks: { color: '#5c6484', font: { size: 10 } }, grid: { color: 'rgba(102,126,234,0.05)' } },
                  y: { ticks: { color: '#5c6484', font: { size: 10 } }, grid: { color: 'rgba(102,126,234,0.05)' }, title: { display: true, text: 'Accuracy (%)', color: '#5c6484', font: { size: 10 } } },
                  y1: { position: 'right', ticks: { color: '#5c6484', font: { size: 10 } }, grid: { display: false }, title: { display: true, text: 'Loss', color: '#5c6484', font: { size: 10 } } }
                }
              }} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              <div style={{ animation: 'pulse 1.5s infinite', fontSize: '1.5rem', marginBottom: '8px' }}>⚙️</div>
              Waiting for first round results...
            </div>
          )}

          {/* Live log */}
          <div style={{ marginTop: '20px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(10,18,45,0.7)', border: '1px solid rgba(102,126,234,0.15)', maxHeight: '100px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {trainLogs.slice().reverse().map((l, i) => (
              <div key={i} style={{ color: '#a0aec0', marginBottom: '4px' }}>
                <span style={{ color: '#667eea' }}>[{l.log_type === 'info' ? 'INFO' : `Round ${l.round_number}`}]</span>{' '}
                {l.log_type === 'info' ? (
                  <span style={{ color: '#e2e8f0' }}>{l.details}</span>
                ) : (
                  <>
                    FedAvg ✓ — Acc: <span style={{ color: '#00d2ff' }}>{(l.global_accuracy * 100).toFixed(2)}%</span>{' '}
                    Loss: <span style={{ color: '#ff6b6b' }}>{l.global_loss.toFixed(4)}</span>
                  </>
                )}
              </div>
            ))}
            <div style={{ color: '#667eea', animation: 'pulse 1.5s infinite' }}>&gt; {trainStatus === 'COMPLETED' ? 'Training complete.' : 'Working...'}</div>
          </div>
        </div>
      )}

      {/* ── Training Results ── */}
      {trainingPhase === 'done' && finalResults && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)', border: '1px solid rgba(0,230,118,0.25)', background: 'rgba(0,230,118,0.03)' }}>
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 style={{ margin: 0 }}>🏆 Training Results</h3>
              <span className="badge badge-active">COMPLETED</span>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleStartTraining}
              style={{ fontSize: '0.8rem' }}
            >🔁 Retrain</button>
          </div>

          {/* Result metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '28px' }}>
            <ResultCard icon="🎯" label="Global Accuracy" value={`${(finalResults.globalAccuracy * 100).toFixed(1)}%`} color="#00d2ff" subtitle="FedAvg aggregated" />
            <ResultCard icon="📉" label="Final Loss" value={finalResults.globalLoss.toFixed(4)} color="#ff6b6b" subtitle="Cross-entropy" />
            <ResultCard icon="⚖️" label="F1 Score" value={finalResults.localF1 > 0 ? finalResults.localF1.toFixed(3) : '—'} color="#f6ad55" subtitle="Macro average" />
            <ResultCard icon="🔍" label="Precision" value={finalResults.localPrecision > 0 ? (finalResults.localPrecision * 100).toFixed(1) + '%' : '—'} color="#c084fc" subtitle="Positive predictive" />
            <ResultCard icon="📡" label="Recall" value={finalResults.localRecall > 0 ? (finalResults.localRecall * 100).toFixed(1) + '%' : '—'} color="#4ade80" subtitle="Sensitivity" />
            <ResultCard icon="🔁" label="Rounds" value={finalResults.rounds} color="#818cf8" subtitle="FL aggregations" />
          </div>

          {/* Accuracy + Loss chart */}
          {trainLogs.length > 0 && (
            <div>
              <h4 style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '14px' }}>📈 Training Curve</h4>
              <div style={{ height: '260px' }}>
                <Line data={dualChartData} options={{
                  responsive: true, maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    legend: { labels: { color: '#8892b0', font: { size: 11 }, padding: 20 } },
                    tooltip: { backgroundColor: 'rgba(15,23,52,0.9)', borderColor: 'rgba(102,126,234,0.3)', borderWidth: 1 }
                  },
                  scales: {
                    x: { ticks: { color: '#5c6484', font: { size: 11 } }, grid: { color: 'rgba(102,126,234,0.06)' } },
                    y: {
                      ticks: { color: '#5c6484', font: { size: 11 } }, grid: { color: 'rgba(102,126,234,0.06)' },
                      title: { display: true, text: 'Accuracy (%)', color: '#8892b0', font: { size: 11 } }
                    },
                    y1: {
                      position: 'right', ticks: { color: '#5c6484', font: { size: 11 } }, grid: { display: false },
                      title: { display: true, text: 'Loss', color: '#8892b0', font: { size: 11 } }
                    }
                  }
                }} />
              </div>
            </div>
          )}

          {/* Per-round table */}
          {trainLogs.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h4 style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>📋 Round-by-Round Summary</h4>
              <table className="data-table">
                <thead>
                  <tr><th>Round</th><th>Global Accuracy</th><th>Global Loss</th></tr>
                </thead>
                <tbody>
                  {trainLogs.map(l => (
                    <tr key={l.round_number}>
                      <td style={{ fontWeight: 600 }}>Round {l.round_number}</td>
                      <td style={{ color: '#00d2ff', fontWeight: 600 }}>{(l.global_accuracy * 100).toFixed(2)}%</td>
                      <td style={{ color: '#ff6b6b' }}>{l.global_loss.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Feature Schema ── */}
      {featureCols.length > 0 && (
        <div className="card">
          <div className="section-header">
            <h3>🧬 Feature Schema</h3>
            <span className="badge badge-training">Target: <strong>{server.target_column}</strong></span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {featureCols.map((col, i) => (
              <span key={i} style={{
                padding: '5px 14px', borderRadius: '8px', fontSize: 'var(--font-size-sm)', fontWeight: 500,
                background: 'rgba(102,126,234,0.1)', border: '1px solid rgba(102,126,234,0.25)',
                color: 'var(--color-text-primary)'
              }}>{col}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
