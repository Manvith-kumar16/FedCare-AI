import { useState, useEffect } from 'react'
import { makePrediction, getPredictionHistory, getServers, getDatasets } from '../api'
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
    async function loadFeatures() {
      if (selectedServer) {
        if (selectedServer.feature_columns) {
          try {
            const cols = JSON.parse(selectedServer.feature_columns)
            if (cols.length > 0) {
              setFeatureColumns(cols)
              setForm(Object.fromEntries(cols.map(c => [c, ''])))
              return
            }
          } catch (e) {
            console.error("Failed to parse features", e)
          }
        }
        
        // Fallback to local dataset feature mapping
        try {
          const res = await getDatasets(selectedServer.id)
          if (res.data && res.data.length > 0) {
            const latest = res.data[0]
            if (latest.columns) {
              const allCols = JSON.parse(latest.columns)
              const target = latest.target_column || 'Outcome'
              const cols = allCols.filter(c => c !== target)
              setFeatureColumns(cols)
              setForm(Object.fromEntries(cols.map(c => [c, ''])))
              return
            }
          }
        } catch (e) {
          console.error("Failed to fetch local dataset features", e)
        }

        setFeatureColumns([])
        setForm({})
      }
    }
    
    loadFeatures()
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
      <div className="page-header" style={{ alignItems: 'flex-end', borderBottom: '1px solid var(--color-border)', paddingBottom: '24px', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>Patient Inference Gateway</h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            Compute diagnostics locally. Input features remain 100% locally contained on this node.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={fillSample} disabled={!selectedServer || featureColumns.length === 0} style={{ padding: '10px 20px', borderRadius: '12px' }}>
            <HiOutlineTemplate size={18} /> Fill Mock Patient
          </button>
          <button className="btn btn-secondary" onClick={loadHistory} disabled={!selectedServer} style={{ padding: '10px 20px', borderRadius: '12px' }}>
            <HiOutlineClock size={18} /> View History
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* Input Form Column */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="section-header" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-bright)', fontSize: '1.4rem' }}>
            <div style={{ background: 'rgba(91, 101, 220, 0.1)', padding: '10px', borderRadius: '12px', color: 'var(--color-accent-blue)', display: 'flex' }}>
              <HiOutlineClipboardList size={24} />
            </div>
            Diagnostic Inputs
          </h3>

          <div className="form-group" style={{ background: 'var(--color-bg-secondary)', padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <label className="form-label" style={{ fontWeight: 600, color: 'var(--color-accent-blue)', fontSize: '0.9rem', marginBottom: '12px' }}>Disease Model Pipeline</label>
            <select
              className="form-select"
              value={selectedServer?.id || ''}
              onChange={handleServerChange}
              disabled={servers.length === 0}
              style={{ padding: '12px', fontSize: '1rem' }}
            >
              {servers.length === 0 && <option value="">No Active Models Available</option>}
              {servers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.disease_type})</option>
              ))}
            </select>
          </div>

          {selectedServer && featureColumns.length === 0 && (
            <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
              <div style={{ background: 'rgba(255, 145, 0, 0.1)', padding: '24px', borderRadius: '50%', marginBottom: '20px', display: 'flex' }}>
                <HiOutlineExclamationCircle size={48} style={{ color: 'var(--color-accent-orange)' }} />
              </div>
              <h4 style={{ fontSize: '1.25rem', color: 'var(--color-text-bright)', marginBottom: '8px' }}>No Feature Mapping Found</h4>
              <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: '80%' }}>Please upload a dataset to this server first to enable predictions.</p>
            </div>
          )}

          {selectedServer && featureColumns.length > 0 && (
            <form onSubmit={handlePredict} style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px', overflowY: 'auto', paddingRight: '8px', maxHeight: '500px' }}>
                {featureColumns.map(f => (
                  <div className="form-group" key={f} style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{f}</label>
                    <input
                      type="number"
                      step="any"
                      placeholder={`Enter ${f}...`}
                      value={form[f] || ''}
                      onChange={e => updateField(f, e.target.value)}
                      className="form-input"
                      style={{ padding: '12px', borderRadius: '8px' }}
                      required
                    />
                  </div>
                ))}
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={predicting}
                style={{ width: '100%', justifyContent: 'center', marginTop: '32px', padding: '16px', fontSize: '1.1rem', borderRadius: '12px', border: 'none', transition: 'all 0.3s ease' }}
              >
                {predicting ? (
                  <>Processing local model <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', marginLeft: '12px' }}></span></>
                ) : (
                  <>Predict {selectedServer.disease_type} Risk <HiOutlineSparkles size={20} style={{ marginLeft: '4px' }} /></>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Result Column */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden', minHeight: '600px' }}>
          {/* subtle background glow */}
          {result && (
             <div style={{
               position: 'absolute', top: '50%', left: '50%', width: '350px', height: '350px',
               background: result.prediction === 1 ? 'var(--color-accent-red)' : 'var(--color-accent-green)',
               opacity: 0.04, filter: 'blur(80px)', transform: 'translate(-50%, -50%)', pointerEvents: 'none', borderRadius: '50%', transition: 'all 0.8s ease'
             }}></div>
          )}

          {result ? (
            <div className="fade-in" style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="prediction-result" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <div className={`result-icon ${result.prediction === 1 ? 'positive' : 'negative'}`} style={{ width: '120px', height: '120px', fontSize: '4rem', margin: 0, boxShadow: `0 0 40px ${result.prediction === 1 ? 'rgba(255, 82, 82, 0.15)' : 'rgba(0, 230, 118, 0.15)'}`, background: result.prediction === 1 ? 'rgba(255, 82, 82, 0.08)' : 'rgba(0, 230, 118, 0.08)', border: `1px solid ${result.prediction === 1 ? 'rgba(255, 82, 82, 0.2)' : 'rgba(0, 230, 118, 0.2)'}` }}>
                    {result.prediction === 1 ? <HiOutlineExclamationCircle /> : <HiOutlineCheckCircle />}
                  </div>
                </div>
                <h3 className="result-label" style={{ color: result.prediction === 1 ? 'var(--color-accent-red)' : 'var(--color-accent-green)', fontSize: '3rem', letterSpacing: '-0.5px' }}>
                  {result.prediction_label}
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', marginTop: '12px' }}>
                  Local Inference Diagnosis Result
                </p>

                {/* Probability details */}
                <div style={{ marginTop: '40px', padding: '24px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '1rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--color-accent-green)', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent-green)', display: 'inline-block' }}></span> Negative: {((result?.probability_negative || 0) * 100).toFixed(1)}%</span>
                    <span style={{ color: 'var(--color-accent-red)', display: 'flex', alignItems: 'center', gap: '8px' }}>Positive: {((result?.probability_positive || 0) * 100).toFixed(1)}% <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent-red)', display: 'inline-block' }}></span></span>
                  </div>
                  <div style={{ height: '14px', background: 'rgba(91, 101, 220, 0.1)', borderRadius: '7px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{
                      height: '100%',
                      width: `${result.probability_negative * 100}%`,
                      background: 'var(--gradient-success)',
                      transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}></div>
                    <div style={{
                      height: '100%',
                      width: `${result.probability_positive * 100}%`,
                      background: 'var(--gradient-danger)',
                      transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>Model Confidence Threshold</span>
                    <strong className="confidence-value" style={{ fontSize: '1.75rem' }}>{((result?.confidence || 0) * 100).toFixed(1)}%</strong>
                  </div>
                </div>

                {/* Local SHAP values */}
                {shapValues && Object.keys(shapValues).length > 0 && (
                  <div style={{ marginTop: '40px', textAlign: 'left' }}>
                    <h4 style={{ marginBottom: '20px', fontSize: '1.1rem', color: 'var(--color-text-bright)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: 'rgba(0, 210, 255, 0.1)', padding: '6px', borderRadius: '8px', color: 'var(--color-accent-cyan)', display: 'flex' }}>
                        <HiOutlineSearch size={18} />
                      </div>
                      Feature Attributions (SHAP)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {Object.entries(shapValues)
                        .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                        .slice(0, 5)
                        .map(([feature, value]) => {
                          const maxVal = Math.max(...Object.values(shapValues).map(Math.abs)) || 1
                          const width = (Math.abs(value) / maxVal) * 100
                          return (
                            <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.9rem' }}>
                              <span style={{ width: '120px', fontWeight: 500, color: 'var(--color-text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{feature}</span>
                              <div style={{ flex: 1, height: '10px', background: 'rgba(91, 101, 220, 0.1)', borderRadius: '5px', position: 'relative' }}>
                                <div style={{
                                  position: 'absolute',
                                  left: '50%',
                                  right: value < 0 ? 'auto' : 'none',
                                  transform: value < 0 ? 'translateX(-100%)' : 'none',
                                  width: `${width / 2}%`,
                                  height: '100%',
                                  background: value > 0 ? 'var(--gradient-danger)' : 'var(--gradient-success)',
                                  borderRadius: '5px'
                                }}></div>
                              </div>
                              <span style={{ width: '70px', textAlign: 'right', fontWeight: 700, color: value > 0 ? 'var(--color-accent-red)' : 'var(--color-accent-green)' }}>
                                {value > 0 ? '+' : ''}{value.toFixed(3)}
                              </span>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : predictionError ? (
            <div className="empty-state fade-in" style={{ padding: '32px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <div style={{ background: 'rgba(255, 82, 82, 0.1)', padding: '24px', borderRadius: '50%', display: 'flex' }}>
                   <HiOutlineExclamationCircle size={64} style={{ color: 'var(--color-accent-red)' }} />
                </div>
              </div>
              <h4 style={{ color: 'var(--color-accent-red)', marginBottom: '16px', fontSize: '1.5rem', fontWeight: 700 }}>Prediction Bypassed</h4>
              <p style={{ fontSize: '1rem', background: 'rgba(255, 82, 82, 0.05)', border: '1px solid rgba(255, 82, 82, 0.2)', padding: '20px', borderRadius: '12px', textAlign: 'center', color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
                {predictionError}
              </p>
            </div>
          ) : (
            <div className="empty-state fade-in" style={{ padding: '48px 0', opacity: 0.8, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ background: 'rgba(91, 101, 220, 0.05)', padding: '32px', borderRadius: '50%', marginBottom: '32px', display: 'flex', border: '1px solid rgba(91, 101, 220, 0.1)' }}>
                <HiOutlineSparkles size={64} style={{ color: 'var(--color-accent-blue)' }} />
              </div>
              <h4 style={{ fontSize: '1.5rem', color: 'var(--color-text-bright)', marginBottom: '12px', fontWeight: 600 }}>Awaiting Diagnostic Features</h4>
              <p style={{ fontSize: '1.05rem', color: 'var(--color-text-secondary)', maxWidth: '70%', lineHeight: 1.5 }}>Select an active disease pipeline, input the required medical metrics, and click predict to run local inference.</p>
            </div>
          )}
        </div>
      </div>

      {/* History Table */}
      {showHistory && history.length > 0 && (
        <div className="card fade-in" style={{ marginTop: '32px', padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--color-text-bright)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(91, 101, 220, 0.1)', padding: '8px', borderRadius: '10px', color: 'var(--color-accent-violet)', display: 'flex' }}>
                 <HiOutlineClock size={20} />
              </div>
              Prediction Log History
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowHistory(false)} style={{ borderRadius: '8px' }}>Close Log</button>
          </div>
          <div style={{ overflowX: 'auto', background: 'var(--color-bg-secondary)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ padding: '16px' }}>Prediction ID</th>
                  <th style={{ padding: '16px' }}>Result Class</th>
                  <th style={{ padding: '16px' }}>Model Confidence</th>
                  <th style={{ padding: '16px' }}>Probability (Positive)</th>
                  <th style={{ padding: '16px' }}>Inputs Captured</th>
                  <th style={{ padding: '16px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {history.map(p => (
                  <tr key={p.id}>
                    <td style={{ padding: '16px', color: 'var(--color-text-secondary)' }}>#{p.id}</td>
                    <td style={{ padding: '16px' }}>
                      <span className={`badge ${p.prediction === 1 ? 'badge-error' : 'badge-active'}`} style={{ padding: '6px 12px' }}>
                        {p.prediction_label}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontWeight: 700, color: 'var(--color-text-bright)' }}>
                      {(p.confidence * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: '16px' }}>{(p.probability_positive * 100).toFixed(1)}%</td>
                    <td style={{ padding: '16px', fontSize: '0.8rem', fontFamily: 'monospace', maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>
                      {p.input_data}
                    </td>
                    <td style={{ padding: '16px', opacity: 0.7, fontSize: '0.85rem' }}>
                      {p.created_at ? new Date(p.created_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
