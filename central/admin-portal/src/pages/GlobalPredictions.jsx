import { useState, useEffect } from 'react'
import { predictDisease, predictDiseaseImage, explainPrediction, getServers } from '../api'
import Loader from '../components/Loader'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineSparkles, HiOutlineClipboardList, HiOutlineSearch,
  HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineTemplate
} from 'react-icons/hi'

export default function GlobalPredictions() {
  const [servers, setServers] = useState([])
  const [selectedServer, setSelectedServer] = useState(null)
  const [featureColumns, setFeatureColumns] = useState([])
  const [form, setForm] = useState({})
  const [imageFile, setImageFile] = useState(null)
  const [result, setResult] = useState(null)
  const [predictionError, setPredictionError] = useState(null)
  const [predicting, setPredicting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState(null)
  const { addToast } = useApp()

  useEffect(() => {
    loadServers()
  }, [])

  useEffect(() => {
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
      setFeatureColumns([])
      setForm({})
    }
  }, [selectedServer])

  async function loadServers() {
    setLoading(true)
    try {
      const res = await getServers()
      setServers(res.data)
      if (res.data.length > 0) {
        setSelectedServer(res.data[0])
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
    setExplanation(null)
    setImageFile(null)
  }

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handlePredict(e) {
    if (e) e.preventDefault()

    if (selectedServer?.model_type !== 'cnn') {
      const unfilled = featureColumns.filter(f => form[f] === '')
      if (unfilled.length > 0) {
        addToast(`Please fill all fields: ${unfilled.join(', ')}`, 'warning')
        return
      }
    } else {
      if (!imageFile) {
        addToast("Please select an image file to upload", "warning")
        return
      }
    }

    setPredicting(true)
    setResult(null)
    setExplanation(null)
    setPredictionError(null)
    
    try {
      let res;
      if (selectedServer?.model_type === 'cnn') {
        const formData = new FormData()
        formData.append('server_id', selectedServer.id)
        formData.append('image', imageFile)
        res = await predictDiseaseImage(formData)
        setResult(res.data)
        
        if (res.data.plot_base64) {
          setExplanation({ is_image: true, plot_base64: res.data.plot_base64 })
        }
      } else {
        const numericFeatures = {}
        featureColumns.forEach(f => {
          numericFeatures[f] = parseFloat(form[f]) || 0.0
        })

        const payload = {
          server_id: selectedServer.id,
          features: numericFeatures
        }

        res = await predictDisease(payload)
        setResult(res.data)
        
        try {
          const expRes = await explainPrediction(selectedServer.id, payload)
          setExplanation(expRes.data)
        } catch (err) {
          console.error("Failed to generate global SHAP", err)
        }
      }

      addToast('Global Prediction generated successfully!', 'success')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Prediction failed. Global model may not be compiled yet.'
      setPredictionError(msg)
      addToast(msg, 'error')
    } finally {
      setPredicting(false)
    }
  }

  function fillSample() {
    if (!selectedServer) return
    const newForm = {}
    
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

  if (loading) {
    return <Loader message="Initializing global model predictors..." />
  }

  return (
    <div className="predictions-page fade-in">
      <div className="page-header" style={{ alignItems: 'flex-end', borderBottom: '1px solid var(--color-border)', paddingBottom: '24px', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>Global Inference Gateway</h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            Compute diagnostics using the aggregated global federated model.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={fillSample} disabled={!selectedServer || featureColumns.length === 0} style={{ padding: '10px 20px', borderRadius: '12px' }}>
            <HiOutlineTemplate size={18} /> Fill Mock Patient
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
        {/* Input Form Column */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '24px', background: 'var(--color-bg-card)', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.03)', boxShadow: '0 20px 40px rgba(0,0,0,0.04)' }}>
          <h3 className="section-header" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--color-text-dark)', fontSize: '1.4rem', fontWeight: 800 }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(114, 176, 171, 0.2) 0%, rgba(114, 176, 171, 0.05) 100%)', padding: '10px', borderRadius: '16px', color: 'var(--color-accent-cyan)', display: 'flex', boxShadow: '0 4px 12px rgba(114, 176, 171, 0.15)' }}>
              <HiOutlineClipboardList size={24} />
            </div>
            Diagnostic Inputs
          </h3>

          <div className="form-group" style={{ background: 'rgba(0,0,0,0.02)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)' }}>
            <label className="form-label" style={{ fontWeight: 700, color: 'var(--color-accent-blue)', fontSize: '0.85rem', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Global Model Pipeline</label>
            <select
              className="form-select"
              value={selectedServer?.id || ''}
              onChange={handleServerChange}
              disabled={servers.length === 0}
              style={{ padding: '12px', fontSize: '1rem', borderRadius: '12px', background: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}
            >
              {servers.length === 0 && <option value="">No Active Models Available</option>}
              {servers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.disease_type})</option>
              ))}
            </select>
          </div>

          {selectedServer && featureColumns.length === 0 && selectedServer.model_type !== 'cnn' && (
            <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(184, 157, 71, 0.2) 0%, rgba(184, 157, 71, 0.05) 100%)', padding: '20px', borderRadius: '50%', marginBottom: '20px', display: 'flex', boxShadow: '0 10px 24px rgba(184, 157, 71, 0.15)' }}>
                <HiOutlineExclamationCircle size={48} style={{ color: 'var(--color-accent-orange)' }} />
              </div>
              <h4 style={{ fontSize: '1.2rem', color: 'var(--color-text-dark)', marginBottom: '10px', fontWeight: 800 }}>No Feature Mapping Found</h4>
              <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: '85%', fontSize: '1rem', lineHeight: 1.5 }}>This server has not defined any tabular features.</p>
            </div>
          )}

          {selectedServer && (featureColumns.length > 0 || selectedServer.model_type === 'cnn') && (
            <form onSubmit={handlePredict} style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '24px' }}>
              {selectedServer?.model_type === 'cnn' ? (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', fontWeight: 600 }}>Chest X-Ray Image</label>
                  <div style={{ background: 'rgba(0,0,0,0.02)', padding: '6px', borderRadius: '16px', border: '1px dashed rgba(0,0,0,0.1)' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setImageFile(e.target.files[0])}
                      className="form-input"
                      style={{ padding: '12px', width: '100%', background: 'transparent', border: 'none' }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px', overflowY: 'auto', paddingRight: '8px', maxHeight: '400px' }}>
                  {featureColumns.map(f => (
                    <div className="form-group" key={f} style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', fontWeight: 600 }}>{f}</label>
                      <input
                        type="number"
                        step="any"
                        placeholder={`Enter ${f}...`}
                        value={form[f] || ''}
                        onChange={e => updateField(f, e.target.value)}
                        className="form-input"
                        style={{ padding: '12px', borderRadius: '12px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', fontSize: '1rem' }}
                        required
                      />
                    </div>
                  ))}
                </div>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={predicting}
                style={{ width: '100%', justifyContent: 'center', marginTop: '24px', padding: '16px', fontSize: '1.1rem', fontWeight: 700, borderRadius: '16px', border: 'none', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', background: 'linear-gradient(135deg, var(--color-accent-blue) 0%, #7A4A58 100%)', boxShadow: '0 8px 24px rgba(152, 94, 109, 0.3)' }}
              >
                {predicting ? (
                  <>Processing <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px', marginLeft: '12px', borderTopColor: '#ffffff' }}></span></>
                ) : (
                  <>Predict {selectedServer.disease_type} Risk <HiOutlineSparkles size={20} style={{ marginLeft: '8px' }} /></>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Result Column */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden', height: '100%', padding: '24px', background: 'var(--color-bg-card)', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.03)', boxShadow: '0 20px 40px rgba(0,0,0,0.04)' }}>
          {result && (
             <div style={{
               position: 'absolute', top: '25%', left: '50%', width: '400px', height: '400px',
               background: result.prediction === 1 ? 'var(--color-accent-red)' : 'var(--color-accent-green)',
               opacity: 0.06, filter: 'blur(80px)', transform: 'translate(-50%, -50%)', pointerEvents: 'none', borderRadius: '50%', transition: 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
             }}></div>
          )}

          {result ? (
            <div className="fade-in" style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="prediction-result" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  <div style={{
                    position: 'absolute', top: '-16px', left: '-16px', right: '-16px', bottom: '-16px',
                    borderRadius: '50%', border: `2px solid ${result.prediction === 1 ? 'rgba(254, 145, 121, 0.2)' : 'rgba(114, 176, 171, 0.2)'}`,
                    animation: 'pulse 2.5s infinite cubic-bezier(0.4, 0, 0.2, 1)', opacity: 0.6
                  }}></div>
                  <div className={`result-icon ${result.prediction === 1 ? 'positive' : 'negative'}`} style={{ width: '100px', height: '100px', fontSize: '3.5rem', margin: 0, background: '#ffffff', boxShadow: `0 8px 24px ${result.prediction === 1 ? 'rgba(254, 145, 121, 0.25)' : 'rgba(114, 176, 171, 0.25)'}`, border: `3px solid ${result.prediction === 1 ? 'var(--color-accent-red)' : 'var(--color-accent-green)'}`, position: 'relative', zIndex: 2 }}>
                    {result.prediction === 1 ? <HiOutlineExclamationCircle /> : <HiOutlineCheckCircle />}
                  </div>
                </div>
                <h3 className="result-label" style={{ color: result.prediction === 1 ? 'var(--color-accent-red)' : 'var(--color-accent-green)', fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px', marginBottom: '4px', textAlign: 'center' }}>
                  {result.prediction_label}
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center', marginBottom: '16px' }}>
                  Global Inference Diagnosis Result
                </p>

                <div style={{ padding: '12px 20px', background: result.prediction === 1 ? 'rgba(254, 145, 121, 0.08)' : 'rgba(114, 176, 171, 0.08)', borderRadius: '12px', border: `1px solid ${result.prediction === 1 ? 'rgba(254, 145, 121, 0.2)' : 'rgba(114, 176, 171, 0.2)'}`, color: result.prediction === 1 ? 'var(--color-accent-red)' : 'var(--color-accent-green)', fontSize: '0.95rem', fontWeight: 500, textAlign: 'center', maxWidth: '85%' }}>
                  {result.prediction === 1 
                    ? `The model has identified patterns strongly consistent with ${selectedServer?.disease_type || 'a positive diagnosis'}. Medical review is recommended.`
                    : `No significant indicators of ${selectedServer?.disease_type || 'the disease'} were detected. Features appear to align with a healthy baseline.`}
                </div>

                <div style={{ marginTop: '24px', width: '100%', padding: '20px', background: 'linear-gradient(180deg, rgba(245, 243, 245, 0.6) 0%, rgba(245, 243, 245, 0.2) 100%)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '1rem', fontWeight: 700 }}>
                    <span style={{ color: 'var(--color-accent-green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--color-accent-green)', display: 'inline-block', boxShadow: '0 2px 6px rgba(114, 176, 171, 0.4)' }}></span> 
                      Negative: {((result?.probability_negative || 0) * 100).toFixed(1)}%
                    </span>
                    <span style={{ color: 'var(--color-accent-red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Positive: {((result?.probability_positive || 0) * 100).toFixed(1)}% 
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--color-accent-red)', display: 'inline-block', boxShadow: '0 2px 6px rgba(254, 145, 121, 0.4)' }}></span>
                    </span>
                  </div>
                  
                  <div style={{ position: 'relative', height: '16px', background: 'rgba(0,0,0,0.04)', borderRadius: '8px', overflow: 'hidden', display: 'flex', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{
                      height: '100%',
                      width: `${result.probability_negative * 100}%`,
                      background: 'linear-gradient(90deg, #72B0AB 0%, #4FA19A 100%)',
                      transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative'
                    }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)' }}></div>
                    </div>
                    <div style={{
                      height: '100%',
                      width: `${result.probability_positive * 100}%`,
                      background: 'linear-gradient(90deg, #FE9179 0%, #F86E51 100%)',
                      transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative'
                    }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)' }}></div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Model Confidence Threshold</span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>System diagnostic certainty</span>
                    </div>
                    <strong style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text-dark)', textShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      {((result?.confidence || 0) * 100).toFixed(1)}<span style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)' }}>%</span>
                    </strong>
                  </div>
                </div>

                {explanation && explanation.plot_base64 && (
                  <div style={{ marginTop: '24px', width: '100%', textAlign: 'left', background: '#ffffff', padding: '20px', borderRadius: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.04)' }}>
                    <h4 style={{ marginBottom: '16px', fontSize: '1.1rem', color: 'var(--color-text-dark)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: 'linear-gradient(135deg, rgba(114, 176, 171, 0.2) 0%, rgba(114, 176, 171, 0.05) 100%)', padding: '8px', borderRadius: '10px', color: 'var(--color-accent-cyan)', display: 'flex', boxShadow: '0 4px 8px rgba(114, 176, 171, 0.1)' }}>
                        <HiOutlineSearch size={18} />
                      </div>
                      {explanation.is_image ? 'Visual Explainability (Grad-CAM)' : 'Global Feature Attributions (SHAP)'}
                    </h4>
                    
                    {explanation.is_image ? (
                      <div style={{ display: 'flex', gap: '16px', background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '16px', border: '1px dashed rgba(0,0,0,0.1)' }}>
                        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: '12px', padding: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                          <img 
                            src={`data:image/jpeg;base64,${explanation.plot_base64}`} 
                            alt="Grad-CAM" 
                            style={{ maxWidth: '100%', height: '130px', objectFit: 'contain', borderRadius: '8px' }} 
                          />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <h5 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-dark)', marginBottom: '8px' }}>How to read this heatmap</h5>
                          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                            The global AI uses <strong>Grad-CAM</strong> to show which parts of the X-ray it focused on to make its diagnosis.
                          </p>
                          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'linear-gradient(135deg, #FE9179, #F86E51)' }}></span>
                              <span style={{ color: 'var(--color-text-dark)' }}><strong>Warm colors (Red/Yellow):</strong> Push towards a positive diagnosis.</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'linear-gradient(135deg, #72B0AB, #4FA19A)' }}></span>
                              <span style={{ color: 'var(--color-text-dark)' }}><strong>Cool colors (Blue):</strong> Indicate normal/healthy regions.</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)', marginTop: '16px' }}>
                        <img 
                          src={`data:image/png;base64,${explanation.plot_base64}`} 
                          alt="SHAP Explanation Waterfall" 
                          style={{ width: '100%', height: 'auto', display: 'block' }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : predictionError ? (
            <div className="empty-state fade-in" style={{ padding: '32px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#ffffff', borderRadius: '24px' }}>
              <div style={{ position: 'relative', marginBottom: '32px' }}>
                <div style={{
                  position: 'absolute', top: '-15px', left: '-15px', right: '-15px', bottom: '-15px',
                  borderRadius: '50%', border: '2px solid rgba(254, 145, 121, 0.2)',
                  animation: 'pulse 2s infinite cubic-bezier(0.4, 0, 0.2, 1)', opacity: 0.7
                }}></div>
                <div style={{ background: '#ffffff', padding: '24px', borderRadius: '50%', display: 'flex', boxShadow: '0 12px 32px rgba(254, 145, 121, 0.2)', border: '4px solid var(--color-accent-red)', position: 'relative', zIndex: 2 }}>
                   <HiOutlineExclamationCircle size={64} style={{ color: 'var(--color-accent-red)' }} />
                </div>
              </div>
              <h4 style={{ color: 'var(--color-accent-red)', marginBottom: '16px', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Prediction Bypassed</h4>
              <p style={{ fontSize: '1rem', background: 'rgba(254, 145, 121, 0.04)', border: '1px solid rgba(254, 145, 121, 0.2)', padding: '20px 24px', borderRadius: '16px', textAlign: 'center', color: 'var(--color-text-dark)', lineHeight: 1.6, maxWidth: '90%', boxShadow: '0 4px 12px rgba(254, 145, 121, 0.05)' }}>
                {predictionError}
              </p>
            </div>
          ) : (
            <div className="empty-state fade-in" style={{ padding: '40px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#ffffff', borderRadius: '24px' }}>
              <div style={{ position: 'relative', marginBottom: '40px' }}>
                <div style={{
                  position: 'absolute', top: '-24px', left: '-24px', right: '-24px', bottom: '-24px',
                  borderRadius: '50%', border: '2px dashed rgba(114, 176, 171, 0.4)',
                  animation: 'spin 15s linear infinite', opacity: 0.6
                }}></div>
                <div style={{ background: '#ffffff', padding: '32px', borderRadius: '50%', display: 'flex', border: '1px solid rgba(114, 176, 171, 0.2)', boxShadow: '0 12px 36px rgba(114, 176, 171, 0.15)', position: 'relative', zIndex: 2 }}>
                  <HiOutlineSparkles size={64} style={{ color: 'var(--color-accent-cyan)' }} />
                </div>
              </div>
              <h4 style={{ fontSize: '1.6rem', color: 'var(--color-text-dark)', marginBottom: '16px', fontWeight: 800, letterSpacing: '-0.5px' }}>Awaiting Diagnostic Features</h4>
              <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', maxWidth: '85%', lineHeight: 1.6, textAlign: 'center' }}>Select an active disease pipeline, input the required medical metrics, and click predict to run global inference.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
