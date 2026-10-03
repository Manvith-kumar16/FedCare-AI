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
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>Explainable AI (Local SHAP)</h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', marginTop: '8px' }}>Interpret diagnostic predictions using Shapley additive explanations computed strictly locally.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', marginBottom: '24px', background: 'var(--color-bg-card)', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.03)', boxShadow: '0 12px 32px rgba(0,0,0,0.04)' }}>
        <div className="input-group" style={{ margin: 0, minWidth: '320px' }}>
          <label style={{ fontWeight: 700, color: 'var(--color-accent-blue)', fontSize: '0.85rem', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px', display: 'block' }}>Select Disease Network</label>
          <select
            value={selectedServer?.id || ''}
            onChange={handleServerChange}
            disabled={servers.length === 0}
            style={{ padding: '16px', fontSize: '1rem', borderRadius: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', width: '100%', maxWidth: '600px', outline: 'none', transition: 'all 0.2s ease' }}
          >
            {servers.length === 0 && <option value="">No Active Models Available</option>}
            {servers.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.disease_type})</option>
            ))}
          </select>
        </div>
      </div>

      {selectedServer && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
          {/* Local Feature Rankings & History */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-card)', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.03)', boxShadow: '0 20px 40px rgba(0,0,0,0.04)' }}>
            <h3 className="section-header" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-dark)', fontSize: '1.3rem', fontWeight: 800 }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(114, 176, 171, 0.2) 0%, rgba(114, 176, 171, 0.05) 100%)', padding: '10px', borderRadius: '12px', color: 'var(--color-accent-cyan)', display: 'flex' }}>
                <HiOutlineChartBar size={22} />
              </div>
              Local Feature Rankings
            </h3>
            
            {featureRanking.length > 0 ? (
              <div style={{ height: '280px', position: 'relative', background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '16px', border: '1px dashed rgba(0,0,0,0.1)' }}>
                <Bar data={barData} options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { color: '#6b7280', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                    y: { ticks: { color: '#4b5563', font: { family: 'Inter', size: 12, weight: '500' } }, grid: { display: false } }
                  }
                }} />
              </div>
            ) : (
              <div className="empty-state" style={{ height: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.02)', borderRadius: '16px', border: '1px dashed rgba(0,0,0,0.1)' }}>
                <HiOutlineChartBar size={40} style={{ color: 'rgba(0,0,0,0.2)', marginBottom: '16px' }} />
                <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>No model rankings available yet. Train your local models first.</p>
              </div>
            )}

            {/* Prediction list */}
            <div style={{ marginTop: '32px' }}>
              <h3 className="section-header" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-dark)', fontSize: '1.2rem', fontWeight: 800 }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(56, 189, 248, 0.05) 100%)', padding: '8px', borderRadius: '10px', color: '#38bdf8', display: 'flex' }}>
                  <HiOutlineSparkles size={20} />
                </div>
                Recent Diagnostics
              </h3>
              
              {predictions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
                  {predictions.slice(0, 10).map(p => (
                    <div key={p.id}
                      onClick={() => loadExplanation(p.id)}
                      style={{
                        padding: '16px',
                        borderRadius: '16px',
                        border: `2px solid ${selectedExplanation?.prediction_id === p.id ? '#38bdf8' : 'transparent'}`,
                        background: selectedExplanation?.prediction_id === p.id ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(56, 189, 248, 0.02) 100%)' : 'rgba(0,0,0,0.03)',
                        boxShadow: selectedExplanation?.prediction_id === p.id ? '0 8px 24px rgba(56, 189, 248, 0.15)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedExplanation?.prediction_id !== p.id) {
                          e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedExplanation?.prediction_id !== p.id) {
                          e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--color-text-dark)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                          #{p.id}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-text-dark)' }}>Prediction Log</span>
                          <span style={{ 
                            fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', width: 'fit-content', textTransform: 'uppercase', letterSpacing: '0.5px',
                            background: p.prediction === 1 ? 'rgba(254, 145, 121, 0.15)' : 'rgba(114, 176, 171, 0.15)',
                            color: p.prediction === 1 ? 'var(--color-accent-red)' : 'var(--color-accent-green)' 
                          }}>
                            {p.prediction_label}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Confidence</span>
                        <span style={{ color: p.prediction === 1 ? 'var(--color-accent-red)' : 'var(--color-accent-green)', fontWeight: 800, fontSize: '1.2rem' }}>
                          {(p.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '32px', textAlign: 'center', background: 'rgba(0,0,0,0.02)', borderRadius: '16px', border: '1px dashed rgba(0,0,0,0.1)' }}>
                  <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500, margin: 0 }}>No diagnostic executions logged. Run diagnostics to explain.</p>
                </div>
              )}
            </div>
          </div>

          {/* SHAP Explanation Detail */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', background: 'var(--color-bg-card)', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.03)', boxShadow: '0 20px 40px rgba(0,0,0,0.04)' }}>
            <h3 className="section-header" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-dark)', fontSize: '1.4rem', fontWeight: 800, zIndex: 2 }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(184, 157, 71, 0.2) 0%, rgba(184, 157, 71, 0.05) 100%)', padding: '10px', borderRadius: '12px', color: 'var(--color-accent-orange)', display: 'flex' }}>
                <HiOutlinePuzzle size={24} />
              </div>
              Attributive Explanation
            </h3>
            
            {loadingExplanation ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                <Loader message="Loading SHAP values..." />
              </div>
            ) : selectedExplanation ? (
              <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', zIndex: 2 }}>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: 'linear-gradient(180deg, rgba(245, 243, 245, 0.6) 0%, rgba(245, 243, 245, 0.2) 100%)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Base Reference Value</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text-dark)' }}>{selectedExplanation.base_value?.toFixed(4)}</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Predicted</span>
                    <span style={{ 
                      fontSize: '1rem', fontWeight: 700, padding: '6px 16px', borderRadius: '8px', 
                      background: selectedExplanation.prediction_label.toLowerCase() === 'positive' ? 'rgba(254, 145, 121, 0.15)' : 'rgba(114, 176, 171, 0.15)',
                      color: selectedExplanation.prediction_label.toLowerCase() === 'positive' ? 'var(--color-accent-red)' : 'var(--color-accent-green)',
                      border: `1px solid ${selectedExplanation.prediction_label.toLowerCase() === 'positive' ? 'rgba(254, 145, 121, 0.3)' : 'rgba(114, 176, 171, 0.3)'}`
                    }}>
                      {selectedExplanation.prediction_label}
                    </span>
                  </div>
                </div>

                {/* SHAP plot image */}
                {selectedExplanation.plot_base64 && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: '16px', border: '1px dashed rgba(0,0,0,0.1)', marginBottom: '24px' }}>
                    <img
                      src={`data:image/png;base64,${selectedExplanation.plot_base64}`}
                      alt="SHAP Local Attributive Explanation Plot"
                      style={{ maxWidth: '100%', maxHeight: '350px', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                    />
                  </div>
                )}

                <div style={{ marginTop: 'auto', padding: '16px', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px', display: 'flex', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(254, 145, 121, 0.15)', color: 'var(--color-accent-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem' }}>+</span>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-dark)' }}>Red variables</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Drive risk output higher</span>
                    </div>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(0,0,0,0.06)' }}></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(114, 176, 171, 0.15)', color: 'var(--color-accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem' }}>-</span>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-dark)' }}>Green variables</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Decrease overall risk output</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 0', minHeight: '400px' }}>
                <div style={{ position: 'relative', marginBottom: '32px' }}>
                  <div style={{
                    position: 'absolute', top: '-16px', left: '-16px', right: '-16px', bottom: '-16px',
                    borderRadius: '50%', border: '2px dashed rgba(0,0,0,0.1)',
                    animation: 'spin 12s linear infinite'
                  }}></div>
                  <div style={{ background: '#ffffff', padding: '24px', borderRadius: '50%', display: 'flex', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 12px 32px rgba(0,0,0,0.08)', position: 'relative', zIndex: 2 }}>
                    <HiOutlineEye size={48} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                </div>
                <h4 style={{ fontSize: '1.5rem', color: 'var(--color-text-dark)', marginBottom: '12px', fontWeight: 800 }}>Select a Diagnostic Log</h4>
                <p style={{ fontSize: '1.05rem', color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: '80%', lineHeight: 1.5 }}>Click on any of your recent prediction logs from the list to analyze its local SHAP explanation.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
