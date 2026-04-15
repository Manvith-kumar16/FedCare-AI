import { useState, useEffect } from 'react'
import { Bar } from 'react-chartjs-2'
import { getFeatureImportance, getPredictionHistory, getExplanation } from '../api'
import { useApp } from '../contexts/AppContext'

export default function Explainability() {
  const [importance, setImportance] = useState(null)
  const [predictions, setPredictions] = useState([])
  const [selectedExplanation, setSelectedExplanation] = useState(null)
  const [loading, setLoading] = useState(true)
  const { addToast } = useApp()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [impRes, predRes] = await Promise.all([
        getFeatureImportance(1).catch(() => ({ data: null })),
        getPredictionHistory(1).catch(() => ({ data: [] })),
      ])
      setImportance(impRes.data)
      setPredictions(predRes.data)
    } catch (e) {
      addToast('Load XAI data failed. Train model first.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadExplanation(predId) {
    try {
      const res = await getExplanation(predId)
      setSelectedExplanation(res.data)
    } catch (e) {
      addToast('Failed to load explanation', 'error')
    }
  }

  const featureRanking = importance?.feature_ranking || []
  const barData = {
    labels: featureRanking.map(f => f.feature),
    datasets: [{
      label: 'Normalized Importance',
      data: featureRanking.map(f => (f.importance * 100).toFixed(2)),
      backgroundColor: featureRanking.map((_, i) => {
        const colors = ['#667eea', '#764ba2', '#00d2ff', '#00e676', '#ff9100', '#f06292', '#ff5252', '#9ea7c0']
        return colors[i % colors.length]
      }),
      borderRadius: 8,
      borderSkipped: false,
    }]
  }

  if (loading) return <div className="loader"><div className="spinner"></div></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🔍 Explainable AI</h1>
          <p>Understand AI decisions with SHAP explanations and feature importance</p>
        </div>
      </div>

      {/* Global Feature Importance */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="section-header">
          <h3>📊 Global Feature Importance</h3>
          <span className="badge badge-training">XGBoost Model</span>
        </div>
        {featureRanking.length > 0 ? (
          <div className="chart-container" style={{ height: '350px' }}>
            <Bar data={barData} options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: {
                  ticks: { color: '#5c6484' },
                  grid: { color: 'rgba(102, 126, 234, 0.06)' },
                  title: { display: true, text: 'Relative Importance (%)', color: '#9ea7c0' }
                },
                y: { ticks: { color: '#e8eaf6', font: { weight: 600 } }, grid: { display: false } },
              }
            }} />
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h4>No Model Data</h4>
            <p>Train the federated model first to see feature importance</p>
          </div>
        )}
      </div>

      {/* XAI explanation panel */}
      <div className="content-grid">
        {/* Prediction list */}
        <div className="card">
          <div className="section-header">
            <h3>🔮 Prediction Explanations</h3>
          </div>
          {predictions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.slice(0, 10).map(p => (
                <div key={p.id}
                  onClick={() => loadExplanation(p.id)}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: `1px solid ${selectedExplanation?.prediction_id === p.id ? 'rgba(102, 126, 234, 0.4)' : 'var(--color-border)'}`,
                    background: selectedExplanation?.prediction_id === p.id ? 'rgba(102, 126, 234, 0.08)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>Prediction #{p.id}</span>
                    <span className={`badge ${p.prediction === 1 ? 'badge-error' : 'badge-active'}`} style={{ marginLeft: '8px' }}>
                      {p.prediction_label}
                    </span>
                  </div>
                  <span style={{ color: 'var(--color-accent-cyan)', fontWeight: 700 }}>
                    {(p.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🔮</div>
              <h4>No Predictions Yet</h4>
              <p>Make predictions to see explanations</p>
            </div>
          )}
        </div>

        {/* SHAP Explanation Detail */}
        <div className="card">
          <div className="section-header">
            <h3>🧩 SHAP Explanation</h3>
          </div>
          {selectedExplanation ? (
            <div>
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <span className={`badge ${selectedExplanation.prediction_label === 'Diabetic' ? 'badge-error' : 'badge-active'}`}
                  style={{ fontSize: 'var(--font-size-md)', padding: '8px 20px' }}>
                  {selectedExplanation.prediction_label}
                </span>
                <p style={{ marginTop: '8px', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  Base Value: {selectedExplanation.base_value?.toFixed(4)} •
                  Confidence: {(selectedExplanation.confidence * 100).toFixed(1)}%
                </p>
              </div>

              {/* SHAP bars */}
              {selectedExplanation.feature_importance?.map((feat, i) => {
                const maxVal = Math.max(...selectedExplanation.feature_importance.map(f => Math.abs(f.shap_value)))
                const width = (Math.abs(feat.shap_value) / maxVal) * 100
                return (
                  <div key={i} className="shap-bar-container">
                    <span className="shap-feature-name">
                      {feat.feature}
                      <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        = {feat.input_value}
                      </span>
                    </span>
                    <div className="shap-bar-wrapper">
                      <div className={`shap-bar ${feat.shap_value > 0 ? 'positive' : 'negative'}`}
                        style={{ width: `${Math.max(width, 3)}%` }}
                      ></div>
                    </div>
                    <span className="shap-value" style={{
                      color: feat.shap_value > 0 ? 'var(--color-accent-red)' : 'var(--color-accent-green)'
                    }}>
                      {feat.shap_value > 0 ? '+' : ''}{feat.shap_value.toFixed(4)}
                    </span>
                  </div>
                )
              })}

              {/* SHAP plot image */}
              {selectedExplanation.plot_base64 && (
                <div style={{ marginTop: '24px', borderRadius: '12px', overflow: 'hidden' }}>
                  <img
                    src={`data:image/png;base64,${selectedExplanation.plot_base64}`}
                    alt="SHAP Explanation Plot"
                    style={{ width: '100%', borderRadius: '12px' }}
                  />
                </div>
              )}

              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(102, 126, 234, 0.06)', borderRadius: '8px' }}>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  <strong style={{ color: 'var(--color-accent-red)' }}>Red bars</strong> push prediction towards Diabetic.
                  {' '}<strong style={{ color: 'var(--color-accent-green)' }}>Green bars</strong> push towards Non-Diabetic.
                  Larger bars = higher impact on the prediction.
                </p>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🧩</div>
              <h4>Select a Prediction</h4>
              <p>Click on a prediction to see its SHAP explanation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
