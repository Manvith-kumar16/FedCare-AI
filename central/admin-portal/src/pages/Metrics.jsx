import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { getServers, getGlobalModels } from '../api'
import Loader from '../components/Loader'
import { useApp } from '../contexts/AppContext'
import { HiOutlineTrendingUp, HiOutlineRefresh, HiOutlineServer } from 'react-icons/hi'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export default function Metrics() {
  const [servers, setServers] = useState([])
  const [selectedServerId, setSelectedServerId] = useState('')
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useApp()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [serversRes, modelsRes] = await Promise.all([
        getServers().catch(() => ({ data: [] })),
        getGlobalModels().catch(() => ({ data: [] }))
      ])

      setServers(serversRes.data || [])
      setModels(modelsRes.data || [])

      if (serversRes.data && serversRes.data.length > 0) {
        setSelectedServerId(serversRes.data[0].id)
      }
    } catch (e) {
      addToast('Failed to load evaluation datasets', 'error')
    } finally {
      setLoading(false)
    }
  }

  const selectedServer = servers.find(s => s.id === parseInt(selectedServerId))
  // Filter and sort models chronologically (round number ascending) for selected server
  const serverModels = models
    .filter(m => m.server_id === parseInt(selectedServerId))
    .sort((a, b) => a.round_number - b.round_number)

  // Chart data setup
  const chartData = {
    labels: serverModels.map(m => `Round ${m.round_number} (${m.version})`),
    datasets: [
      {
        label: 'Global Accuracy (%)',
        data: serverModels.map(m => ((m.metrics_json?.accuracy || 0) * 100).toFixed(1)),
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Global F1-Score (%)',
        data: serverModels.map(m => ((m.metrics_json?.f1 || 0) * 100).toFixed(1)),
        borderColor: '#818cf8',
        backgroundColor: 'rgba(129, 140, 248, 0.1)',
        tension: 0.3,
        fill: true,
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#9ea7c0', font: { family: 'Inter' } } }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ea7c0' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ea7c0' }, min: 0, max: 100 }
    }
  }

  if (loading) {
    return <Loader message="Fetching telemetry..." />
  }

  return (
    <div className="metrics-page fade-in">
      <div className="page-header">
        <div>
          <h2>Evaluation & Performance Analytics</h2>
          <p>Analyze round-by-round global performance metrics of coordinated prediction models.</p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={loadData}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <HiOutlineRefresh /> Refresh
        </button>
      </div>

      {/* Select Server Pipeline */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div className="input-group" style={{ margin: 0, minWidth: '320px' }}>
          <label>Select Predictive Pipeline Network</label>
          <select 
            value={selectedServerId} 
            onChange={(e) => setSelectedServerId(e.target.value)}
            style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
          >
            {servers.length === 0 ? (
              <option value="">No Coordinating Servers Available</option>
            ) : (
              servers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.disease_type})</option>
              ))
            )}
          </select>
        </div>
      </div>

      {selectedServer && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          {/* Performance Trend Chart */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <HiOutlineTrendingUp size={20} /> Model Convergence Trends
            </h3>
            <div className="chart-wrapper" style={{ height: '300px', position: 'relative', flex: 1 }}>
              {serverModels.length === 0 ? (
                <div className="empty-state" style={{ height: '300px' }}>No model metrics logged for this server pipeline yet. Run rounds to populate.</div>
              ) : (
                <Line data={chartData} options={chartOptions} />
              )}
            </div>
          </div>

          {/* Historical Metrics Table */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3>Performance Breakdown</h3>
            <div className="table-responsive" style={{ marginTop: '16px' }}>
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Round</th>
                    <th>Accuracy</th>
                    <th>Precision</th>
                    <th>Recall</th>
                    <th>F1-Score</th>
                    <th>Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {serverModels.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center">No round-wise model evaluations.</td>
                    </tr>
                  ) : (
                    // Display reverse chronological for tables
                    [...serverModels].reverse().map(m => (
                      <tr key={m.id}>
                        <td><strong>{m.version}</strong></td>
                        <td>Round {m.round_number}</td>
                        <td style={{ fontWeight: 600 }}>{((m.metrics_json?.accuracy || 0) * 100).toFixed(1)}%</td>
                        <td>{((m.metrics_json?.precision || 0) * 100).toFixed(1)}%</td>
                        <td>{((m.metrics_json?.recall || 0) * 100).toFixed(1)}%</td>
                        <td style={{ fontWeight: 600 }}>{((m.metrics_json?.f1 || 0) * 100).toFixed(1)}%</td>
                        <td>{m.metrics_json?.loss?.toFixed(4)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
