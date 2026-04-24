import { useState, useEffect } from 'react'
import { makePrediction, getPredictionHistory, getServers } from '../api'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineSparkles, HiOutlineClipboardList, HiOutlineSearch,
  HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineClock,
  HiOutlineAdjustments, HiOutlineTemplate
} from 'react-icons/hi'

export default function Predictions() {
  const [servers, setServers] = useState([])
  const [selectedServer, setSelectedServer] = useState(null)

  const [featureColumns, setFeatureColumns] = useState([])
  const [form, setForm] = useState({})

  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [predicting, setPredicting] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(false)

  const { addToast } = useApp()

  useEffect(() => {
    loadServers()
  }, [])

  useEffect(() => {
    if (selectedServer) {
      if (selectedServer.feature_columns) {
        try {
          const cols = JSON.parse(selectedServer.feature_columns)
          setFeatureColumns(cols)
          setForm(Object.fromEntries(cols.map(c => [c, ''])))
        } catch (e) {
          console.error("Failed to parse features", e)
          setFeatureColumns([])
          setForm({})
        }
      } else {
        setFeatureColumns([])
        setForm({})
      }
    }
  }, [selectedServer])

  async function loadServers() {
    setLoading(true)
    try {
      const res = await getServers()
      // Only show servers where user is Admin OR is an Approved Member
      const validServers = res.data.filter(s =>
        isAdmin || (s.is_member && s.member_status === 'APPROVED')
      )
      setServers(validServers)
      if (validServers.length > 0) {
        setSelectedServer(validServers[0])
      }
    } catch (err) {
      addToast("Failed to load servers", "error")
    } finally {
      setLoading(false)
    }
  }

  function handleServerChange(e) {
    const srv = servers.find(s => s.id === parseInt(e.target.value))
    setSelectedServer(srv)
    setResult(null)
    setShowHistory(false)
    setHistory([])
  }

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handlePredict(e) {
    if (e) e.preventDefault()

    // Validate all fields are filled
    const unfilled = featureColumns.filter(f => !form[f])
    if (unfilled.length > 0) {
      addToast(`Please fill all fields: ${unfilled.join(', ')}`, 'warning')
      return
    }

    setPredicting(true)
    try {
      const payload = {
        server_id: selectedServer.id,
        features: {}
      }
      featureColumns.forEach(f => {
        payload.features[f] = parseFloat(form[f]) || 0
      })
      const res = await makePrediction(payload)
      setResult(res.data)
      addToast('Prediction generated successfully!', 'success')
    } catch (err) {
      addToast(err.response?.data?.detail || 'Prediction failed. Global model may not be trained yet.', 'error')
    } finally {
      setPredicting(false)
    }
  }

  async function loadHistory() {
    if (!selectedServer) return
    try {
      const res = await getPredictionHistory(selectedServer.id)
      setHistory(res.data)
      setShowHistory(true)
    } catch (e) {
      addToast('Failed to load history', 'error')
    }
  }

  function fillSample() {
    const newForm = {}
    featureColumns.forEach(c => {
      // just inject random reasonable values based on name
      let val = (Math.random() * 100).toFixed(1)
      if (c.toLowerCase().includes('age')) val = Math.floor(Math.random() * 50 + 20)
      else if (c.toLowerCase().includes('bmi')) val = (Math.random() * 15 + 18).toFixed(1)

      newForm[c] = val
    })
    setForm(newForm)
  }

  const shapValues = result?.explanation_data ? JSON.parse(result.explanation_data) : null

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <HiOutlineSparkles style={{ color: 'var(--color-accent-violet)' }} /> AI Predictions
          </h1>
          <p style={{ fontSize: 'var(--font-size-xs)' }}>Run inference on your federated global models</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={fillSample} disabled={!selectedServer || featureColumns.length === 0}><HiOutlineTemplate /> Fill Sample</button>
          <button className="btn btn-secondary btn-sm" onClick={loadHistory} disabled={!selectedServer}><HiOutlineClock /> View History</button>
        </div>
      </div>

      <div className="content-grid">
        {/* Input Form */}
        <div className="card">
          <div className="section-header">
            <h3 style={{ fontSize: 'var(--font-size-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HiOutlineClipboardList /> Patient Features
            </h3>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Select Disease Model Pipeline</label>
            <select
              className="form-input"
              value={selectedServer?.id || ''}
              onChange={handleServerChange}
              disabled={servers.length === 0}
            >
              {servers.length === 0 && <option value="">No Active Models Available</option>}
              {servers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.disease_type})</option>
              ))}
            </select>
          </div>

          {selectedServer && featureColumns.length === 0 && (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>No feature mapping found. Please upload a dataset to this server first.</p>
            </div>
          )}

          {selectedServer && featureColumns.length > 0 && (
            <form onSubmit={handlePredict}>
              <div className="form-row">
                {featureColumns.map(f => (
                  <div className="form-group" key={f}>
                    <label className="form-label">{f}</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      placeholder={`Enter ${f}...`}
                      value={form[f]}
                      onChange={e => updateField(f, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={predicting}
                style={{ width: '100%', justifyContent: 'center', marginTop: '16px', fontSize: 'var(--font-size-md)' }}
              >
                {predicting ? 'Analyzing...' : `Predict ${selectedServer.disease_type} Risk`}
              </button>
            </form>
          )}
        </div>

        {/* Result */}
        <div className="card">
          {result ? (
            <div>
              <div className="prediction-result" style={{ marginTop: 0 }}>
                <div className={`result-icon ${result.prediction === 1 ? 'positive' : 'negative'}`} style={{ fontSize: '2.5rem' }}>
                  {result.prediction === 1 ? <HiOutlineExclamationCircle /> : <HiOutlineCheckCircle />}
                </div>
                <div className="result-label" style={{
                  color: result.prediction === 1 ? 'var(--color-accent-red)' : 'var(--color-accent-green)'
                }}>
                  {result.prediction_label}
                </div>
                <div className="prediction-result" style={{ animationDelay: '0.4s' }}>
                  <div className="confidence-label">Model Confidence</div>
                  <div className="confidence-value">{((result?.confidence || 0) * 100).toFixed(1)}%</div>
                </div>
              </div>

              {/* Probability bar */}
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(15, 23, 52, 0.5)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: 'var(--font-size-xs)' }}>
                  <span style={{ color: 'var(--color-accent-green)' }}>Negative: {((result?.probability_negative || 0) * 100).toFixed(1)}%</span>
                  <span style={{ color: 'var(--color-accent-red)' }}>Positive: {((result?.probability_positive || 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="progress-bar" style={{ height: '8px' }}>
                  <div className="progress-fill" style={{
                    width: `${result.probability_positive * 100}%`,
                    background: result.prediction === 1 ? 'var(--gradient-danger)' : 'var(--gradient-success)'
                  }}></div>
                </div>
              </div>

              {/* SHAP mini-view */}
              {shapValues && Object.keys(shapValues).length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h4 style={{ marginBottom: '12px', color: 'var(--color-text-bright)', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HiOutlineSearch style={{ opacity: 0.7 }} /> Feature Impact (SHAP)
                  </h4>
                  {Object.entries(shapValues)
                    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                    .slice(0, 5)
                    .map(([feature, value]) => {
                      const maxVal = Math.max(...Object.values(shapValues).map(Math.abs))
                      const width = (Math.abs(value) / maxVal) * 100
                      return (
                        <div key={feature} className="shap-bar-container">
                          <span className="shap-feature-name">{feature.length > 15 ? feature.substring(0, 15) + '...' : feature}</span>
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
              <div className="empty-icon"><HiOutlineSparkles /></div>
              <h4 style={{ fontSize: 'var(--font-size-md)' }}>Awaiting Input</h4>
              <p style={{ fontSize: 'var(--font-size-sm)' }}>Select a model and fill in the patient features to get a prediction</p>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {showHistory && history.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
          <div className="section-header">
            <h3><HiOutlineClock /> Prediction History</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowHistory(false)}>✕ Close</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Result</th>
                <th>Confidence</th>
                <th>P(Positive)</th>
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

