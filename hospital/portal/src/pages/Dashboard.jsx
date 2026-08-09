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
  HiOutlineExclamationCircle, HiOutlineLockClosed
} from 'react-icons/hi'
import { FaHospital } from 'react-icons/fa'

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
      backgroundColor: 'rgba(91, 101, 220, 0.7)',
      borderColor: '#5B65DC',
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
      borderColor: '#5B65DC',
      backgroundColor: 'rgba(91, 101, 220, 0.1)',
      tension: 0.3,
      fill: true,
      pointBackgroundColor: '#5B65DC',
      pointBorderColor: '#fff',
      pointRadius: 4
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: 'var(--color-text-secondary)', font: { family: 'Inter' } } }
    },
    scales: {
      x: { grid: { color: 'rgba(91, 101, 220, 0.1)' }, ticks: { color: 'var(--color-text-muted)' } },
      y: { grid: { color: 'rgba(91, 101, 220, 0.1)' }, ticks: { color: 'var(--color-text-muted)' } }
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
        <div style={{ height: '100px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '24px' }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: '140px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Hospital Node Dashboard
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Local data custody, secure training control, and federated learning statistics.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(0, 230, 118, 0.1)', color: 'var(--color-accent-green)', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 600 }}>
            <HiOutlineLockClosed size={16} /> Data Custody Secured
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
        
        {/* Card 1 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Custody Datasets</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(91, 101, 220, 0.1)', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HiOutlineDatabase size={18} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>{totalDatasetsCount}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Physically isolated files</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Local Records</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(91, 101, 220, 0.1)', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HiOutlineTrendingUp size={18} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>{totalSamplesCount}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Patient training samples</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Disease Networks</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(91, 101, 220, 0.1)', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HiOutlineServer size={18} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>{joinedServers.length} <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>/ {servers.length}</span></div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Authorized connections</div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Active FL Rounds</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(91, 101, 220, 0.1)', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HiOutlineLightningBolt size={18} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>{activeFederatedRounds}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Currently coordinating</div>
          </div>
        </div>
      </div>

      {/* Latest Evaluation Metrics Summary */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Latest Node Model Validation Metrics</h3>
        {latestLocalRun ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginTop: '16px' }}>
            <div style={{ background: 'var(--color-bg-secondary)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Accuracy</div>
              <strong style={{ fontSize: '1.5rem', color: 'var(--color-accent-blue)' }}>{(latestLocalRun.local_accuracy * 100).toFixed(1)}%</strong>
            </div>
            <div style={{ background: 'var(--color-bg-secondary)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>F1-Score</div>
              <strong style={{ fontSize: '1.5rem', color: 'var(--color-accent-blue)' }}>{(latestLocalRun.local_f1 * 100).toFixed(1)}%</strong>
            </div>
            <div style={{ background: 'var(--color-bg-secondary)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Precision</div>
              <strong style={{ fontSize: '1.5rem', color: 'var(--color-accent-green)' }}>{(latestLocalRun.local_precision * 100).toFixed(1)}%</strong>
            </div>
            <div style={{ background: 'var(--color-bg-secondary)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Recall</div>
              <strong style={{ fontSize: '1.5rem', color: 'var(--color-accent-orange)' }}>{(latestLocalRun.local_recall * 100).toFixed(1)}%</strong>
            </div>
            <div style={{ background: 'var(--color-bg-secondary)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Loss</div>
              <strong style={{ fontSize: '1.5rem', color: 'var(--color-accent-red)' }}>{latestLocalRun.local_loss.toFixed(4)}</strong>
            </div>
          </div>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-bg-secondary)', borderRadius: '12px', marginTop: '16px' }}>
            No training executions performed yet. Metrics will display once models are trained.
          </div>
        )}
      </div>

      {/* Visual Analytics Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '16px' }}>Local Dataset Distribution</h3>
          <div style={{ height: '260px', position: 'relative' }}>
            {datasets.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>No local datasets uploaded yet.</div>
            ) : (
              <Bar data={datasetChartData} options={chartOptions} />
            )}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '16px' }}>Local Model Accuracy Trend</h3>
          <div style={{ height: '260px', position: 'relative' }}>
            {history.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>No training executions performed yet.</div>
            ) : (
              <Line data={accuracyTrendData} options={chartOptions} />
            )}
          </div>
        </div>
      </div>

      {/* Disease Server Active Rounds Summary */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '16px' }}>Node Participation Summary</h3>
        <div style={{ overflowX: 'auto' }}>
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
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>No disease servers found on coordinator.</td>
                </tr>
              ) : (
                servers.map(srv => {
                  const hasDs = datasets.some(d => d.server_id === srv.id)
                  const srvHistory = history.filter(h => h.server_id === srv.id)
                  const bestRun = srvHistory.length > 0 ? srvHistory[0] : null
                  
                  return (
                    <tr key={srv.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{srv.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{srv.disease_type}</div>
                      </td>
                      <td>
                        <span className="badge badge-inactive">{srv.model_type?.toUpperCase()}</span>
                      </td>
                      <td>
                        {hasDs ? (
                          <span style={{ color: 'var(--color-accent-green)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                            <HiOutlineCheckCircle /> Uploaded ({datasets.find(d => d.server_id === srv.id).row_count} rows)
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-accent-red)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                            <HiOutlineExclamationCircle /> No Dataset
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {bestRun ? (bestRun.local_accuracy * 100).toFixed(1) + '%' : 'N/A'}
                      </td>
                      <td>
                        {srv.status === 'TRAINING' ? (
                          <span className="badge badge-training">Round {srv.current_round}</span>
                        ) : (
                          <span className="badge badge-secondary">Idle (Round {srv.current_round})</span>
                        )}
                      </td>
                      <td>
                        {srv.member_status === 'APPROVED' ? (
                          <span className="badge badge-active">Joined</span>
                        ) : srv.member_status === 'PENDING' ? (
                          <span className="badge badge-warning">Pending Approval</span>
                        ) : (
                          <span className="badge badge-secondary">Not Joined</span>
                        )}
                      </td>
                      <td>
                        {srv.member_status === 'APPROVED' ? (
                          <Link to={`/servers/${srv.id}`} className="btn btn-primary btn-sm">Manage</Link>
                        ) : srv.member_status === 'PENDING' ? (
                          <button className="btn btn-secondary btn-sm" disabled>Awaiting</button>
                        ) : (
                          <Link to="/servers" className="btn btn-secondary btn-sm">Join</Link>
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
