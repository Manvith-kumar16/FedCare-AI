import { useState, useEffect, useRef } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { getDatasets, getDatasetStats, getDatasetPreview, uploadDataset, startTraining, getTrainingStatus, clearDatasets, getServers } from '../api'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineDatabase, HiOutlineLightningBolt, HiOutlineShieldCheck,
  HiOutlineTrash, HiOutlineUpload, HiOutlineChartBar,
  HiOutlineOfficeBuilding, HiOutlineAdjustments, HiOutlineEye,
  HiOutlineRefresh, HiOutlineTemplate
} from 'react-icons/hi'

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function Datasets() {
  const [servers, setServers] = useState([])
  const [selectedServer, setSelectedServer] = useState(null)
  const [datasets, setDatasets] = useState([])
  const [stats, setStats] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const { addToast } = useApp()

  // Simulation State
  const [simulationActive, setSimulationActive] = useState(false)
  const [simRound, setSimRound] = useState(0)
  const [simLogs, setSimLogs] = useState([])
  const [simStatus, setSimStatus] = useState('Idle')

  useEffect(() => { loadServers() }, [])

  useEffect(() => {
    if (selectedServer) {
      loadData(selectedServer.id)
    } else {
      setDatasets([])
      setStats(null)
      setPreview(null)
    }
  }, [selectedServer])

  // Real Training Polling
  useEffect(() => {
    let interval
    if (simulationActive && simStatus !== 'Completed' && selectedServer) {
      interval = setInterval(async () => {
        try {
          const res = await getTrainingStatus(selectedServer.id)
          const data = res?.data
          if (!data) return

          if (data.status === 'TRAINING') {
            setSimStatus('Aggregating Global Model...')
            setSimRound(data.current_round || 0)
          } else if (data.status === 'COMPLETED') {
            setSimStatus('Completed')
            setSimRound(data.num_rounds || 5)
            addToast('Federated training complete using your data!', 'success')
            clearInterval(interval)
            loadData(selectedServer.id)
          } else if (data.status === 'ACTIVE') {
            setSimStatus('Preparing nodes...')
          }

          if (data.logs && Array.isArray(data.logs)) {
            const history = data.logs
              .filter(l => l && l.log_type === 'global')
              .map(l => ({
                round: l.round_number || 0,
                accuracy: l.global_accuracy || 0,
                loss: l.global_loss || 0
              }))
            setSimLogs(history)
          }
        } catch (e) {
          console.error("Polling error", e)
        }
      }, 2000)
    }
    return () => clearInterval(interval)
  }, [simulationActive, simStatus])

  async function loadServers() {
    setLoading(true)
    try {
      const res = await getServers()
      // Only show active or completed servers
      const validServers = res.data.filter(s => s.status !== 'PENDING')
      setServers(validServers)
      if (validServers.length > 0) {
        setSelectedServer(validServers[0])
      } else {
        setLoading(false)
      }
    } catch (err) {
      addToast("Failed to load servers", "error")
      setLoading(false)
    }
  }

  function handleServerChange(e) {
    const srv = servers.find(s => s.id === parseInt(e.target.value))
    setSelectedServer(srv)
    setSimulationActive(false)
    setSimLogs([])
  }

  async function loadData(serverId) {
    setLoading(true)
    try {
      const [dsRes, statsRes] = await Promise.all([
        getDatasets(serverId),
        getDatasetStats(serverId),
      ])
      setDatasets(dsRes.data)
      setStats(statsRes.data)
    } catch (e) {
      addToast('Failed to load datasets', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadPreview(id) {
    try {
      const res = await getDatasetPreview(id, 8)
      setPreview(res.data)
    } catch (e) {
      addToast('Failed to load preview', 'error')
    }
  }

  async function handleFileUpload(e) {
    if (!selectedServer) return
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    addToast('Uploading ' + file.name + ' to network...', 'info')
    try {
      await uploadDataset(selectedServer.id, file)
      addToast('Data uploaded successfully! Initializing Federated Learning...', 'success')

      await loadData(selectedServer.id) // Refresh list with real data

      // Trigger Actual Backend Training
      await startTraining({ server_id: selectedServer.id, num_rounds: 5, local_epochs: 5 })
      setSimulationActive(true)
      setSimStatus('Training Started')
      setSimRound(0)
      setSimLogs([])
    } catch (err) {
      addToast(err.response?.data?.detail || 'Training initialization failed', 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleClearDatasets() {
    if (!selectedServer) return
    if (!window.confirm("Are you sure you want to delete all dummy datasets? This will permit a fresh start with only your uploaded data.")) return
    try {
      await clearDatasets(selectedServer.id)
      addToast('All datasets cleared!', 'success')
      loadData(selectedServer.id)
    } catch (e) {
      addToast('Failed to clear data', 'error')
    }
  }

  const hospitalData = stats?.per_hospital || []
  const barData = {
    labels: hospitalData.map(h => h.hospital_name?.split(' ').slice(0, 2).join(' ') || 'Hospital'),
    datasets: [{
      label: 'Patient Records',
      data: hospitalData.map(h => h.rows),
      backgroundColor: ['rgba(102, 126, 234, 0.7)', 'rgba(118, 75, 162, 0.7)', 'rgba(0, 210, 255, 0.7)', 'rgba(0, 230, 118, 0.7)'],
      borderRadius: 8,
      borderSkipped: false,
    }]
  }

  // Simulation Chart Data
  const simChartData = {
    labels: simLogs.map(l => `Round ${l.round}`),
    datasets: [
      {
        label: 'Model Accuracy',
        data: simLogs.map(l => (l.accuracy * 100).toFixed(2)),
        borderColor: '#00d2ff',
        backgroundColor: 'rgba(0, 210, 255, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Training Loss',
        data: simLogs.map(l => l.loss.toFixed(3)),
        borderColor: '#ff5252',
        tension: 0.4,
        fill: false,
        borderDash: [5, 5],
      }
    ]
  }

  if (loading) return <div className="loader"><div className="spinner"></div></div>

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <HiOutlineDatabase style={{ color: 'var(--color-accent-orange)' }} /> Hospital Datasets
            </h1>
            <p style={{ fontSize: 'var(--font-size-xs)' }}>Manage local datasets for federated learning nodes</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {simulationActive && (
              <button className="btn btn-secondary" onClick={() => { setSimulationActive(false); setSimRound(0); }}>
                Reset Simulation
              </button>
            )}
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
            <div className="card-controls" style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleClearDatasets} style={{ marginRight: '8px', fontSize: '0.75rem' }}>
                <HiOutlineTrash /> Clear All Data
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => fileInputRef.current.click()}
                disabled={uploading}
                style={{ fontSize: '0.75rem' }}
              >
                {uploading ? '⌛ Uploading...' : <><HiOutlineUpload /> Upload Dataset</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-lg)', padding: '12px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.65rem' }}>Select Disease Model Pipeline</label>
          <select
            className="form-input"
            value={selectedServer?.id || ''}
            onChange={handleServerChange}
            disabled={servers.length === 0}
            style={{ padding: '8px' }}
          >
            {servers.length === 0 && <option value="">No Active Models Available</option>}
            {servers.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.disease_type})</option>
            ))}
          </select>
        </div>
      </div>

      {selectedServer && (
        <>
          {simulationActive && (
            <div className="card" style={{ marginBottom: 'var(--space-lg)', border: '1px solid var(--color-accent-blue)', background: 'rgba(102, 126, 234, 0.03)', padding: '12px' }}>
              <div className="section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="metric-icon blue" style={{ marginBottom: 0, width: 28, height: 28, fontSize: '0.9rem' }}>
                    <HiOutlineLightningBolt />
                  </div>
                  <h3 style={{ fontSize: 'var(--font-size-md)' }}>Training Simulation Active</h3>
                  <span className={`badge ${simStatus === 'Completed' ? 'badge-active' : 'badge-training'}`} style={{ fontSize: '0.6rem' }}>
                    {simStatus}
                  </span>
                </div>
              </div>

              <div className="content-grid" style={{ gap: '12px' }}>
                <div>
                  <div className="progress-bar" style={{ height: '8px', marginBottom: '12px' }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(simRound / 5) * 100}%`,
                        animation: simStatus !== 'Completed' ? 'shimmer 1.5s infinite' : 'none',
                        background: simStatus === 'Completed' ? 'var(--gradient-success)' : 'var(--gradient-primary)'
                      }}
                    ></div>
                  </div>

                  <div className="metrics-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <div className="metric-card" style={{ padding: '8px' }}>
                      <div className="metric-label" style={{ fontSize: '0.6rem' }}>Current Round</div>
                      <div className="metric-value" style={{ fontSize: '1rem' }}>{simRound} / 5</div>
                    </div>
                    <div className="metric-card" style={{ padding: '8px' }}>
                      <div className="metric-label" style={{ fontSize: '0.6rem' }}>Global Accuracy</div>
                      <div className="metric-value" style={{ fontSize: '1rem', color: 'var(--color-accent-cyan)' }}>
                        {simLogs.length > 0 ? ((simLogs[simLogs.length - 1].accuracy || 0) * 100).toFixed(1) : '0.0'}%
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '20px', padding: '12px', borderRadius: '8px', background: 'rgba(15, 23, 52, 0.6)', border: '1px solid var(--color-border)' }}>
                    <h4 style={{ fontSize: 'var(--font-size-sm)', marginBottom: '10px', color: 'var(--color-text-secondary)' }}>Live Process Log</h4>
                    <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: 'var(--font-size-xs)', fontFamily: 'monospace' }}>
                      {simLogs.map((log, i) => (
                        <div key={i} style={{ marginBottom: '4px', color: '#a0aec0' }}>
                          <span style={{ color: 'var(--color-accent-blue)' }}>[ROUND {log.round}]</span> Distributed training on new client nodes... OK. Aggregating weights... Loss: {log.loss.toFixed(4)}
                        </div>
                      ))}
                      {simStatus !== 'Completed' && simulationActive && (
                        <div style={{ color: 'var(--color-accent-cyan)', animation: 'pulse 1.5s infinite' }}>
                          {'>'} Processing local gradients and encrypted model updates...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="chart-container" style={{ height: '220px' }}>
                  <Line
                    data={simChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { display: false },
                        y: { ticks: { color: '#5c6484', font: { size: 10 } }, grid: { color: 'rgba(102, 126, 234, 0.03)' } }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon blue"><HiOutlineDatabase /></div>
              <div className="metric-value">{stats?.total_datasets || 0}</div>
              <div className="metric-label">Total Datasets</div>
            </div>
            <div className="metric-card">
              <div className="metric-icon green"><HiOutlineChartBar /></div>
              <div className="metric-value">{(stats?.total_rows || 0).toLocaleString()}</div>
              <div className="metric-label">Total Records</div>
            </div>
            <div className="metric-card">
              <div className="metric-icon cyan"><HiOutlineOfficeBuilding /></div>
              <div className="metric-value">{stats?.total_hospitals || 0}</div>
              <div className="metric-label">Contributing Hospitals</div>
            </div>
            <div className="metric-card">
              <div className="metric-icon orange"><HiOutlineAdjustments /></div>
              <div className="metric-value">{stats?.columns?.length ? stats.columns.length - 1 : 8}</div>
              <div className="metric-label">Features</div>
            </div>
          </div>

          <div className="content-grid">
            {/* Chart */}
            <div className="card">
              <div className="section-header">
                <h3 style={{ fontSize: 'var(--font-size-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HiOutlineChartBar /> Records per Hospital
                </h3>
              </div>
              <div className="chart-container">
                <Bar data={barData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { color: '#5c6484' }, grid: { display: false } },
                    y: { ticks: { color: '#5c6484' }, grid: { color: 'rgba(102, 126, 234, 0.06)' } },
                  }
                }} />
              </div>
            </div>

            {/* Feature List */}
            <div className="card">
              <div className="section-header">
                <h3 style={{ fontSize: 'var(--font-size-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HiOutlineTemplate /> Feature Columns
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(stats?.columns || []).map((col, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px',
                    background: col === 'Outcome' ? 'rgba(255, 82, 82, 0.08)' : 'rgba(15, 23, 52, 0.5)',
                    borderRadius: '8px',
                    border: `1px solid ${col === 'Outcome' ? 'rgba(255, 82, 82, 0.2)' : 'var(--color-border)'}`,
                  }}>
                    <span style={{ fontWeight: 500, color: col === 'Outcome' ? 'var(--color-accent-red)' : 'var(--color-text-primary)' }}>
                      {col}
                    </span>
                    <span className={`badge ${col === 'Outcome' ? 'badge-error' : 'badge-active'}`}>
                      {col === 'Outcome' ? 'Target' : 'Feature'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Datasets Table */}
          <div className="card">
            <div className="section-header">
              <h3 style={{ fontSize: 'var(--font-size-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HiOutlineDatabase /> All Datasets
              </h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hospital</th>
                  <th>Filename</th>
                  <th>Rows</th>
                  <th>Features</th>
                  <th>Size</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map(ds => (
                  <tr key={ds.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-bright)' }}>{ds.hospital_name}</td>
                    <td>{ds.filename}</td>
                    <td>{ds.row_count}</td>
                    <td>{ds.feature_count}</td>
                    <td>{ds.file_size_kb} KB</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => loadPreview(ds.id)}>
                        Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Preview */}
          {preview && (
            <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="section-header">
                <h3 style={{ fontSize: 'var(--font-size-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HiOutlineEye /> Data Preview
                </h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setPreview(null)}>Close</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {preview.columns?.map(col => <th key={col}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows?.map((row, i) => (
                      <tr key={i}>
                        {preview.columns?.map(col => (
                          <td key={col}>{row[col]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ marginTop: '12px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Showing {preview.rows?.length} of {preview.total_rows} rows • Shape: {preview.shape?.[0]} × {preview.shape?.[1]}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

