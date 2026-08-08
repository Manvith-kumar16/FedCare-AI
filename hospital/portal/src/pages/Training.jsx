import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import { startTraining, getTrainingStatus } from '../api'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineLightningBolt, HiOutlineAdjustments, HiOutlineShieldCheck,
  HiOutlineCheckCircle, HiOutlineTrendingUp, HiOutlineOfficeBuilding,
  HiOutlineClipboardList, HiOutlineLockClosed, HiOutlineRefresh
} from 'react-icons/hi'

export default function Training() {
  const [training, setTraining] = useState(null)
  const [isTraining, setIsTraining] = useState(false)
  const [numRounds, setNumRounds] = useState(5)
  const [localEpochs, setLocalEpochs] = useState(10)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [result, setResult] = useState(null)
  const { addToast, userRole } = useApp()
  const isAdmin = userRole?.toUpperCase() === 'ADMIN'

  useEffect(() => { loadStatus() }, [])

  async function loadStatus() {
    try {
      setAccessDenied(false)
      const res = await getTrainingStatus(1)
      setTraining(res.data)
    } catch (e) {
      if (e.response?.status === 403) {
        setAccessDenied(true)
      }
      /* no training data yet or access denied handled by state */
    }
    finally { setLoading(false) }
  }

  async function handleStartTraining() {
    setIsTraining(true)
    setResult(null)
    addToast('Starting federated training...', 'info')
    try {
      await startTraining({
        server_id: 1,
        num_rounds: numRounds,
        local_epochs: localEpochs,
      })

      // Poll training status until it's no longer TRAINING, then show results
      const pollInterval = 2000
      const timeoutMs = 1000 * 60 * 10 // 10 minutes max
      const start = Date.now()
      let finalData = null
      while (Date.now() - start < timeoutMs) {
        await new Promise(r => setTimeout(r, pollInterval))
        try {
          const st = await getTrainingStatus(1)
          const data = st.data
          if (!data) continue
          if (data.status === 'COMPLETED') {
            // derive final metrics from logs
            const globalLogs = (data.logs || []).filter(l => l.log_type === 'global')
            const last = globalLogs[globalLogs.length - 1] || null
            finalData = {
              final_accuracy: last?.global_accuracy || data.global_accuracy || 0,
              final_loss: last?.global_loss || 0,
              total_rounds: data.total_rounds || data.current_round || 0,
            }
            break
          }
          if (data.status === 'ACTIVE') {
            // training aborted/returned to idle
            break
          }
        } catch (e) {
          // ignore transient errors and continue polling
        }
      }

      if (finalData) {
        setResult(finalData)
        addToast(`Training complete! Accuracy: ${(finalData.final_accuracy * 100).toFixed(2)}%`, 'success')
      } else {
        addToast('Training did not complete within the expected time', 'error')
      }
      await loadStatus()
    } catch (e) {
      addToast(`Training failed: ${e.response?.data?.detail || e.message}`, 'error')
    } finally {
      setIsTraining(false)
    }
  }

  const globalLogs = training?.logs?.filter(l => l.log_type === 'global') || []
  const localLogs = training?.logs?.filter(l => l.log_type === 'local') || []

  // Per-round accuracy chart
  const uniqueRounds = [...new Set(globalLogs.map(l => l.round_number))]
  const accuracyChart = {
    labels: uniqueRounds.map(r => `Round ${r}`),
    datasets: [{
      label: 'Global Accuracy (%)',
      data: globalLogs.map(l => (l.global_accuracy * 100).toFixed(2)),
      borderColor: '#667eea',
      backgroundColor: 'rgba(102, 126, 234, 0.15)',
      tension: 0.4,
      fill: true,
      pointRadius: 6,
      pointBackgroundColor: '#667eea',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    }, {
      label: 'Global Loss',
      data: globalLogs.map(l => (l.global_loss * 100).toFixed(2)),
      borderColor: '#ff5252',
      backgroundColor: 'rgba(255, 82, 82, 0.08)',
      tension: 0.4,
      fill: false,
      pointRadius: 4,
      borderDash: [5, 5],
    }]
  }

  // Hospital comparison
  const hospitalNames = [...new Set(localLogs.map(l => l.hospital_name))]
  const colors = ['#667eea', '#764ba2', '#00d2ff', '#00e676']
  const hospitalChart = {
    labels: uniqueRounds.map(r => `Round ${r}`),
    datasets: hospitalNames.map((name, idx) => ({
      label: name?.split(' ').slice(0, 2).join(' ') || 'Hospital',
      data: uniqueRounds.map(r => {
        const log = localLogs.find(l => l.round_number === r && l.hospital_name === name)
        return log ? (log.local_accuracy * 100).toFixed(2) : 0
      }),
      borderColor: colors[idx % colors.length],
      tension: 0.4,
      pointRadius: 4,
    }))
  }

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#9ea7c0', font: { family: 'Inter' } } } },
    scales: {
      x: { ticks: { color: '#5c6484' }, grid: { color: 'rgba(102, 126, 234, 0.06)' } },
      y: { ticks: { color: '#5c6484' }, grid: { color: 'rgba(102, 126, 234, 0.06)' }, min: 0 },
    }
  }

  if (loading) return <div className="loader"><div className="spinner"></div></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <HiOutlineLightningBolt style={{ color: 'var(--color-accent-blue)' }} /> Federated Training
          </h1>
          <p style={{ fontSize: 'var(--font-size-xs)' }}>Train XGBoost models across hospital nodes with FedAvg aggregation</p>
        </div>
      </div>

      {accessDenied ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '24px', color: 'var(--color-text-muted)' }}><HiOutlineLockClosed /></div>
          <h2 style={{ color: 'var(--color-text-bright)', marginBottom: '16px' }}>Membership Required</h2>
          <p style={{ maxWidth: '500px', margin: '0 auto 32px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Federated training metrics and logs are restricted to approved partner nodes.
            You must join the disease server and receive administrator approval to view this data.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate('/servers')}>
              Browse Servers to Join
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Training Control */}
          <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="section-header">
              <h3 style={{ fontSize: 'var(--font-size-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HiOutlineAdjustments /> Training Configuration
              </h3>
              {training && (
                <span className={`badge badge-${training.status.toLowerCase()}`}>{training.status}</span>
              )}
            </div>

            {isAdmin ? (
              <>
                <div className="form-row" style={{ marginBottom: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">Number of FL Rounds</label>
                    <input
                      type="number" className="form-input" min="1" max="20"
                      value={numRounds} onChange={e => setNumRounds(parseInt(e.target.value) || 5)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Local Training Epochs</label>
                    <input
                      type="number" className="form-input" min="1" max="50"
                      value={localEpochs} onChange={e => setLocalEpochs(parseInt(e.target.value) || 10)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleStartTraining}
                    disabled={isTraining}
                  >
                    {isTraining ? (
                      <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span> Training...</>
                    ) : (
                      <><HiOutlineLightningBolt /> Start Federated Training</>
                    )}
                  </button>

                  {training?.global_accuracy > 0 && (
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      Current Accuracy: <strong style={{ color: 'var(--color-accent-cyan)' }}>
                        {((training?.global_accuracy || 0) * 100).toFixed(2)}%
                      </strong>
                      {' • '}Rounds: {training?.current_round || 0}/{training?.total_rounds || 0}
                      {' • '}Hospitals: {training?.participating_hospitals || 0}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state" style={{ padding: '20px 0', textAlign: 'left' }}>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HiOutlineShieldCheck style={{ color: 'var(--color-accent-green)' }} /> 
                  <span>
                    <strong>View-Only Mode</strong>: Federated training can only be initiated by a system administrator.
                    You can monitor the real-time progress and logs below as the training rounds proceed.
                  </span>
                </p>
                {training?.global_accuracy > 0 && (
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: '12px' }}>
                    Current Accuracy: <strong style={{ color: 'var(--color-accent-cyan)' }}>
                      {(training.global_accuracy * 100).toFixed(2)}%
                    </strong>
                    {' • '}Rounds: {training.current_round}/{training.total_rounds}
                    {' • '}Hospitals: {training.participating_hospitals}
                  </div>
                )}
              </div>
            )}

            {isTraining && (
              <div style={{ marginTop: '16px' }}>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '100%', animation: 'shimmer 1.5s infinite' }}></div>
                </div>
                <p style={{ marginTop: '8px', fontSize: 'var(--font-size-sm)', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HiOutlineRefresh className="spin" /> Training in progress... Models are being trained locally at each hospital and aggregated centrally.
                </p>
              </div>
            )}
          </div>

          {/* Result banner */}
          {result && (
            <div className="card" style={{ marginBottom: 'var(--space-lg)', background: 'rgba(0, 230, 118, 0.06)', borderColor: 'rgba(0, 230, 118, 0.2)', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '1.5rem', color: 'var(--color-accent-green)' }}><HiOutlineCheckCircle /></span>
                <div>
                  <h3 style={{ color: 'var(--color-accent-green)', marginBottom: '4px', fontSize: 'var(--font-size-md)' }}>Training Complete</h3>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                    Final Accuracy: <strong>{(result.final_accuracy * 100).toFixed(2)}%</strong>
                    {' • '}Loss: <strong>{result.final_loss?.toFixed(4)}</strong>
                    {' • '}Rounds: <strong>{result.total_rounds}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Charts */}
          {globalLogs.length > 0 && (
            <div className="content-grid">
              <div className="card">
                <div className="section-header">
                  <h3 style={{ fontSize: 'var(--font-size-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HiOutlineTrendingUp style={{ color: 'var(--color-accent-blue)' }} /> Global Model Performance
                  </h3>
                </div>
                <div className="chart-container">
                  <Line data={accuracyChart} options={chartOpts} />
                </div>
              </div>
              <div className="card">
                <div className="section-header">
                  <h3 style={{ fontSize: 'var(--font-size-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HiOutlineOfficeBuilding style={{ color: 'var(--color-accent-pink)' }} /> Per-Hospital Accuracy
                  </h3>
                </div>
                <div className="chart-container">
                  <Line data={hospitalChart} options={chartOpts} />
                </div>
              </div>
            </div>
          )}

          {/* Training Logs */}
          {localLogs.length > 0 && (
            <div className="card">
              <div className="section-header">
                <h3 style={{ fontSize: 'var(--font-size-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HiOutlineClipboardList /> Training Logs
                </h3>
                <span className="badge badge-training">{localLogs.length} entries</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Round</th>
                      <th>Hospital</th>
                      <th>Accuracy</th>
                      <th>F1 Score</th>
                      <th>Precision</th>
                      <th>Recall</th>
                      <th>Loss</th>
                      <th>Samples</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localLogs.map((log, i) => (
                      <tr key={i}>
                        <td><span className="badge badge-training">R{log.round_number}</span></td>
                        <td style={{ fontWeight: 600 }}>{log.hospital_name?.split(' ').slice(0, 2).join(' ')}</td>
                        <td style={{ color: 'var(--color-accent-cyan)', fontWeight: 700 }}>
                          {(log.local_accuracy * 100).toFixed(2)}%
                        </td>
                        <td>{(log.local_f1 * 100).toFixed(1)}%</td>
                        <td>{(log.local_precision * 100).toFixed(1)}%</td>
                        <td>{(log.local_recall * 100).toFixed(1)}%</td>
                        <td>{log.local_loss.toFixed(4)}</td>
                        <td>{log.samples_trained}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
