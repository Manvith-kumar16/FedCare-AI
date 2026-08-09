import { useState, useEffect } from 'react'
import { Bar } from 'react-chartjs-2'
import { getServers, getGlobalFeatureImportance } from '../api'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineEye, HiOutlineRefresh, HiOutlineShieldCheck,
  HiOutlineChartBar, HiOutlineExclamationCircle, HiOutlineViewGrid 
} from 'react-icons/hi'
import { FaBrain, FaLungs, FaHeartbeat } from 'react-icons/fa'

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
        backgroundColor: 'rgba(91, 101, 220, 0.7)',
        borderColor: '#5B65DC',
        borderWidth: 1,
        borderRadius: 6
      }
    ]
  }

  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: 'var(--color-text-muted)' }, grid: { color: 'rgba(91, 101, 220, 0.1)' } },
      y: { ticks: { color: 'var(--color-text-primary)', font: { weight: 600 } }, grid: { display: false } }
    }
  }

  if (loading && !selectedServerId) {
    return (
      <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
        <div style={{ height: '100px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ height: '400px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
      </div>
    )
  }

  return (
    <div className="explainability-admin-page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Global Explainable AI (XAI)
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Audit global feature importance derived directly from compiled model parameters and booster split trees.
          </p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={loadServers}
        >
          <HiOutlineRefresh size={18} /> Refresh
        </button>
      </div>

      {/* Network Select */}
      <div className="card" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <label style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>Select Predictive Network:</label>
        <select 
          className="form-select"
          value={selectedServerId} 
          onChange={(e) => setSelectedServerId(e.target.value)}
          style={{ width: '400px', marginBottom: 0 }}
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Left Column: Charts and Analysis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Medical Imaging Context (Placeholder for Enterprise Feel) */}
          <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent-blue)' }}>
               <HiOutlineViewGrid size={40} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>Clinical Feature Vectors</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Federated aggregation extracts structural insights from decentralized medical inputs. 
                Below is the normalized global contribution of clinical features towards the prediction outcome.
              </p>
            </div>
          </div>

          {/* Global Feature Ranking Chart */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              <HiOutlineChartBar size={20} /> Global Feature Rankings
            </h3>

            {loadingImportance ? (
              <div style={{ padding: '48px 0', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                <div style={{ width: '30px', height: '30px', border: '3px solid var(--color-bg-secondary)', borderTopColor: 'var(--color-accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                <p style={{ fontWeight: 500 }}>Analyzing global model parameters...</p>
              </div>
            ) : featureRanking.length > 0 ? (
              <div style={{ height: '320px', position: 'relative', flex: 1 }}>
                <Bar data={barData} options={chartOptions} />
              </div>
            ) : (
              <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', background: 'var(--color-bg-primary)', borderRadius: '12px' }}>
                No active global model available to interpret. Start a round to aggregate parameters.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Governance & Privacy Rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Explanation Limits */}
          <div className="card" style={{ border: '1px solid rgba(0, 230, 118, 0.2)', background: '#FAFAFD' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              <HiOutlineShieldCheck size={22} style={{ color: 'var(--color-accent-green)' }} /> Governance & Privacy Protocol
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '12px' }}>
              In accordance with medical privacy standards (HIPAA and GDPR):
            </p>
            <ul style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', paddingLeft: '20px', lineHeight: 1.8 }}>
              <li>The Central Coordinator <strong>only</strong> has access to mathematical model weights and ensemble split counts.</li>
              <li>Global feature importances represent the aggregated contributions across all participating sites.</li>
              <li>Individual patient local SHAP waterfall plots (explaining specific diagnostic inputs) can <strong>only</strong> be executed and viewed directly within the local Hospital Portal node.</li>
              <li>Patient feature values never leave hospital node memory, securing patient anonymity.</li>
            </ul>
          </div>

          {/* Feature Ranking details list */}
          {featureRanking.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '16px' }}>Attribution Details</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Feature Name</th>
                      <th style={{ textAlign: 'right' }}>Attribution Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {featureRanking.map((feat, idx) => (
                      <tr key={idx}>
                        <td style={{ color: 'var(--color-text-muted)' }}><strong>#{idx + 1}</strong></td>
                        <td style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{feat.feature}</td>
                        <td style={{ fontWeight: 600, color: 'var(--color-accent-blue)', textAlign: 'right' }}>{(feat.importance * 100).toFixed(2)}%</td>
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
