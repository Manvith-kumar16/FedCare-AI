import { useState, useEffect } from 'react'
import { Bar } from 'react-chartjs-2'
import { getFeatureImportance, getPredictionHistory, getExplanation, getServers } from '../api'
import Loader from '../components/Loader'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineSearch, HiOutlineChartBar, HiOutlineSparkles,
  HiOutlineEye, HiOutlineServer, HiOutlinePuzzle
} from 'react-icons/hi'

export default function Explainability() {
  const [servers, setServers] = useState([])
  const [selectedServer, setSelectedServer] = useState(null)
  const [importance, setImportance] = useState(null)
  const [predictions, setPredictions] = useState([])
  const [selectedExplanation, setSelectedExplanation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingExplanation, setLoadingExplanation] = useState(false)
  const { addToast } = useApp()

  useEffect(() => {
    loadServers()
  }, [])

  useEffect(() => {
    if (selectedServer) {
      loadData(selectedServer.id)
    } else {
      setImportance(null)
      setPredictions([])
      setSelectedExplanation(null)
    }
  }, [selectedServer])

  async function loadServers() {
    setLoading(true)
    try {
      const res = await getServers()
      const validServers = res.data.filter(s =>
        s.is_member && s.member_status === 'APPROVED'
      )
      setServers(validServers)
      if (validServers.length > 0) {
        setSelectedServer(validServers[0])
      } else {
        setLoading(false)
      }
    } catch (err) {
      addToast("Failed to load disease servers list", "error")
      setLoading(false)
    }
  }

  function handleServerChange(e) {
    const srv = servers.find(s => s.id === parseInt(e.target.value))
    setSelectedServer(srv)
    setSelectedExplanation(null)
  }

  async function loadData(serverId) {
    setLoading(true)
    try {
      const [impRes, predRes] = await Promise.all([
        getFeatureImportance(serverId).catch(() => ({ data: null })),
        getPredictionHistory(serverId).catch(() => ({ data: [] })),
      ])
      setImportance(impRes.data)
      setPredictions(predRes.data)
    } catch (e) {
      addToast('Failed to load XAI metrics. Try training local models first.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadExplanation(predId) {
    setLoadingExplanation(true)
    try {
      const res = await getExplanation(predId)
      setSelectedExplanation(res.data)
    } catch (e) {
      addToast('Failed to load local SHAP explanation', 'error')
    } finally {
      setLoadingExplanation(false)
    }
  }

  const featureRanking = importance?.feature_ranking || []
  const barData = {
    labels: featureRanking.map(f => f.feature),
    datasets: [{
      label: 'Relative Attribution (%)',
      data: featureRanking.map(f => (f.importance * 100).toFixed(1)),
      backgroundColor: '#38bdf8',
      borderRadius: 4
    }]
  }

  if (loading) {
    return <Loader message="Fetching feature attributions..." />
  }

  return (
    <div className="explainability-page fade-in">
      <div className="page-header">
        <div>
          <h2>Explainable AI (Local SHAP)</h2>
          <p>Interpret diagnostic predictions using Shapley additive explanations computed strictly locally.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div className="input-group" style={{ margin: 0, minWidth: '320px' }}>
          <label>Select Disease Network</label>
          <select
            value={selectedServer?.id || ''}
            onChange={handleServerChange}
            disabled={servers.length === 0}
            style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
          >
            {servers.length === 0 && <option value="">No Active Models Available</option>}
            {servers.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.disease_type})</option>
            ))}
          </select>
        </div>
      </div>

      {selectedServer && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          {/* Global Feature Importance */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <HiOutlineChartBar size={20} /> Local Feature Rankings
            </h3>
            {featureRanking.length > 0 ? (
              <div style={{ height: '300px', position: 'relative' }}>
                <Bar data={barData} options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { color: '#9ea7c0' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#fff' }, grid: { display: false } }
                  }
                }} />
              </div>
            ) : (
              <div className="empty-state" style={{ height: '300px' }}>
                No model rankings available yet. Train your local models first.
              </div>
            )}

            {/* Prediction list */}
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <HiOutlineSparkles size={20} /> Recent Diagnostics
              </h3>
              {predictions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {predictions.slice(0, 10).map(p => (
                    <div key={p.id}
                      onClick={() => loadExplanation(p.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '6px',
                        border: `1px solid ${selectedExplanation?.prediction_id === p.id ? '#38bdf8' : 'rgba(255,255,255,0.05)'}`,
                        background: selectedExplanation?.prediction_id === p.id ? 'rgba(56, 189, 248, 0.05)' : 'rgba(255,255,255,0.01)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>Prediction #{p.id}</strong>
                        <span className={`badge ${p.prediction === 1 ? 'badge-error' : 'badge-active'}`} style={{ marginLeft: '8px' }}>
                          {p.prediction_label}
                        </span>
                      </div>
                      <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                        {(p.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '24px' }}>
                  No diagnostic executions logged. Run diagnostics to explain.
                </div>
              )}
            </div>
          </div>

          {/* SHAP Explanation Detail */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <HiOutlinePuzzle size={20} /> Attributive Explanation
            </h3>
            
            {loadingExplanation ? (
              <Loader message="Loading SHAP values..." />
            ) : selectedExplanation ? (
              <div className="fade-in">
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                  <span className={`badge ${selectedExplanation.prediction_label.toLowerCase() === 'positive' ? 'badge-error' : 'badge-active'}`}
                    style={{ fontSize: '1.1rem', padding: '6px 16px' }}>
                    {selectedExplanation.prediction_label}
                  </span>
                  <p style={{ marginTop: '8px', opacity: 0.7, fontSize: '0.85rem' }}>
                    Base Reference Value: {selectedExplanation.base_value?.toFixed(4)}
                  </p>
                </div>

                {/* SHAP plot image */}
                {selectedExplanation.plot_base64 && (
                  <div style={{ marginTop: '16px', borderRadius: '8px', overflow: 'hidden', background: '#fff', padding: '10px' }}>
                    <img
                      src={`data:image/png;base64,${selectedExplanation.plot_base64}`}
                      alt="SHAP Local Attributive Explanation Plot"
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  </div>
                )}

                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.8rem', opacity: 0.8 }}>
                  <p>
                    <strong style={{ color: '#ef4444' }}>Red variables</strong> drive risk output higher. 
                    <strong style={{ color: '#10b981' }}> Green variables</strong> decrease overall risk output.
                    Attribution is generated locally by recreating a model instance inside the node sandbox.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center" style={{ padding: '48px 0', opacity: 0.5 }}>
                <HiOutlineEye size={48} style={{ margin: '0 auto 16px auto' }} />
                <h4>Select a Diagnostic Log</h4>
                <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Click on a recent prediction log to see its local SHAP explanation.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
