import { useState, useEffect, useRef } from 'react'
import { getServers, getDatasets, startLocalTraining, getTrainingLogs, getTrainingHistory } from '../api'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlinePlay, HiOutlineRefresh, HiOutlineDatabase, 
  HiOutlineTerminal, HiOutlineCheckCircle, HiOutlineClock 
} from 'react-icons/hi'

export default function LocalTraining() {
  const [servers, setServers] = useState([])
  const [datasets, setDatasets] = useState([])
  const [selectedServerId, setSelectedServerId] = useState('')
  const [epochs, setEpochs] = useState(10)
  const [training, setTraining] = useState(false)
  const [logs, setLogs] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('history') // 'history' or 'logs'
  const logTerminalEndRef = useRef(null)
  const { addToast } = useApp()
  const logPollIntervalRef = useRef(null)

  useEffect(() => {
    loadData()
    return () => stopLogPolling()
  }, [])

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (activeTab === 'logs') {
      logTerminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, activeTab])

  async function loadData() {
    try {
      setLoading(true)
      const [serversRes, datasetsRes, historyRes] = await Promise.all([
        getServers().catch(() => ({ data: [] })),
        getDatasets().catch(() => ({ data: [] })),
        getTrainingHistory().catch(() => ({ data: [] }))
      ])

      const approvedServers = (serversRes.data || []).filter(
        s => s.is_member || s.member_status === 'APPROVED'
      )
      setServers(approvedServers)
      setDatasets(datasetsRes.data || [])
      
      // Filter local-only history (round = 0)
      const localHist = (historyRes.data || []).filter(h => h.round_number === 0)
      setHistory(localHist)

      if (approvedServers.length > 0) {
        setSelectedServerId(approvedServers[0].id)
      }
    } catch (e) {
      addToast('Failed to load training configuration data', 'error')
    } finally {
      setLoading(false)
    }
  }

  function startLogPolling(serverId) {
    stopLogPolling()
    // Poll logs every 1.5 seconds
    logPollIntervalRef.current = setInterval(async () => {
      try {
        const res = await getTrainingLogs(serverId)
        if (res.data) setLogs(res.data)
      } catch (e) {
        console.error('Error fetching logs', e)
      }
    }, 1500)
  }

  function stopLogPolling() {
    if (logPollIntervalRef.current) {
      clearInterval(logPollIntervalRef.current)
      logPollIntervalRef.current = null
    }
  }

  const handleStartTraining = async (e) => {
    e.preventDefault()
    if (!selectedServerId) {
      addToast('Please select a disease server to train', 'warning')
      return
    }

    const hasDs = datasets.some(d => d.server_id === parseInt(selectedServerId))
    if (!hasDs) {
      addToast('No local dataset uploaded for this disease server!', 'error')
      return
    }

    setTraining(true)
    setLogs(['[LOCAL] Submitting local training execution request...', '[LOCAL] Allocating container space and loading packages...'])
    setActiveTab('logs')
    startLogPolling(selectedServerId)

    try {
      const res = await startLocalTraining({
        server_id: parseInt(selectedServerId),
        epochs: parseInt(epochs)
      })

      stopLogPolling()
      
      // Fetch final logs once
      const finalLogsRes = await getTrainingLogs(selectedServerId)
      if (finalLogsRes.data) setLogs(finalLogsRes.data)

      addToast('Local model training completed successfully!', 'success')
      
      // Reload history and set tab back
      const historyRes = await getTrainingHistory()
      const localHist = (historyRes.data || []).filter(h => h.round_number === 0)
      setHistory(localHist)
      setActiveTab('history')
    } catch (err) {
      stopLogPolling()
      const msg = err.response?.data?.detail || 'Local training failed'
      addToast(msg, 'error')
      setLogs(prev => [...prev, `[ERROR] Training aborted: ${msg}`])
    } finally {
      setTraining(false)
    }
  }

  const currentServer = servers.find(s => s.id === parseInt(selectedServerId))

  if (loading) {
    return <div className="loader"><div className="spinner"></div></div>
  }

  return (
    <div className="local-training-page fade-in">
      <div className="page-header">
        <div>
          <h2>Local Model Training</h2>
          <p>Run model training locally on your custody data. No raw datasets or coefficients are exposed.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
        {/* Left Panel: Start Training Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3>Launch Training Run</h3>
            <form onSubmit={handleStartTraining} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label>Disease Network / System</label>
                <select 
                  value={selectedServerId} 
                  onChange={(e) => {
                    setSelectedServerId(e.target.value)
                    setLogs([])
                  }}
                  disabled={training}
                  style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
                >
                  {servers.length === 0 ? (
                    <option value="">No approved servers</option>
                  ) : (
                    servers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.disease_type})</option>
                    ))
                  )}
                </select>
              </div>

              {currentServer && (
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ opacity: 0.7 }}>Model Type</span>
                    <strong>{currentServer.model_type?.toUpperCase()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ opacity: 0.7 }}>Aggregation Algorithm</span>
                    <strong>{currentServer.fl_algorithm?.toUpperCase()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.7 }}>Local Dataset Uploaded</span>
                    <strong style={{ color: datasets.some(d => d.server_id === currentServer.id) ? '#34d399' : '#f87171' }}>
                      {datasets.some(d => d.server_id === currentServer.id) ? 'Yes' : 'No Dataset'}
                    </strong>
                  </div>
                </div>
              )}

              <div className="input-group">
                <label>Training Epochs</label>
                <input 
                  type="number" 
                  min="1" 
                  max="100" 
                  value={epochs} 
                  onChange={(e) => setEpochs(e.target.value)}
                  disabled={training}
                  style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={training || !selectedServerId || !datasets.some(d => d.server_id === parseInt(selectedServerId))}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', padding: '12px' }}
              >
                {training ? (
                  <>
                    <span className="spinner-small"></span> Training Model...
                  </>
                ) : (
                  <>
                    <HiOutlinePlay size={18} />
                    Start Local Training
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Panel: Terminal logs / History tabs */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '480px' }}>
          <div className="tabs-header" style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px' }}>
            <button 
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
              style={{ background: 'none', border: 'none', color: activeTab === 'history' ? '#38bdf8' : '#9ea7c0', cursor: 'pointer', fontWeight: 600 }}
            >
              <HiOutlineClock size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Training Runs
            </button>
            <button 
              className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
              style={{ background: 'none', border: 'none', color: activeTab === 'logs' ? '#38bdf8' : '#9ea7c0', cursor: 'pointer', fontWeight: 600 }}
            >
              <HiOutlineTerminal size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Execution Logs
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeTab === 'history' && (
              <div className="history-tab fade-in">
                {history.length === 0 ? (
                  <div className="empty-state">No previous local training executions.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {history.map(hist => {
                      const srv = servers.find(s => s.id === hist.server_id)
                      return (
                        <div key={hist.id} className="history-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <strong>{srv ? srv.name : `Server #${hist.server_id}`}</strong>
                            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                              {new Date(hist.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '0.8rem', textAlign: 'center', marginTop: '8px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px' }}>
                              <div style={{ opacity: 0.6, fontSize: '0.7rem' }}>Accuracy</div>
                              <strong>{(hist.local_accuracy * 100).toFixed(1)}%</strong>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px' }}>
                              <div style={{ opacity: 0.6, fontSize: '0.7rem' }}>F1-Score</div>
                              <strong>{(hist.local_f1 * 100).toFixed(1)}%</strong>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px' }}>
                              <div style={{ opacity: 0.6, fontSize: '0.7rem' }}>Loss</div>
                              <strong>{hist.local_loss.toFixed(4)}</strong>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px' }}>
                              <div style={{ opacity: 0.6, fontSize: '0.7rem' }}>Samples</div>
                              <strong>{hist.samples_trained}</strong>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="terminal-logs fade-in" style={{ height: '100%', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '12px', fontFamily: 'monospace', fontSize: '0.85rem', color: '#10b981', overflowY: 'auto' }}>
                {logs.length === 0 ? (
                  <div style={{ color: '#9ea7c0', opacity: 0.5 }}>Execution terminal idle. Logs will display here during run.</div>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} style={{ marginBottom: '4px', whiteSpace: 'pre-wrap' }}>
                      {log}
                    </div>
                  ))
                )}
                <div ref={logTerminalEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
