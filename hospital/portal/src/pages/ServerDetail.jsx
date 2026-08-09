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
    addToast('Syncing with central coordinator...', 'info')
    try {
      const res = await triggerSync()
      if (res.data.status === 'idle') {
        addToast('No active training rounds requiring submission.', 'info')
      } else {
        addToast(res.data.message || 'Sync successful!', 'success')
      }
      // Reload history
      const historyRes = await getTrainingHistory(id)
      setHistory(historyRes.data || [])
    } catch (err) {
      addToast(err.response?.data?.detail || 'Sync failed', 'error')
    } finally {
      setSyncing(false)
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
          <div className="glass-panel" style={{ padding: '20px' }}>
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
          <div className="glass-panel" style={{ padding: '20px' }}>
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
          <div className="glass-panel" style={{ padding: '20px' }}>
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
                    style={{ padding: '8px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
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
                <button 
                  className="btn btn-secondary" 
                  onClick={handleSyncNode} 
                  disabled={syncing || !dataset}
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '10px' }}
                >
                  {syncing ? <span className="spinner-small"></span> : <HiOutlineGlobe />} Poll & Submit Round
                </button>
              </div>
            </div>

            {/* Terminal logs during train */}
            {(training || logs.length > 0) && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', marginBottom: '8px' }}>
                  <HiOutlineTerminal /> Live Execution Log
                </h4>
                <div style={{ height: '160px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '10px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#10b981', overflowY: 'auto' }}>
                  {logs.map((log, idx) => (
                    <div key={idx} style={{ marginBottom: '3px' }}>{log}</div>
                  ))}
                  <div ref={logTerminalEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* Local Training History Table */}
          <div className="glass-panel" style={{ padding: '20px' }}>
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
