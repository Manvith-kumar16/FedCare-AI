import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { getServers, getDatasets, getTrainingHistory } from '../api'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineServer, HiOutlineDatabase, HiOutlineTrendingUp, 
  HiOutlineCheckCircle, HiOutlineLightningBolt, HiOutlineShieldCheck,
  HiOutlineExclamationCircle
} from 'react-icons/hi'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

export default function Dashboard() {
  const [servers, setServers] = useState([])
  const [datasets, setDatasets] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useApp()

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      const [serversRes, datasetsRes, historyRes] = await Promise.all([
        getServers().catch(() => ({ data: [] })),
        getDatasets().catch(() => ({ data: [] })),
        getTrainingHistory().catch(() => ({ data: [] }))
      ])

      setServers(serversRes.data || [])
      setDatasets(datasetsRes.data || [])
      setHistory(historyRes.data || [])
    } catch (e) {
      console.error(e)
      addToast('Failed to load dashboard statistics', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Aggregated Stats
  const totalDatasetsCount = datasets.length
  const totalSamplesCount = datasets.reduce((sum, d) => sum + d.row_count, 0)
  const joinedServers = servers.filter(s => s.is_member || s.member_status === 'APPROVED')
  const activeFederatedRounds = joinedServers.filter(s => s.status === 'TRAINING').length

  // Latest Training Metric
  const latestLocalRun = history[0] // Sorted descending by default

  // Chart: Dataset Sample Distribution by Disease System
  const datasetChartData = {
    labels: datasets.map(d => d.filename.split(' ')[0] || d.filename),
    datasets: [{
      label: 'Sample Count',
      data: datasets.map(d => d.row_count),
      backgroundColor: 'rgba(102, 126, 234, 0.6)',
      borderColor: '#667eea',
      borderWidth: 1,
      borderRadius: 6
    }]
  }

  // Chart: Local Model Accuracy Trend
  const chronHistory = [...history].reverse()
  const accuracyTrendData = {
    labels: chronHistory.map((h, i) => `Run #${i + 1} (Rd ${h.round_number})`),
    datasets: [{
      label: 'Local Training Accuracy',
      data: chronHistory.map(h => (h.local_accuracy * 100).toFixed(1)),
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
      tension: 0.3,
      fill: true,
      pointBackgroundColor: '#38bdf8',
      pointBorderColor: '#fff',
      pointRadius: 4
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#9ea7c0', font: { family: 'Inter' } } }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ea7c0' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ea7c0' } }
    }
  }

  if (loading) {
    return <div className="loader"><div className="spinner"></div></div>
  }

  return (
    <div className="dashboard-page fade-in">
      <div className="dashboard-welcome">
        <h2>Hospital Node Dashboard</h2>
        <p>Local data custody, secure training control, and federated learning statistics.</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon database"><HiOutlineDatabase size={24} /></div>
          <div className="stat-details">
            <h3>Custody Datasets</h3>
            <p className="stat-number">{totalDatasetsCount}</p>
            <span className="stat-desc">Physically isolated local files</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon training"><HiOutlineTrendingUp size={24} /></div>
          <div className="stat-details">
            <h3>Local Records</h3>
            <p className="stat-number">{totalSamplesCount}</p>
            <span className="stat-desc">Patient training samples in database</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon servers"><HiOutlineServer size={24} /></div>
          <div className="stat-details">
            <h3>Disease Networks</h3>
            <p className="stat-number">{joinedServers.length} / {servers.length}</p>
            <span className="stat-desc">Authorized federated servers</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon active-rounds"><HiOutlineLightningBolt size={24} /></div>
          <div className="stat-details">
            <h3>Active FL Rounds</h3>
            <p className="stat-number">{activeFederatedRounds}</p>
            <span className="stat-desc">Currently coordinating rounds</span>
          </div>
        </div>
      </div>

      {/* Latest Evaluation Metrics Summary */}
      <div className="glass-panel" style={{ padding: '20px', marginTop: '24px' }}>
        <h3>Latest Node Model Validation Metrics</h3>
        {latestLocalRun ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginTop: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ opacity: 0.6, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Accuracy</div>
              <strong style={{ fontSize: '1.5rem', color: '#38bdf8' }}>{(latestLocalRun.local_accuracy * 100).toFixed(1)}%</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ opacity: 0.6, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>F1-Score</div>
              <strong style={{ fontSize: '1.5rem', color: '#818cf8' }}>{(latestLocalRun.local_f1 * 100).toFixed(1)}%</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ opacity: 0.6, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Precision</div>
              <strong style={{ fontSize: '1.5rem', color: '#10b981' }}>{(latestLocalRun.local_precision * 100).toFixed(1)}%</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ opacity: 0.6, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Recall</div>
              <strong style={{ fontSize: '1.5rem', color: '#fbbf24' }}>{(latestLocalRun.local_recall * 100).toFixed(1)}%</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ opacity: 0.6, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Loss</div>
              <strong style={{ fontSize: '1.5rem', color: '#f87171' }}>{latestLocalRun.local_loss.toFixed(4)}</strong>
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '24px 0', marginTop: '16px' }}>No training executions perform yet. Metrics will display once models are trained.</div>
        )}
      </div>

      {/* Visual Analytics Charts */}
      <div className="dashboard-charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
        <div className="chart-card glass-panel" style={{ padding: '20px' }}>
          <h3>Local Dataset Distribution</h3>
          <div className="chart-wrapper" style={{ height: '260px', position: 'relative' }}>
            {datasets.length === 0 ? (
              <div className="empty-state">No local datasets uploaded yet.</div>
            ) : (
              <Bar data={datasetChartData} options={chartOptions} />
            )}
          </div>
        </div>

        <div className="chart-card glass-panel" style={{ padding: '20px' }}>
          <h3>Local Model Accuracy Trend</h3>
          <div className="chart-wrapper" style={{ height: '260px', position: 'relative' }}>
            {history.length === 0 ? (
              <div className="empty-state">No training executions performed yet.</div>
            ) : (
              <Line data={accuracyTrendData} options={chartOptions} />
            )}
          </div>
        </div>
      </div>

      {/* Disease Server Active Rounds Summary */}
      <div className="dashboard-section glass-panel" style={{ marginTop: '24px', padding: '20px' }}>
        <h3>Node Participation Summary</h3>
        <div className="table-responsive" style={{ marginTop: '16px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Disease Prediction Server</th>
                <th>Model Architecture</th>
                <th>Dataset Status</th>
                <th>Latest Accuracy</th>
                <th>Current Round</th>
                <th>Sync Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {servers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">No disease servers found on coordinator.</td>
                </tr>
              ) : (
                servers.map(srv => {
                  const hasDs = datasets.some(d => d.server_id === srv.id)
                  const srvHistory = history.filter(h => h.server_id === srv.id)
                  const bestRun = srvHistory.length > 0 ? srvHistory[0] : null
                  
                  return (
                    <tr key={srv.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{srv.name}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{srv.disease_type}</div>
                      </td>
                      <td>
                        <span className="badge badge-info">{srv.model_type?.toUpperCase()}</span>
                      </td>
                      <td>
                        {hasDs ? (
                          <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <HiOutlineCheckCircle /> Uploaded ({datasets.find(d => d.server_id === srv.id).row_count} rows)
                          </span>
                        ) : (
                          <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <HiOutlineExclamationCircle /> No Dataset
                          </span>
                        )}
                      </td>
                      <td>
                        {bestRun ? (bestRun.local_accuracy * 100).toFixed(1) + '%' : 'N/A'}
                      </td>
                      <td>
                        {srv.status === 'TRAINING' ? (
                          <span className="badge badge-success">Round {srv.current_round}</span>
                        ) : (
                          <span className="badge badge-secondary">Idle (Round {srv.current_round})</span>
                        )}
                      </td>
                      <td>
                        {srv.member_status === 'APPROVED' ? (
                          <span className="badge badge-success">Joined</span>
                        ) : srv.member_status === 'PENDING' ? (
                          <span className="badge badge-warning">Pending Approval</span>
                        ) : (
                          <span className="badge badge-secondary">Not Joined</span>
                        )}
                      </td>
                      <td>
                        {srv.member_status === 'APPROVED' ? (
                          <Link to={`/servers/${srv.id}`} className="btn-small btn-primary">Manage</Link>
                        ) : srv.member_status === 'PENDING' ? (
                          <button className="btn-small btn-secondary" disabled>Awaiting</button>
                        ) : (
                          <Link to="/servers" className="btn-small btn-secondary">Join</Link>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
