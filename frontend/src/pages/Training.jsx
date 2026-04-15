import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import { startTraining, getTrainingStatus } from '../api'
import { useApp } from '../contexts/AppContext'

export default function Training() {
  const [training, setTraining] = useState(null)
  const [isTraining, setIsTraining] = useState(false)
  const [numRounds, setNumRounds] = useState(5)
  const [localEpochs, setLocalEpochs] = useState(10)
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)
  const { addToast } = useApp()

  useEffect(() => { loadStatus() }, [])

  async function loadStatus() {
    try {
      const res = await getTrainingStatus(1)
      setTraining(res.data)
    } catch (e) { /* no training data yet */ }
    finally { setLoading(false) }
  }

  async function handleStartTraining() {
    setIsTraining(true)
    setResult(null)
    addToast('Starting federated training...', 'info')
    try {
      const res = await startTraining({
        server_id: 1,
        num_rounds: numRounds,
        local_epochs: localEpochs,
      })
      setResult(res.data)
      addToast(`Training complete! Accuracy: ${(res.data.final_accuracy * 100).toFixed(2)}%`, 'success')
      // Reload status
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
          <h1>⚡ Federated Training</h1>
          <p>Train XGBoost models across hospital nodes with FedAvg aggregation</p>
        </div>
      </div>

      {/* Training Control */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="section-header">
          <h3>🎛️ Training Configuration</h3>
          {training && (
            <span className={`badge badge-${training.status.toLowerCase()}`}>{training.status}</span>
          )}
        </div>

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
              <>⚡ Start Federated Training</>
            )}
          </button>

          {training?.global_accuracy > 0 && (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Current Accuracy: <strong style={{ color: 'var(--color-accent-cyan)' }}>
                {(training.global_accuracy * 100).toFixed(2)}%
              </strong>
              {' • '}Rounds: {training.current_round}/{training.total_rounds}
              {' • '}Hospitals: {training.participating_hospitals}
            </div>
          )}
        </div>

        {isTraining && (
          <div style={{ marginTop: '16px' }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '100%', animation: 'shimmer 1.5s infinite' }}></div>
            </div>
            <p style={{ marginTop: '8px', fontSize: 'var(--font-size-sm)', color: 'var(--color-accent-blue)' }}>
              🔄 Training in progress... Models are being trained locally at each hospital and aggregated centrally.
            </p>
          </div>
        )}
      </div>

      {/* Result banner */}
      {result && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)', background: 'rgba(0, 230, 118, 0.06)', borderColor: 'rgba(0, 230, 118, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '2.5rem' }}>🎉</span>
            <div>
              <h3 style={{ color: 'var(--color-accent-green)', marginBottom: '4px' }}>Training Complete!</h3>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
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
            <div className="section-header"><h3>📈 Global Model Performance</h3></div>
            <div className="chart-container">
              <Line data={accuracyChart} options={chartOpts} />
            </div>
          </div>
          <div className="card">
            <div className="section-header"><h3>🏥 Per-Hospital Accuracy</h3></div>
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
            <h3>📋 Training Logs</h3>
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
    </div>
  )
}
