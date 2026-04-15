import { useState } from 'react'
import { makePrediction, getPredictionHistory } from '../api'
import { useApp } from '../contexts/AppContext'

const featureInfo = [
  { key: 'Pregnancies', label: 'Pregnancies', placeholder: 'e.g. 2', desc: 'Number of pregnancies' },
  { key: 'Glucose', label: 'Glucose', placeholder: 'e.g. 120', desc: 'Plasma glucose (mg/dL)' },
  { key: 'BloodPressure', label: 'Blood Pressure', placeholder: 'e.g. 72', desc: 'Diastolic BP (mm Hg)' },
  { key: 'SkinThickness', label: 'Skin Thickness', placeholder: 'e.g. 30', desc: 'Triceps fold (mm)' },
  { key: 'Insulin', label: 'Insulin', placeholder: 'e.g. 100', desc: '2-Hour serum insulin (mu U/ml)' },
  { key: 'BMI', label: 'BMI', placeholder: 'e.g. 32.5', desc: 'Body mass index (kg/m²)' },
  { key: 'DiabetesPedigreeFunction', label: 'Diabetes Pedigree', placeholder: 'e.g. 0.5', desc: 'Genetic function score' },
  { key: 'Age', label: 'Age', placeholder: 'e.g. 35', desc: 'Age in years' },
]

export default function Predictions() {
  const [form, setForm] = useState(
    Object.fromEntries(featureInfo.map(f => [f.key, '']))
  )
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [predicting, setPredicting] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const { addToast } = useApp()

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handlePredict(e) {
    if (e) e.preventDefault()
    
    // Validate all fields are filled
    const unfilled = featureInfo.filter(f => !form[f.key])
    if (unfilled.length > 0) {
      addToast(`Please fill all fields: ${unfilled.map(f => f.label).join(', ')}`, 'warning')
      return
    }

    setPredicting(true)
    try {
      const payload = { server_id: 1 }
      featureInfo.forEach(f => {
        payload[f.key] = parseFloat(form[f.key]) || 0
      })
      const res = await makePrediction(payload)
      setResult(res.data)
      addToast('Prediction generated using global model!', 'success')
    } catch (err) {
      addToast(err.response?.data?.detail || 'Prediction failed. Train the global model first.', 'error')
    } finally {
      setPredicting(false)
    }
  }

  async function loadHistory() {
    try {
      const res = await getPredictionHistory(1)
      setHistory(res.data)
      setShowHistory(true)
    } catch (e) {
      addToast('Failed to load history', 'error')
    }
  }

  function fillSample() {
    setForm({
      Pregnancies: '5', Glucose: '166', BloodPressure: '72',
      SkinThickness: '19', Insulin: '175', BMI: '25.8',
      DiabetesPedigreeFunction: '0.587', Age: '51',
    })
  }

  const shapValues = result?.explanation_data ? JSON.parse(result.explanation_data) : null

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🔮 Predictions</h1>
          <p>Make diabetes predictions using the federated model</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={fillSample}>Fill Sample</button>
          <button className="btn btn-secondary" onClick={loadHistory}>View History</button>
        </div>
      </div>

      <div className="content-grid">
        {/* Input Form */}
        <div className="card">
          <div className="section-header">
            <h3>📋 Patient Features</h3>
          </div>
          <form onSubmit={handlePredict}>
            <div className="form-row">
              {featureInfo.map(f => (
                <div className="form-group" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => updateField(f.key, e.target.value)}
                  />
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                    {f.desc}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={predicting}
              style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
            >
              {predicting ? 'Analyzing...' : '🔮 Predict Diabetes Risk'}
            </button>
          </form>
        </div>

        {/* Result */}
        <div className="card">
          {result ? (
            <div>
              <div className="prediction-result">
                <div className={`result-icon ${result.prediction === 1 ? 'positive' : 'negative'}`}>
                  {result.prediction === 1 ? '⚠️' : '✅'}
                </div>
                <div className="result-label" style={{
                  color: result.prediction === 1 ? 'var(--color-accent-red)' : 'var(--color-accent-green)'
                }}>
                  {result.prediction_label}
                </div>
                <div className="confidence-value">{(result.confidence * 100).toFixed(1)}%</div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginTop: '8px' }}>
                  Confidence Score
                </p>
              </div>

              {/* Probability bar */}
              <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(15, 23, 52, 0.5)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: 'var(--font-size-sm)' }}>
                  <span style={{ color: 'var(--color-accent-green)' }}>Non-Diabetic: {(result.probability_negative * 100).toFixed(1)}%</span>
                  <span style={{ color: 'var(--color-accent-red)' }}>Diabetic: {(result.probability_positive * 100).toFixed(1)}%</span>
                </div>
                <div className="progress-bar" style={{ height: '12px' }}>
                  <div className="progress-fill" style={{
                    width: `${result.probability_positive * 100}%`,
                    background: result.prediction === 1 ? 'var(--gradient-danger)' : 'var(--gradient-success)'
                  }}></div>
                </div>
              </div>

              {/* SHAP mini-view */}
              {shapValues && Object.keys(shapValues).length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h4 style={{ marginBottom: '12px', color: 'var(--color-text-bright)' }}>🔍 Feature Impact (SHAP)</h4>
                  {Object.entries(shapValues)
                    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                    .slice(0, 5)
                    .map(([feature, value]) => {
                      const maxVal = Math.max(...Object.values(shapValues).map(Math.abs))
                      const width = (Math.abs(value) / maxVal) * 100
                      return (
                        <div key={feature} className="shap-bar-container">
                          <span className="shap-feature-name">{feature}</span>
                          <div className="shap-bar-wrapper">
                            <div className={`shap-bar ${value > 0 ? 'positive' : 'negative'}`}
                              style={{ width: `${Math.max(width, 5)}%` }}
                            ></div>
                          </div>
                          <span className="shap-value" style={{ color: value > 0 ? 'var(--color-accent-red)' : 'var(--color-accent-green)' }}>
                            {value > 0 ? '+' : ''}{value.toFixed(4)}
                          </span>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🔮</div>
              <h4>Enter Patient Data</h4>
              <p>Fill in the patient features and click predict to get a diabetes risk assessment</p>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {showHistory && history.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
          <div className="section-header">
            <h3>📜 Prediction History</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowHistory(false)}>Hide</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Result</th>
                <th>Confidence</th>
                <th>P(Diabetic)</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {history.map(p => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td>
                    <span className={`badge ${p.prediction === 1 ? 'badge-error' : 'badge-active'}`}>
                      {p.prediction_label}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--color-accent-cyan)' }}>
                    {(p.confidence * 100).toFixed(1)}%
                  </td>
                  <td>{(p.probability_positive * 100).toFixed(1)}%</td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                    {p.created_at ? new Date(p.created_at).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
