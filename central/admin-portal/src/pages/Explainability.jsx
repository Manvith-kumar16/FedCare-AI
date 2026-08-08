import { useState, useEffect } from 'react'
import { Bar } from 'react-chartjs-2'
import { getServers, getGlobalFeatureImportance } from '../api'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineEye, HiOutlineRefresh, HiOutlineShieldCheck,
  HiOutlineChartBar, HiOutlineExclamationCircle 
} from 'react-icons/hi'

export default function Explainability() {
  const [servers, setServers] = useState([])
  const [selectedServerId, setSelectedServerId] = useState('')
  const [importance, setImportance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingImportance, setLoadingImportance] = useState(false)
  const { addToast } = useApp()

  useEffect(() => {
    loadServers()
  }, [])

  useEffect(() => {
    if (selectedServerId) {
      loadFeatureImportance(selectedServerId)
    }
  }, [selectedServerId])

  async function loadServers() {
    try {
      setLoading(true)
      const res = await getServers()
      setServers(res.data || [])
      if (res.data && res.data.length > 0) {
        setSelectedServerId(res.data[0].id)
      }
    } catch (e) {
      addToast('Failed to load servers list', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadFeatureImportance(serverId) {
    setLoadingImportance(true)
    try {
      const res = await getGlobalFeatureImportance(serverId)
      setImportance(res.data)
    } catch (e) {
      addToast('Failed to load global feature rankings. Ensure global model is compiled.', 'error')
      setImportance(null)
    } finally {
      setLoadingImportance(false)
    }
  }

  const selectedServer = servers.find(s => s.id === parseInt(selectedServerId))
  const featureRanking = importance?.feature_ranking || []

  const barData = {
    labels: featureRanking.map(f => f.feature),
    datasets: [
      {
        label: 'Normalized Global Feature Attribution (%)',
        data: featureRanking.map(f => (f.importance * 100).toFixed(1)),
        backgroundColor: 'rgba(102, 126, 234, 0.7)',
        borderColor: '#667eea',
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  }

  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#9ea7c0' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#fff', font: { weight: 600 } }, grid: { display: false } }
    }
  }

  if (loading && !selectedServerId) {
    return <div className="loader"><div className="spinner"></div></div>
  }

  return (
    <div className="explainability-admin-page fade-in">
      <div className="page-header">
        <div>
          <h2>Global Explainable AI (XAI)</h2>
          <p>Audit global feature importance derived directly from compiled model parameters and booster split trees.</p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={loadServers}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <HiOutlineRefresh /> Refresh
        </button>
      </div>

      {/* Network Select */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div className="input-group" style={{ margin: 0, minWidth: '320px' }}>
          <label>Select Predictive Network</label>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Global Feature Ranking Chart */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <HiOutlineChartBar size={20} /> Global Feature Rankings
          </h3>

          {loadingImportance ? (
            <div className="text-center" style={{ padding: '48px 0', flex: 1 }}>
              <div className="spinner" style={{ margin: '0 auto 16px auto' }}></div>
              <p>Analyzing global model parameters...</p>
            </div>
          ) : featureRanking.length > 0 ? (
            <div className="chart-wrapper" style={{ height: '300px', position: 'relative', flex: 1 }}>
              <Bar data={barData} options={chartOptions} />
            </div>
          ) : (
            <div className="empty-state" style={{ height: '300px' }}>
              No active global model available to interpret. Start a round to aggregate parameters.
            </div>
          )}
        </div>

        {/* Governance & Privacy Rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Explanation Limits */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <HiOutlineShieldCheck style={{ color: '#00d2ff' }} /> Governance & Privacy Protocol
            </h3>
            <p style={{ fontSize: '0.85rem', opacity: 0.8, lineHeight: 1.6 }}>
              In accordance with medical privacy standards (HIPAA and GDPR):
            </p>
            <ul style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '8px', paddingLeft: '20px', lineHeight: 1.8 }}>
              <li>The Central Coordinator **only** has access to mathematical model weights and ensemble split counts.</li>
              <li>Global feature importances represent the aggregated contributions across all participating sites.</li>
              <li>Individual patient local SHAP waterfall plots (explaining specific diagnostic inputs) can **only** be executed and viewed directly within the local Hospital Portal node.</li>
              <li>Patient feature values never leave hospital node memory, securing patient anonymity.</li>
            </ul>
          </div>

          {/* Feature Ranking details list */}
          {featureRanking.length > 0 && (
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3>Attribution List</h3>
              <div className="table-responsive" style={{ marginTop: '12px' }}>
                <table className="data-table text-xs">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Feature Name</th>
                      <th>Attribution Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {featureRanking.map((feat, idx) => (
                      <tr key={idx}>
                        <td><strong>#{idx + 1}</strong></td>
                        <td>{feat.feature}</td>
                        <td style={{ fontWeight: 600, color: '#38bdf8' }}>{(feat.importance * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
