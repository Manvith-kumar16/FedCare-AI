import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { getHospitals, getServers, getTrainingRounds, getGlobalModels } from '../api'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineOfficeBuilding, HiOutlineServer, HiOutlineLightningBolt, 
  HiOutlineGlobe, HiOutlineShieldCheck, HiOutlineTrendingUp 
} from 'react-icons/hi'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

export default function Dashboard() {
  const [hospitals, setHospitals] = useState([])
  const [servers, setServers] = useState([])
  const [rounds, setRounds] = useState([])
  const [globalModels, setGlobalModels] = useState([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useApp()

  useEffect(() => {
    loadDashboardStats()
  }, [])

  async function loadDashboardStats() {
    try {
      const [hospRes, srvRes, roundsRes, modelsRes] = await Promise.all([
        getHospitals().catch(() => ({ data: [] })),
        getServers().catch(() => ({ data: [] })),
        getTrainingRounds().catch(() => ({ data: [] })),
        getGlobalModels().catch(() => ({ data: [] }))
      ])

      setHospitals(hospRes.data || [])
      setServers(srvRes.data || [])
      setRounds(roundsRes.data || [])
      setGlobalModels(modelsRes.data || [])
    } catch (e) {
      console.error(e)
      addToast('Failed to load dashboard parameters', 'error')
    } finally {
      setLoading(false)
    }
  }

  const completedRoundsCount = rounds.filter(r => r.status === 'COMPLETED').length
  const activeHospitalsCount = hospitals.filter(h => h.membership_count > 0).length
  const latestModel = globalModels[0] // Sorted by date descending

  // Chart 1: Approved Members per Server
  const participationChartData = {
    labels: servers.map(s => s.name.split(' ')[0] || s.name),
    datasets: [{
      label: 'Approved Hospital Nodes',
      data: servers.map(s => s.member_count),
      backgroundColor: 'rgba(102, 126, 234, 0.6)',
      borderColor: '#667eea',
      borderWidth: 1,
      borderRadius: 6
    }]
  }

  // Chart 2: Global Model Convergence Trend
  // Order models chronologically for trend lines
  const chronologicalModels = [...globalModels]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-10) // Show last 10 models

  const convergenceChartData = {
    labels: chronologicalModels.map(m => `${m.server_name.split(' ')[0]} Rd ${m.round_number}`),
    datasets: [{
      label: 'Global Accuracy (%)',
      data: chronologicalModels.map(m => ((m.metrics_json?.accuracy || 0) * 100).toFixed(1)),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.3,
      fill: true,
      pointBackgroundColor: '#10b981',
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
        <h2>Collaborative Governance Dashboard</h2>
        <p>Orchestrate federated healthcare prediction networks and monitor global parameters securely.</p>
      </div>

      {/* Analytics Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon databases" style={{ background: 'rgba(0, 210, 255, 0.15)', color: '#00d2ff' }}><HiOutlineOfficeBuilding size={24} /></div>
          <div className="stat-details">
            <h3>Hospitals (Active/Total)</h3>
            <p className="stat-number">{activeHospitalsCount} / {hospitals.length}</p>
            <span className="stat-desc">Approved institutional partners</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon servers" style={{ background: 'rgba(102, 126, 234, 0.15)', color: '#667eea' }}><HiOutlineServer size={24} /></div>
          <div className="stat-details">
            <h3>Coordinating Pipelines</h3>
            <p className="stat-number">{servers.length}</p>
            <span className="stat-desc">Active predictive models</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon active-rounds" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}><HiOutlineLightningBolt size={24} /></div>
          <div className="stat-details">
            <h3>Completed Rounds</h3>
            <p className="stat-number">{completedRoundsCount}</p>
            <span className="stat-desc">Secure aggregation executions</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon training" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}><HiOutlineGlobe size={24} /></div>
          <div className="stat-details">
            <h3>Latest Global Model</h3>
            <p className="stat-number" style={{ fontSize: '1.4rem', paddingTop: '6px' }}>
              {latestModel ? `${latestModel.version} (Rd ${latestModel.round_number})` : 'N/A'}
            </p>
            <span className="stat-desc">{latestModel ? latestModel.server_name : 'No models aggregated yet'}</span>
          </div>
        </div>
      </div>

      {/* Latest Global Evaluation Metrics Panel */}
      <div className="glass-panel" style={{ padding: '20px', marginTop: '24px' }}>
        <h3>Latest Global Compiled Model Metrics</h3>
        {latestModel ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginTop: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ opacity: 0.6, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Accuracy</div>
              <strong style={{ fontSize: '1.5rem', color: '#10b981' }}>{(latestModel.metrics_json?.accuracy * 100).toFixed(1)}%</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ opacity: 0.6, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>F1-Score</div>
              <strong style={{ fontSize: '1.5rem', color: '#818cf8' }}>{(latestModel.metrics_json?.f1 * 100).toFixed(1)}%</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ opacity: 0.6, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Precision</div>
              <strong style={{ fontSize: '1.5rem', color: '#38bdf8' }}>{(latestModel.metrics_json?.precision * 100).toFixed(1)}%</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ opacity: 0.6, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Recall</div>
              <strong style={{ fontSize: '1.5rem', color: '#fbbf24' }}>{(latestModel.metrics_json?.recall * 100).toFixed(1)}%</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ opacity: 0.6, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Loss</div>
              <strong style={{ fontSize: '1.5rem', color: '#f87171' }}>{latestModel.metrics_json?.loss?.toFixed(4)}</strong>
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '24px 0', marginTop: '16px' }}>No global model versions compiled yet. Run rounds to generate.</div>
        )}
      </div>

      {/* Visual Analytics Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3>Approved Members per Server Pipeline</h3>
          <div className="chart-wrapper" style={{ height: '260px', position: 'relative' }}>
            {servers.length === 0 ? (
              <div className="empty-state">No server pipelines configured.</div>
            ) : (
              <Bar data={participationChartData} options={chartOptions} />
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3>Global Accuracy Convergence Trend</h3>
          <div className="chart-wrapper" style={{ height: '260px', position: 'relative' }}>
            {globalModels.length === 0 ? (
              <div className="empty-state">No models aggregated yet.</div>
            ) : (
              <Line data={convergenceChartData} options={chartOptions} />
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginTop: '24px' }}>
        {/* Left Section: Active Server Pipelines */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3>Coordinating Server Pipelines</h3>
          <div className="table-responsive" style={{ marginTop: '16px' }}>
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>Pipeline Server</th>
                  <th>Model Type</th>
                  <th>Hospital Members</th>
                  <th>Current Round</th>
                  <th>Pipeline Status</th>
                  <th>Global Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {servers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center">No pipelines registered on coordinator.</td>
                  </tr>
                ) : (
                  servers.slice(0, 5).map(srv => (
                    <tr key={srv.id}>
                      <td>
                        <Link to={`/servers`} style={{ fontWeight: 600, color: '#38bdf8' }}>{srv.name}</Link>
                        <div style={{ opacity: 0.6, fontSize: '0.7rem' }}>{srv.disease_type}</div>
                      </td>
                      <td><span className="badge badge-info">{srv.model_type?.toUpperCase()}</span></td>
                      <td>{srv.member_count} nodes</td>
                      <td>Round {srv.current_round}</td>
                      <td>
                        <span className={`badge ${srv.status === 'TRAINING' ? 'badge-error' : 'badge-active'}`}>
                          {srv.status === 'TRAINING' ? 'TRAINING' : 'IDLE'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {srv.global_accuracy > 0 ? (srv.global_accuracy * 100).toFixed(1) + '%' : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Section: Recent Coordinated Rounds */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3>Recent Coordination Rounds</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {rounds.length === 0 ? (
              <div className="empty-state">No coordinated training rounds executed yet.</div>
            ) : (
              rounds.slice(0, 4).map(r => (
                <div key={r.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong>Round #{r.round_number} (Server {r.server_id})</strong>
                    <span className={`badge ${r.status === 'COMPLETED' ? 'badge-active' : 'badge-error'}`}>{r.status}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', opacity: 0.7 }}>
                    <span>Clients: {r.submitted_count} / {r.expected_clients}</span>
                    <span>Global Acc: <strong>{r.global_accuracy ? (r.global_accuracy * 100).toFixed(1) + '%' : 'N/A'}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
