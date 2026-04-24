import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js'
import { getServers, getDatasetStats, getTrainingStatus } from '../api'
import { useApp } from '../contexts/AppContext'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler)

export default function Dashboard() {
  const [servers, setServers] = useState([])
  const [stats, setStats] = useState(null)
  const [training, setTraining] = useState(null)
  const [loading, setLoading] = useState(true)
  const { addToast, userRole } = useApp()
  const isAdmin = userRole?.toUpperCase() === 'ADMIN'

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    console.log('📊 Dashboard: Loading data...')
    try {
      const serversTask = getServers().catch(err => {
        console.error('❌ Dashboard: Failed to load servers:', err)
        return { data: [] }
      })

      const statsTask = getDatasetStats(1).catch(err => {
        console.error('❌ Dashboard: Failed to load dataset stats:', err)
        return { data: null }
      })

      const [srvRes, statsRes] = await Promise.all([serversTask, statsTask])

      console.log('✅ Dashboard: Core data loaded:', { servers: srvRes.data?.length, stats: !!statsRes.data })
      setServers(srvRes.data || [])
      setStats(statsRes.data)

      // Try loading training status separately
      try {
        const trainRes = await getTrainingStatus(1)
        setTraining(trainRes.data)
      } catch (e) {
        console.warn('ℹ️ Dashboard: No training data found for server 1')
      }
    } catch (e) {
      console.error('💥 Dashboard: Critical load error:', e)
      addToast('Failed to load dashboard data', 'error')
    } finally {
      console.log('🏁 Dashboard: Loading finished')
      setLoading(false)
    }
  }

  const globalAccuracy = training?.global_accuracy || 0
  const totalHospitals = stats?.total_hospitals || 0
  const totalRows = stats?.total_rows || 0
  const trainingStatus = training?.status || 'ACTIVE'

  // Training accuracy chart data
  const globalLogs = training?.logs?.filter(l => l.log_type === 'global') || []
  const accuracyChartData = {
    labels: globalLogs.map(l => `Round ${l.round_number}`),
    datasets: [{
      label: 'Global Accuracy',
      data: globalLogs.map(l => (l.global_accuracy * 100).toFixed(2)),
      borderColor: '#667eea',
      backgroundColor: 'rgba(102, 126, 234, 0.1)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#667eea',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#9ea7c0', font: { family: 'Inter' } } },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 52, 0.95)',
        titleColor: '#fff',
        bodyColor: '#9ea7c0',
        borderColor: 'rgba(102, 126, 234, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
      }
    },
    scales: {
      x: { ticks: { color: '#5c6484' }, grid: { color: 'rgba(102, 126, 234, 0.06)' } },
      y: { ticks: { color: '#5c6484' }, grid: { color: 'rgba(102, 126, 234, 0.06)' }, min: 0, max: 100 },
    }
  }

  // Dataset distribution donut
  const hospitalData = stats?.per_hospital || []
  const donutData = {
    labels: hospitalData.map(h => h.hospital_name?.split(' ').slice(0, 2).join(' ') || `Hospital ${h.hospital_id}`),
    datasets: [{
      data: hospitalData.map(h => h.rows),
      backgroundColor: ['#667eea', '#764ba2', '#00d2ff', '#00e676'],
      borderColor: '#0c1229',
      borderWidth: 3,
    }]
  }

  if (loading) {
    return (
      <div className="loader">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🏥 FedCare AI Dashboard</h1>
          <p>Multi-Tenant Federated Learning Platform for Privacy-Preserving Healthcare AI</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon blue">🖥️</div>
          <div className="metric-value">{servers.length}</div>
          <div className="metric-label">Disease Servers</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon green">🏥</div>
          <div className="metric-value">{totalHospitals}</div>
          <div className="metric-label">Participating Hospitals</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon cyan">📊</div>
          <div className="metric-value">{totalRows.toLocaleString()}</div>
          <div className="metric-label">Total Patient Records</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon violet">🎯</div>
          <div className="metric-value">{(globalAccuracy * 100).toFixed(1)}%</div>
          <div className="metric-label">Global Model Accuracy</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="content-grid">
        <div className="card">
          <div className="section-header">
            <h3>📈 Training Progress</h3>
            <span className={`badge badge-${trainingStatus.toLowerCase()}`}>{trainingStatus}</span>
          </div>
          <div className="chart-container">
            {globalLogs.length > 0 ? (
              <Line data={accuracyChartData} options={chartOptions} />
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📉</div>
                <h4>No Training Data Yet</h4>
                <p>Wait for the administrator to start federated training</p>
                {isAdmin && (
                  <Link to="/training" className="btn btn-primary" style={{ marginTop: '16px' }}>
                    Start Training
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="section-header">
            <h3>🏥 Data Distribution</h3>
          </div>
          <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {hospitalData.length > 0 ? (
              <div style={{ width: '260px', height: '260px' }}>
                <Doughnut data={donutData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: '#9ea7c0', font: { family: 'Inter', size: 11 }, padding: 12 }
                    }
                  },
                  cutout: '65%',
                }} />
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h4>No Datasets</h4>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Servers Table */}
      <div className="card">
        <div className="section-header">
          <h3>🖥️ Disease Servers</h3>
          <Link to="/servers" className="btn btn-secondary btn-sm">View All</Link>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Server Name</th>
              <th>Disease</th>
              <th>Model</th>
              <th>Algorithm</th>
              <th>Status</th>
              <th>Accuracy</th>
              <th>Hospitals</th>
            </tr>
          </thead>
          <tbody>
            {servers.map(srv => (
              <tr key={srv.id}>
                <td style={{ fontWeight: 600, color: 'var(--color-text-bright)' }}>{srv.name}</td>
                <td>{srv.disease_type}</td>
                <td><span className="badge badge-active">{srv.model_type}</span></td>
                <td>{srv.fl_algorithm}</td>
                <td><span className={`badge badge-${srv.status.toLowerCase()}`}>{srv.status}</span></td>
                <td style={{ fontWeight: 700, color: 'var(--color-accent-cyan)' }}>{(srv.global_accuracy * 100).toFixed(1)}%</td>
                <td>{srv.member_count || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Privacy Notice */}
      <div className="card" style={{ marginTop: 'var(--space-lg)', background: 'rgba(0, 230, 118, 0.04)', borderColor: 'rgba(0, 230, 118, 0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '2rem' }}>🔒</span>
          <div>
            <h4 style={{ color: 'var(--color-accent-green)', marginBottom: '4px' }}>Privacy-Preserving Architecture</h4>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              All patient data stays within hospital boundaries. Only model weights are shared during federated training.
              No raw data ever leaves the hospital infrastructure. Fully compliant with HIPAA/GDPR guidelines.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
