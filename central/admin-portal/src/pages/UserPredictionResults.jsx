import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getServer, predictDisease, explainPrediction } from '../api'
import { useApp } from '../contexts/AppContext'
import { HiOutlineArrowLeft, HiOutlineBeaker, HiOutlineLightningBolt } from 'react-icons/hi'
import Loader from '../components/Loader'

export default function UserPredictionResults() {
  const { serverId } = useParams()
  const navigate = useNavigate()
  const { addToast } = useApp()
  
  const [server, setServer] = useState(null)
  const [schema, setSchema] = useState([])
  const [formData, setFormData] = useState({})
  
  const [loading, setLoading] = useState(true)
  const [predicting, setPredicting] = useState(false)
  
  const [prediction, setPrediction] = useState(null)
  const [explanation, setExplanation] = useState(null)

  useEffect(() => {
    fetchServer()
  }, [serverId])

  const fetchServer = async () => {
    try {
      const res = await getServer(serverId)
      setServer(res.data)
      const parsedSchema = JSON.parse(res.data.schema_json || '[]')
      setSchema(parsedSchema)
      
      // Initialize form
      const initialForm = {}
      parsedSchema.forEach(col => {
        initialForm[col] = ''
      })
      setFormData(initialForm)
    } catch (err) {
      addToast('Failed to load disease model details.', 'error')
      navigate('/user-dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (col, value) => {
    setFormData(prev => ({ ...prev, [col]: value }))
  }

  const handlePredict = async (e) => {
    e.preventDefault()
    setPredicting(true)
    setPrediction(null)
    setExplanation(null)
    
    // Convert string inputs to floats
    const numericFeatures = {}
    for (const [key, val] of Object.entries(formData)) {
      numericFeatures[key] = parseFloat(val) || 0.0
    }

    try {
      // 1. Get Prediction
      const predRes = await predictDisease({ server_id: parseInt(serverId), features: numericFeatures })
      setPrediction(predRes.data)
      
      // 2. Get Explanation (SHAP)
      try {
        const expRes = await explainPrediction(serverId, { server_id: parseInt(serverId), features: numericFeatures })
        setExplanation(expRes.data)
      } catch (err) {
        console.error("SHAP Explanation failed:", err)
        // Don't fail the whole request if only explanation fails
      }
      
    } catch (err) {
      const msg = err.response?.data?.detail || 'Prediction failed. Is the global model ready?'
      addToast(msg, 'error')
    } finally {
      setPredicting(false)
    }
  }

  if (loading) return <Loader />

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button 
          onClick={() => navigate('/user-dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '50%', backgroundColor: 'rgba(91, 101, 220, 0.1)', color: 'var(--color-accent-blue)' }}
        >
          <HiOutlineArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>{server?.name} Predictor</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', margin: '4px 0 0 0' }}>Enter patient biomarkers to receive an AI-powered prediction.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Input Form */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <HiOutlineBeaker size={24} color="var(--color-accent-blue)" />
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Patient Data Input</h2>
          </div>
          
          <form onSubmit={handlePredict} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {schema.map(col => (
                <div key={col} className="input-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                    {col.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData[col]}
                    onChange={(e) => handleInputChange(col, e.target.value)}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '8px',
                      background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)'
                    }}
                  />
                </div>
              ))}
            </div>
            
            <button
              type="submit"
              disabled={predicting}
              className="btn btn-primary"
              style={{
                marginTop: '16px', padding: '14px', borderRadius: '8px',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
              }}
            >
              {predicting ? <span className="spinner-small" style={{ borderColor: '#fff' }}></span> : <><HiOutlineLightningBolt /> Run Prediction</>}
            </button>
          </form>
        </div>

        {/* Results Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {predicting && (
             <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Loader />
                <p style={{ marginTop: '16px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Analyzing features and generating Explainable AI visualizations...</p>
             </div>
          )}

          {!predicting && !prediction && (
            <div className="glass-panel" style={{ padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderStyle: 'dashed' }}>
              <HiOutlineBeaker size={48} color="var(--color-text-muted)" style={{ marginBottom: '16px' }} />
              <h3 style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Awaiting Input</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '8px' }}>Fill out the patient data form and click "Run Prediction" to see the AI analysis.</p>
            </div>
          )}

          {!predicting && prediction && (
            <>
              {/* Prediction Card */}
              <div className="glass-panel" style={{ 
                padding: '32px', 
                background: prediction.prediction === 1 ? 'linear-gradient(135deg, rgba(231, 76, 60, 0.1) 0%, rgba(231, 76, 60, 0.05) 100%)' : 'linear-gradient(135deg, rgba(46, 204, 113, 0.1) 0%, rgba(46, 204, 113, 0.05) 100%)',
                border: `1px solid ${prediction.prediction === 1 ? 'rgba(231, 76, 60, 0.3)' : 'rgba(46, 204, 113, 0.3)'}`
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>AI Diagnosis</h3>
                
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
                  <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1, color: prediction.prediction === 1 ? '#e74c3c' : '#2ecc71' }}>
                    {prediction.prediction_label}
                  </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Confidence Level</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{(prediction.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${prediction.confidence * 100}%`,
                      background: prediction.prediction === 1 ? '#e74c3c' : '#2ecc71',
                      borderRadius: '4px'
                    }} />
                  </div>
                </div>
              </div>

              {/* Explainability Card */}
              {explanation && explanation.plot_base64 && (
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Explainable AI (SHAP)
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                    The chart below shows how each biomarker contributed to the final prediction. Red bars push the prediction towards Positive, while green bars push it towards Negative.
                  </p>
                  
                  <div style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                    <img 
                      src={`data:image/png;base64,${explanation.plot_base64}`} 
                      alt="SHAP Explanation Waterfall" 
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
