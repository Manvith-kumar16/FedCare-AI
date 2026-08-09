import { useState, useEffect } from 'react'
import { makePrediction, getPredictionHistory, getServers } from '../api'
import Loader from '../components/Loader'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineSparkles, HiOutlineClipboardList, HiOutlineSearch,
  HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineClock,
  HiOutlineTemplate
} from 'react-icons/hi'

export default function Predictions() {
  const [servers, setServers] = useState([])
  const [selectedServer, setSelectedServer] = useState(null)
  const [featureColumns, setFeatureColumns] = useState([])
  const [form, setForm] = useState({})
  const [result, setResult] = useState(null)
  const [predictionError, setPredictionError] = useState(null)
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
      // Only show servers where user is an Approved Member
      const validServers = res.data.filter(s =>
        s.is_member && s.member_status === 'APPROVED'
      )
      setServers(validServers)
      
      const params = new URLSearchParams(window.location.search)
      const paramId = params.get('server_id')
      
      if (paramId) {
        const preselected = validServers.find(s => s.id === parseInt(paramId))
        if (preselected) {
          setSelectedServer(preselected)
        } else if (validServers.length > 0) {
          setSelectedServer(validServers[0])
        }
      } else if (validServers.length > 0) {
        setSelectedServer(validServers[0])
      }
    } catch (err) {
      addToast("Failed to load disease servers list", "error")
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

    const unfilled = featureColumns.filter(f => !form[f])
    if (unfilled.length > 0) {
      addToast(`Please fill all fields: ${unfilled.join(', ')}`, 'warning')
      return
    }

    setPredicting(true)
    setResult(null)
    setPredictionError(null)
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
      const msg = err.response?.data?.detail || 'Prediction failed. Global model may not be synced yet.'
      setPredictionError(msg)
      addToast(msg, 'error')
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
    if (!selectedServer) return
    const newForm = {}
    
    // Auto-detect fields by name for helper sample values
    featureColumns.forEach(c => {
      let val = '0'
      const col = c.toLowerCase()
      if (col.includes('pregnancies')) val = '2'
      else if (col.includes('glucose')) val = '120'
      else if (col.includes('bloodpressure')) val = '80'
      else if (col.includes('skinthickness')) val = '20'
      else if (col.includes('insulin')) val = '79'
      else if (col.includes('bmi')) val = '32.0'
      else if (col.includes('diabetespedigree')) val = '0.375'
      else if (col.includes('age')) val = '35'
      else val = (Math.random() * 5 + 1).toFixed(1)
      
      newForm[c] = val
    })
    setForm(newForm)
  }

  const shapValues = result?.explanation_data ? JSON.parse(result.explanation_data) : null

  if (loading) {
    return <Loader message="Initializing global model predictors..." />
  }

  return (
    <div className="predictions-page fade-in">
      <div className="page-header">
        <div>
          <h2>Patient Inference Gateway</h2>
          <p>Compute diagnostics locally. Input features remain 100% locally contained on this node.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={fillSample} disabled={!selectedServer || featureColumns.length === 0}><HiOutlineTemplate /> Fill Mock Patient</button>
          <button className="btn btn-secondary" onClick={loadHistory} disabled={!selectedServer}><HiOutlineClock /> View History</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginTop: '20px' }}>
        {/* Input Form */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <HiOutlineClipboardList /> Diagnostic Inputs
          </h3>

          <div className="input-group" style={{ marginBottom: '24px' }}>
            <label>Disease Model Pipeline</label>
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

          {selectedServer && featureColumns.length === 0 && (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>No feature mapping found. Please upload a dataset to this server first.</p>
            </div>
          )}

          {selectedServer && featureColumns.length > 0 && (
            <form onSubmit={handlePredict}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {featureColumns.map(f => (
                  <div className="input-group" key={f} style={{ margin: 0 }}>
                    <label>{f}</label>
                    <input
                      type="number"
                      step="any"
                      placeholder={`Enter ${f}...`}
                      value={form[f] || ''}
                      onChange={e => updateField(f, e.target.value)}
                      style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
                      required
                    />
                  </div>
                ))}
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={predicting}
                style={{ width: '100%', justifyContent: 'center', marginTop: '24px', padding: '12px' }}
              >
                {predicting ? 'Processing local model...' : `Predict ${selectedServer.disease_type} Risk`}
              </button>
            </form>
          )}
        </div>

        {/* Result */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {result ? (
            <div className="fade-in">
              <div className="text-center" style={{ padding: '16px 0' }}>
                <div style={{ 
                  fontSize: '3.5rem', 
                  color: result.prediction === 1 ? '#ef4444' : '#10b981',
                  marginBottom: '12px'
                }}>
                  {result.prediction === 1 ? <HiOutlineExclamationCircle style={{ margin: '0 auto' }} /> : <HiOutlineCheckCircle style={{ margin: '0 auto' }} />}
                </div>
                <h3 style={{ 
                  color: result.prediction === 1 ? '#ef4444' : '#10b981',
                  fontSize: '1.8rem',
                  fontWeight: 800
                }}>
                  {result.prediction_label}
                </h3>
                <p style={{ opacity: 0.6, fontSize: '0.85rem', marginTop: '6px' }}>
                  Local Inference Diagnosis Result
                </p>
              </div>

              {/* Probability details */}
              <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
                  <span style={{ color: '#10b981' }}>Negative: {((result?.probability_negative || 0) * 100).toFixed(1)}%</span>
                  <span style={{ color: '#ef4444' }}>Positive: {((result?.probability_positive || 0) * 100).toFixed(1)}%</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${result.probability_positive * 100}%`,
                    background: result.prediction === 1 ? '#ef4444' : '#10b981'
                  }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.85rem' }}>
                  <span style={{ opacity: 0.7 }}>Confidence Threshold</span>
                  <strong>{((result?.confidence || 0) * 100).toFixed(1)}%</strong>
                </div>
              </div>

              {/* Local SHAP values bar breakdown */}
              {shapValues && Object.keys(shapValues).length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h4 style={{ marginBottom: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HiOutlineSearch style={{ opacity: 0.7 }} /> Local Feature SHAP Attribution
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(shapValues)
                      .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                      .slice(0, 4)
                      .map(([feature, value]) => {
                        const maxVal = Math.max(...Object.values(shapValues).map(Math.abs)) || 1
                        const width = (Math.abs(value) / maxVal) * 100
                        return (
                          <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                            <span style={{ width: '90px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', opacity: 0.8 }}>{feature}</span>
                            <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', position: 'relative' }}>
                              <div style={{
                                position: 'absolute',
                                left: '50%',
                                right: value < 0 ? 'auto' : 'none',
                                transform: value < 0 ? 'translateX(-100%)' : 'none',
                                width: `${width / 2}%`,
                                height: '100%',
                                background: value > 0 ? '#ef4444' : '#10b981',
                                borderRadius: '3px'
                              }}></div>
                            </div>
                            <span style={{ width: '55px', textAlign: 'right', fontWeight: 600, color: value > 0 ? '#ef4444' : '#10b981' }}>
                              {value > 0 ? '+' : ''}{value.toFixed(3)}
                            </span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          ) : predictionError ? (
            <div className="text-center" style={{ padding: '24px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
              <h4 style={{ color: '#ef4444', marginBottom: '12px' }}>Prediction Bypassed</h4>
              <p style={{ fontSize: '0.85rem', opacity: 0.8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', padding: '12px', borderRadius: '6px', textAlign: 'left' }}>
                {predictionError}
              </p>
            </div>
          ) : (
            <div className="text-center" style={{ padding: '48px 0', opacity: 0.5 }}>
              <HiOutlineSparkles size={48} style={{ margin: '0 auto 16px auto' }} />
              <h4>Awaiting Diagnostic Features</h4>
              <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Select an active disease pipeline, input metrics, and click predict.</p>
            </div>
          )}
        </div>
      </div>

      {/* History Table */}
      {showHistory && history.length > 0 && (
        <div className="glass-panel fade-in" style={{ marginTop: '24px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Prediction Log History</h3>
            <button className="btn-small btn-secondary" onClick={() => setShowHistory(false)}>Close Log</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Prediction ID</th>
                <th>Result Class</th>
                <th>Model Confidence</th>
                <th>Probability (Positive)</th>
                <th>Inputs Captured</th>
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
                  <td style={{ fontWeight: 700 }}>
                    {(p.confidence * 100).toFixed(1)}%
                  </td>
                  <td>{(p.probability_positive * 100).toFixed(1)}%</td>
                  <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {p.input_data}
                  </td>
                  <td style={{ opacity: 0.6, fontSize: '0.80rem' }}>
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
