import { useState, useEffect, useRef } from 'react'
import { getServers, getDatasets, startLocalTraining, getTrainingLogs, getTrainingHistory } from '../api'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlinePlay, HiOutlineRefresh, HiOutlineDatabase, 
  HiOutlineTerminal, HiOutlineCheckCircle, HiOutlineClock,
  HiOutlineServer
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
    return (
      <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
        <div style={{ height: '100px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
          <div style={{ height: '500px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: '500px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="local-training-page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Local Model Training
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Run model training locally on your custody data. No raw datasets or coefficients are exposed.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
        {/* Left Panel: Start Training Form */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Launch Training Run</h3>
          <form onSubmit={handleStartTraining} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Disease Network / System</label>
              <select 
                className="form-select"
                value={selectedServerId} 
                onChange={(e) => {
                  setSelectedServerId(e.target.value)
                  setLogs([])
                }}
                disabled={training}
                style={{ marginBottom: 0 }}
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
              <div style={{ padding: '16px', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Model Type</span>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{currentServer.model_type?.toUpperCase()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Aggregation Algorithm</span>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{currentServer.fl_algorithm?.toUpperCase()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Local Dataset Status</span>
                  <strong style={{ color: datasets.some(d => d.server_id === currentServer.id) ? 'var(--color-accent-green)' : 'var(--color-accent-red)' }}>
                    {datasets.some(d => d.server_id === currentServer.id) ? 'Uploaded' : 'No Dataset'}
                  </strong>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Training Epochs</label>
              <input 
                type="number" 
                className="form-input"
                min="1" 
                max="100" 
                value={epochs} 
                onChange={(e) => setEpochs(e.target.value)}
                disabled={training}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={training || !selectedServerId || !datasets.some(d => d.server_id === parseInt(selectedServerId))}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', padding: '14px', fontSize: '0.9rem', marginTop: '8px' }}
            >
              {training ? (
                'Processing Training Run...'
              ) : (
                <>
                  <HiOutlinePlay size={20} />
                  Start Local Training
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Panel: Terminal logs / History tabs */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '560px', padding: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '16px' }}>
            <button 
              onClick={() => setActiveTab('history')}
              style={{ 
                background: activeTab === 'history' ? 'var(--color-bg-secondary)' : 'transparent', 
                border: 'none', 
                color: activeTab === 'history' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', 
                cursor: 'pointer', 
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <HiOutlineClock size={18} /> Training Runs
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              style={{ 
                background: activeTab === 'logs' ? 'var(--color-bg-secondary)' : 'transparent', 
                border: 'none', 
                color: activeTab === 'logs' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', 
                cursor: 'pointer', 
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <HiOutlineTerminal size={18} /> Execution Logs
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeTab === 'history' && (
              <div className="fade-in">
                {history.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>No previous local training executions.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {history.map(hist => {
                      const srv = servers.find(s => s.id === hist.server_id)
                      return (
                        <div key={hist.id} style={{ padding: '16px', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-bg-secondary)', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <HiOutlineServer size={18} />
                              </div>
                              <strong style={{ color: 'var(--color-text-primary)' }}>{srv ? srv.name : `Server #${hist.server_id}`}</strong>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                              {new Date(hist.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                            <div style={{ background: '#FAFAFD', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Accuracy</div>
                              <strong style={{ color: 'var(--color-accent-blue)', fontSize: '1rem' }}>{(hist.local_accuracy * 100).toFixed(1)}%</strong>
                            </div>
                            <div style={{ background: '#FAFAFD', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>F1-Score</div>
                              <strong style={{ color: 'var(--color-accent-blue)', fontSize: '1rem' }}>{(hist.local_f1 * 100).toFixed(1)}%</strong>
                            </div>
                            <div style={{ background: '#FAFAFD', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Loss</div>
                              <strong style={{ color: 'var(--color-accent-red)', fontSize: '1rem' }}>{hist.local_loss.toFixed(4)}</strong>
                            </div>
                            <div style={{ background: '#FAFAFD', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Samples</div>
                              <strong style={{ color: 'var(--color-text-primary)', fontSize: '1rem' }}>{hist.samples_trained}</strong>
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
              <div className="fade-in" style={{ height: '100%', background: '#FAFAFD', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--color-text-primary)', overflowY: 'auto' }}>
                {logs.length === 0 ? (
                  <div style={{ color: 'var(--color-text-muted)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Execution terminal idle. Logs will display here during run.</div>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} style={{ marginBottom: '6px', whiteSpace: 'pre-wrap', color: log.includes('[ERROR]') ? 'var(--color-accent-red)' : log.includes('[WARNING]') ? 'var(--color-accent-orange)' : 'var(--color-text-primary)' }}>
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
