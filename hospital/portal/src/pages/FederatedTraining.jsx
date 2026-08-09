import { useState, useEffect } from 'react'
import { getServers, getDatasets, triggerSync, getTrainingHistory } from '../api'
import Loader from '../components/Loader'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineGlobe, HiOutlineRefresh, HiOutlineDatabase, 
  HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineClock,
  HiOutlineBadgeCheck
} from 'react-icons/hi'

export default function FederatedTraining() {
  const [servers, setServers] = useState([])
  const [datasets, setDatasets] = useState([])
  const [history, setHistory] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const { addToast } = useApp()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [serversRes, datasetsRes, historyRes] = await Promise.all([
        getServers().catch(() => ({ data: [] })),
        getDatasets().catch(() => ({ data: [] })),
        getTrainingHistory().catch(() => ({ data: [] }))
      ])

      const approvedServers = (serversRes.data || []).filter(
        s => s.is_member || s.member_status === 'APPROVED'
      )
      setServers(approvedServers)
      setDatasets(datasetsRes.data || [])
      
      // Filter federated runs (round_number > 0)
      const fedHist = (historyRes.data || []).filter(h => h.round_number > 0)
      setHistory(fedHist)
    } catch (e) {
      addToast('Failed to load federated training data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncNode = async () => {
    setSyncing(true)
    setSyncResult(null)
    addToast('Contacting central coordinator and polling active rounds...', 'info')
    
    try {
      const res = await triggerSync()
      setSyncResult(res.data)
      
      if (res.data.status === 'idle') {
        addToast('No active training rounds require submission.', 'info')
      } else if (res.data.status === 'success' || res.data.status === 'synced') {
        addToast('Federated sync & model update submission successful!', 'success')
      } else {
        addToast(res.data.message || 'Synchronization check complete.', 'success')
      }

      // Reload history and datasets
      const historyRes = await getTrainingHistory()
      const fedHist = (historyRes.data || []).filter(h => h.round_number > 0)
      setHistory(fedHist)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Synchronization execution failed'
      addToast(msg, 'error')
      setSyncResult({
        status: 'error',
        message: msg
      })
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return <Loader message="Connecting to federated coordination..." />
  }

  return (
    <div className="federated-training-page fade-in">
      <div className="page-header">
        <div>
          <h2>Federated Learning Coordination</h2>
          <p>Sync node with central coordinator, download global seed models, train, and submit privacy-preserving parameters.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Left Column: Sync Controls & Real-time Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3>Node Synchronization Control</h3>
            <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '8px', marginBottom: '20px' }}>
              Manually trigger synchronization. The local node will contact the coordinator, query active rounds for joined disease servers, download weight seeds, train local parameters locally, and upload weight updates.
            </p>

            <button 
              className="btn btn-primary" 
              onClick={handleSyncNode}
              disabled={syncing || servers.length === 0}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '1rem' }}
            >
              {syncing ? (
                <>
                  <span className="spinner-small"></span> Syncing Node...
                </>
              ) : (
                <>
                  <HiOutlineGlobe size={20} />
                  Synchronize Node Now
                </>
              )}
            </button>
          </div>

          {/* Sync Result Box */}
          {syncResult && (
            <div className={`glass-panel fade-in ${syncResult.status === 'error' ? 'alert-bar alert-warning' : 'alert-bar alert-success'}`} style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {syncResult.status === 'error' ? (
                  <HiOutlineExclamationCircle size={24} style={{ color: '#f87171', marginTop: '2px' }} />
                ) : (
                  <HiOutlineCheckCircle size={24} style={{ color: '#34d399', marginTop: '2px' }} />
                )}
                <div>
                  <h4 style={{ fontWeight: 700 }}>
                    {syncResult.status === 'error' ? 'Sync Failed' : 'Sync Completed'}
                  </h4>
                  <p style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '4px' }}>
                    {syncResult.message || 'The synchronization completed successfully.'}
                  </p>
                  {syncResult.participated_rounds && syncResult.participated_rounds.length > 0 && (
                    <div style={{ marginTop: '12px', fontSize: '0.85rem' }}>
                      <strong>Participated in Rounds:</strong>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        {syncResult.participated_rounds.map((r, i) => (
                          <span key={i} className="badge badge-success">Round {r}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Joined servers status */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3>Registered Disease Servers Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              {servers.length === 0 ? (
                <div className="empty-state">No joined disease servers registered.</div>
              ) : (
                servers.map(srv => {
                  const hasDs = datasets.some(d => d.server_id === srv.id)
                  return (
                    <div key={srv.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <div>
                        <strong>{srv.name}</strong>
                        <div style={{ opacity: 0.6, fontSize: '0.75rem', marginTop: '2px' }}>
                          Model: {srv.model_type?.toUpperCase()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div>
                          {hasDs ? (
                            <span className="badge badge-success">Data Ready</span>
                          ) : (
                            <span className="badge badge-warning">Needs Data</span>
                          )}
                        </div>
                        <div>
                          {srv.status === 'TRAINING' ? (
                            <span className="badge badge-success">Round {srv.current_round} (Active)</span>
                          ) : (
                            <span className="badge badge-secondary">Idle (Round {srv.current_round})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Federated Round History */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '540px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HiOutlineClock size={20} style={{ color: '#38bdf8' }} /> Federated Submission Log
          </h3>
          <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '4px', marginBottom: '16px' }}>
            History of local dataset updates trained and submitted to central coordinator rounds.
          </p>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.length === 0 ? (
              <div className="empty-state">No federated round updates submitted from this node yet.</div>
            ) : (
              history.map(hist => {
                const srv = servers.find(s => s.id === hist.server_id)
                return (
                  <div key={hist.id} className="history-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <HiOutlineBadgeCheck style={{ color: '#34d399' }} />
                        {srv ? srv.name : `Server #${hist.server_id}`}
                      </span>
                      <span className="badge badge-success">Round {hist.round_number}</span>
                    </div>
                    
                    <p style={{ fontSize: '0.8rem', opacity: 0.8, margin: '8px 0', borderLeft: '2px solid #38bdf8', paddingLeft: '8px' }}>
                      {hist.details}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '0.75rem', textAlign: 'center', marginTop: '8px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '4px' }}>
                        <div style={{ opacity: 0.6 }}>Local Accuracy</div>
                        <strong>{(hist.local_accuracy * 100).toFixed(1)}%</strong>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '4px' }}>
                        <div style={{ opacity: 0.6 }}>Local Loss</div>
                        <strong>{hist.local_loss.toFixed(4)}</strong>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '4px' }}>
                        <div style={{ opacity: 0.6 }}>Samples Trained</div>
                        <strong>{hist.samples_trained}</strong>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
