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
      const parsedSchema = JSON.parse(res.data.feature_columns || '[]')
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
              {schema.map(col => {
                let displayLabel = col.replace(/_/g, ' ');
                // Map generic features to friendly labels for Diabetes models
                if (server?.disease_type?.toLowerCase().includes('diabetes')) {
                  const diabetesMap = {
                    f0: 'Pregnancies', f1: 'Glucose', f2: 'Blood Pressure', 
                    f3: 'Skin Thickness', f4: 'Insulin', f5: 'BMI', 
                    f6: 'Diabetes Pedigree Function', f7: 'Age'
                  };
                  if (diabetesMap[col]) displayLabel = diabetesMap[col];
                }
                
                return (
                  <div key={col} className="input-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      {displayLabel}
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
              )})}
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
              <div style={{ 
                position: 'relative',
                padding: '40px', 
                borderRadius: '20px',
                background: 'var(--color-bg-primary)',
                boxShadow: prediction.prediction === 1 
                  ? '0 20px 40px -10px rgba(231, 76, 60, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)' 
                  : '0 20px 40px -10px rgba(16, 185, 129, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                border: `1px solid ${prediction.prediction === 1 ? 'rgba(231, 76, 60, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                overflow: 'hidden'
              }}>
                {/* Decorative background blur */}
                <div style={{
                  position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
                  background: prediction.prediction === 1 
                    ? 'radial-gradient(circle, rgba(231, 76, 60, 0.08) 0%, transparent 60%)' 
                    : 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 60%)',
                  pointerEvents: 'none', zIndex: 0
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                    <div style={{ 
                      padding: '8px', borderRadius: '12px',
                      background: prediction.prediction === 1 ? 'rgba(231, 76, 60, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: prediction.prediction === 1 ? '#ef4444' : '#10b981' 
                    }}>
                      {prediction.prediction === 1 ? (
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                      AI Diagnosis
                    </h3>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
                    <div style={{ 
                      fontSize: '4rem', 
                      fontWeight: 900, 
                      lineHeight: 1, 
                      letterSpacing: '-1px',
                      background: prediction.prediction === 1 
                        ? 'linear-gradient(135deg, #fca5a5 0%, #ef4444 50%, #b91c1c 100%)' 
                        : 'linear-gradient(135deg, #6ee7b7 0%, #10b981 50%, #047857 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))'
                    }}>
                      {prediction.prediction_label}
                    </div>
                  </div>

                  <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Confidence Level</span>
                      <span style={{ 
                        fontSize: '1.1rem', fontWeight: 800, 
                        color: prediction.prediction === 1 ? '#ef4444' : '#10b981'
                      }}>
                        {(prediction.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '12px', background: 'var(--color-border)', borderRadius: '6px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${prediction.confidence * 100}%`,
                        background: prediction.prediction === 1 
                          ? 'linear-gradient(90deg, #fca5a5, #ef4444)' 
                          : 'linear-gradient(90deg, #6ee7b7, #10b981)',
                        borderRadius: '6px',
                        boxShadow: prediction.prediction === 1 
                          ? '0 0 10px rgba(239, 68, 68, 0.5)' 
                          : '0 0 10px rgba(16, 185, 129, 0.5)',
                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                      }} />
                    </div>
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
