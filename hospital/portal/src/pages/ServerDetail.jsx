import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  getServer, getDatasets, startLocalTraining, 
  getTrainingLogs, triggerSync, getTrainingHistory 
} from '../api'
import Loader from '../components/Loader'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineChevronLeft, HiOutlineServer, HiOutlineDatabase, 
  HiOutlinePlay, HiOutlineGlobe, HiOutlineTerminal,
  HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineClock
} from 'react-icons/hi'

export default function ServerDetail() {
  const { id } = useParams()
  const [server, setServer] = useState(null)
  const [dataset, setDataset] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [training, setTraining] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncText, setSyncText] = useState('')
  const [logs, setLogs] = useState([])
  const [epochs, setEpochs] = useState(10)
  const { addToast } = useApp()
  const logPollIntervalRef = useRef(null)
  const logTerminalEndRef = useRef(null)

  useEffect(() => {
    loadData()
    return () => stopLogPolling()
  }, [id])

  useEffect(() => {
    logTerminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  async function loadData() {
    try {
      setLoading(true)
      const [serverRes, datasetsRes, historyRes] = await Promise.all([
        getServer(id),
        getDatasets(id),
        getTrainingHistory(id)
      ])

      setServer(serverRes.data)
      // Find dataset for this specific server
      const ds = (datasetsRes.data || []).find(d => d.server_id === parseInt(id))
      setDataset(ds || null)
      setHistory(historyRes.data || [])
    } catch (e) {
      addToast('Failed to load server workspace details', 'error')
    } finally {
      setLoading(false)
    }
  }

  function startLogPolling() {
    stopLogPolling()
    logPollIntervalRef.current = setInterval(async () => {
      try {
        const res = await getTrainingLogs(id)
        if (res.data) setLogs(res.data)
      } catch (e) {
        console.error(e)
      }
    }, 1500)
  }

  function stopLogPolling() {
    if (logPollIntervalRef.current) {
      clearInterval(logPollIntervalRef.current)
      logPollIntervalRef.current = null
    }
  }

  const handleStartLocalTraining = async () => {
    if (!dataset) {
      addToast('No local dataset uploaded for this server yet!', 'error')
      return
    }

    setTraining(true)
    setLogs(['[LOCAL] Starting local training execution...', '[LOCAL] Loading CSV dataset...'])
    startLogPolling()

    try {
      await startLocalTraining({
        server_id: parseInt(id),
        epochs: parseInt(epochs)
      })

      stopLogPolling()
      const finalLogsRes = await getTrainingLogs(id)
      if (finalLogsRes.data) setLogs(finalLogsRes.data)
      
      addToast('Local model training completed successfully!', 'success')
      
      // Reload history
      const historyRes = await getTrainingHistory(id)
      setHistory(historyRes.data || [])
    } catch (err) {
      stopLogPolling()
      const msg = err.response?.data?.detail || 'Training failed'
      addToast(msg, 'error')
      setLogs(prev => [...prev, `[ERROR] Training aborted: ${msg}`])
    } finally {
      setTraining(false)
    }
  }

  const handleSyncNode = async () => {
    setSyncing(true)
    setSyncProgress(0)
    setSyncText('Contacting Central Coordinator...')
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 90) return prev
        const increment = Math.random() * 15
        return Math.min(prev + increment, 90)
      })
      setSyncText(prev => {
        if (prev.includes('Contacting') && Math.random() > 0.5) return 'Downloading global seed weights...'
        if (prev.includes('Downloading') && Math.random() > 0.5) return 'Training local parameters...'
        if (prev.includes('Training') && Math.random() > 0.5) return 'Uploading weight updates...'
        return prev
      })
    }, 400)

    try {
      const res = await triggerSync()
      clearInterval(progressInterval)
      setSyncProgress(100)
      setSyncText('Synchronization Complete!')
      
      if (res.data.status === 'idle') {
        addToast('No active training rounds requiring submission.', 'info')
      } else {
        addToast(res.data.message || 'Sync successful!', 'success')
      }
      // Reload history
      const historyRes = await getTrainingHistory(id)
      setHistory(historyRes.data || [])
    } catch (err) {
      clearInterval(progressInterval)
      addToast(err.response?.data?.detail || 'Sync failed', 'error')
    } finally {
      setTimeout(() => {
        setSyncing(false)
        setSyncProgress(0)
        setSyncText('')
      }, 1500)
    }
  }

  if (loading) {
    return <Loader message="Loading workspace parameters..." />
  }

  if (!server) {
    return (
      <div className="glass-panel text-center" style={{ padding: '48px' }}>
        <p>Disease server network not found or connection lost.</p>
        <Link to="/servers" className="btn btn-secondary" style={{ marginTop: '16px' }}>Back to Networks</Link>
      </div>
    )
  }

  return (
    <div className="server-detail fade-in">
      <div style={{ marginBottom: '20px' }}>
        <Link to="/servers" className="btn-small btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <HiOutlineChevronLeft /> Back to Networks
        </Link>
      </div>

      <div className="page-header" style={{ marginTop: 0 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HiOutlineServer style={{ color: '#38bdf8' }} /> {server.name}
          </h2>
          <p>{server.description}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
        {/* Left Column: Server Status & Data Management */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Status Card */}
          <div className="card" style={{ padding: '20px' }}>
            <h3>Pipeline Configuration</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.7 }}>Target Disease</span>
                <strong>{server.disease_type}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.7 }}>Model Architecture</span>
                <span className="badge badge-info">{server.model_type?.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.7 }}>Federated Algorithm</span>
                <strong>{server.fl_algorithm}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.7 }}>Coordinated Rounds Limit</span>
                <strong>{server.num_rounds} rounds</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.7 }}>Active Round State</span>
                <span className="badge badge-success">Round {server.current_round}</span>
              </div>
            </div>
          </div>

          {/* Local Dataset Status */}
          <div className="card" style={{ padding: '20px' }}>
            <h3>Local Dataset Status</h3>
            {dataset ? (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '0.9rem', fontWeight: 600 }}>
                  <HiOutlineCheckCircle size={20} /> Dataset Custody Active
                </div>
                <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div>Filename: <strong>{dataset.filename}</strong></div>
                  <div>Record Count: <strong>{dataset.row_count} patient samples</strong></div>
                  <div>Target Class Column: <strong>{dataset.target_column}</strong></div>
                  <div style={{ wordBreak: 'break-all', fontSize: '0.75rem', opacity: 0.6, fontFamily: 'monospace' }}>
                    Path: {dataset.file_path}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <Link to="/datasets/validation" state={{ datasetId: dataset.id }} className="btn btn-secondary btn-sm" style={{ flex: 1, textAlign: 'center' }}>
                    Deep Validation
                  </Link>
                  <Link to="/predictions" className="btn btn-primary btn-sm" style={{ flex: 1, textAlign: 'center' }}>
                    Run Predictions
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '16px', textAlign: 'center', padding: '16px' }}>
                <HiOutlineExclamationCircle size={36} style={{ color: '#fbbf24', margin: '0 auto 12px auto' }} />
                <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>No local dataset uploaded to this server network.</p>
                <Link to="/datasets" className="btn btn-primary btn-sm" style={{ marginTop: '12px', display: 'inline-block' }}>
                  Go to Upload
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Training controls & history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Training Control Area */}
          <div className="card" style={{ padding: '20px' }}>
            <h3>Node Model Actions</h3>
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Local Epochs</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100" 
                    value={epochs} 
                    onChange={(e) => setEpochs(e.target.value)} 
                    disabled={training}
                    style={{ padding: '8px', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--color-border)', color: '#fff', borderRadius: '6px' }}
                  />
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={handleStartLocalTraining} 
                  disabled={training || !dataset}
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '12px', padding: '10px' }}
                >
                  {training ? <span className="spinner-small"></span> : <HiOutlinePlay />} Start Local Training
                </button>
              </div>

              <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                {syncing ? (
                  <div style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '12px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: 'linear-gradient(90deg, rgba(79, 209, 197, 0.2), rgba(99, 179, 237, 0.4))', width: `${syncProgress}%`, transition: 'width 0.3s ease-out' }} />
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#e2e8f0' }}>
                        <span className="spinner-small" style={{ borderColor: '#4FD1C5', borderTopColor: 'transparent', width: '14px', height: '14px' }}></span>
                        {syncText}
                      </div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4FD1C5' }}>{Math.round(syncProgress)}%</span>
                    </div>
                  </div>
                ) : (
                  <button 
                    className="btn btn-secondary" 
                    onClick={handleSyncNode} 
                    disabled={!dataset}
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '10px' }}
                  >
                    <HiOutlineGlobe /> Poll & Submit Round
                  </button>
                )}
              </div>
            </div>

            {/* Terminal logs during train */}
            {(training || logs.length > 0) && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', marginBottom: '8px' }}>
                  <HiOutlineTerminal /> Live Execution Log
                </h4>
                <div className="fade-in" style={{ height: '220px', display: 'flex', flexDirection: 'column', background: '#000000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5), 0 4px 15px rgba(0,0,0,0.2)' }}>
                  {/* Terminal Header */}
                  <div style={{ padding: '10px 14px', background: '#111111', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF5F56', boxShadow: '0 0 5px rgba(255, 95, 86, 0.4)' }} />
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FFBD2E', boxShadow: '0 0 5px rgba(255, 189, 46, 0.4)' }} />
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27C93F', boxShadow: '0 0 5px rgba(39, 201, 63, 0.4)' }} />
                    <span style={{ marginLeft: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: '500' }}>bash -- server-execution-logs</span>
                  </div>
                  {/* Logs Content */}
                  <div style={{ flex: 1, padding: '14px', fontFamily: '"Fira Code", "Courier New", Courier, monospace', fontSize: '0.8rem', color: '#E2E8F0', overflowY: 'auto' }}>
                    {logs.map((log, idx) => (
                      <div key={idx} style={{ marginBottom: '6px', whiteSpace: 'pre-wrap', lineHeight: '1.5', color: log.includes('[ERROR]') || log.includes('corrupt') || log.includes('Invalid') ? '#FC8181' : log.includes('[WARNING]') ? '#F6AD55' : log.includes('Success') || log.includes('successfully') ? '#68D391' : '#E2E8F0', fontWeight: log.includes('Epoch') || log.includes('Success') || log.includes('successfully') ? '600' : '400' }}>
                        <span style={{ color: '#4FD1C5', marginRight: '8px', userSelect: 'none', fontWeight: '700' }}>❯</span>
                        {log}
                      </div>
                    ))}
                    <div ref={logTerminalEndRef} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Local Training History Table */}
          <div className="card" style={{ padding: '20px' }}>
            <h3>Execution Run History</h3>
            <div className="table-responsive" style={{ marginTop: '12px' }}>
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Round</th>
                    <th>Accuracy</th>
                    <th>F1-Score</th>
                    <th>Loss</th>
                    <th>Trained Samples</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center">No runs logged for this pipeline.</td>
                    </tr>
                  ) : (
                    history.map(hist => (
                      <tr key={hist.id}>
                        <td>
                          {hist.round_number === 0 ? (
                            <span className="badge badge-secondary">Local Run</span>
                          ) : (
                            <span className="badge badge-success">Round {hist.round_number}</span>
                          )}
                        </td>
                        <td>{(hist.local_accuracy * 100).toFixed(1)}%</td>
                        <td>{(hist.local_f1 * 100).toFixed(1)}%</td>
                        <td>{hist.local_loss.toFixed(4)}</td>
                        <td>{hist.samples_trained}</td>
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
