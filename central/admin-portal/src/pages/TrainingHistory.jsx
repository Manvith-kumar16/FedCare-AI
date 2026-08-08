import { useState, useEffect } from 'react'
import { getServers, getTrainingHistory } from '../api'
import { useApp } from '../contexts/AppContext'
import { HiOutlineClock, HiOutlineRefresh, HiOutlineServer, HiOutlineGlobe, HiOutlineOfficeBuilding } from 'react-icons/hi'

export default function TrainingHistory() {
  const [servers, setServers] = useState([])
  const [selectedServerId, setSelectedServerId] = useState('')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const { addToast } = useApp()

  useEffect(() => {
    loadServers()
  }, [])

  useEffect(() => {
    if (selectedServerId) {
      loadLogs(selectedServerId)
    }
  }, [selectedServerId])

  async function loadServers() {
    try {
      setLoading(true)
      const res = await getServers()
      setServers(res.data || [])
      if (res.data && res.data.length > 0) {
        setSelectedServerId(res.data[0].id)
      }
    } catch (e) {
      addToast('Failed to load servers list', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadLogs(serverId) {
    setLoadingLogs(true)
    try {
      const res = await getTrainingHistory(serverId)
      // Sort logs descending (newest first)
      const sorted = (res.data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setLogs(sorted)
    } catch (e) {
      addToast('Failed to load training timeline logs', 'error')
      setLogs([])
    } finally {
      setLoadingLogs(false)
    }
  }

  if (loading && !selectedServerId) {
    return <div className="loader"><div className="spinner"></div></div>
  }

  return (
    <div className="training-history-page fade-in">
      <div className="page-header">
        <div>
          <h2>System Training History & Audit Trail</h2>
          <p>Trace round timelines, model versions, client nodes submissions, and validation checkpoints.</p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={() => loadLogs(selectedServerId)}
          disabled={!selectedServerId || loadingLogs}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <HiOutlineRefresh /> Refresh
        </button>
      </div>

      {/* Select Server Pipeline */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div className="input-group" style={{ margin: 0, minWidth: '320px' }}>
          <label>Select Coordinate Pipeline</label>
          <select 
            value={selectedServerId} 
            onChange={(e) => setSelectedServerId(e.target.value)}
            style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
          >
            {servers.length === 0 ? (
              <option value="">No Coordinating Servers Available</option>
            ) : (
              servers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.disease_type})</option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* History Timeline */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3>Timeline audit trail</h3>

        {loadingLogs ? (
          <div className="text-center" style={{ padding: '48px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 16px auto' }}></div>
            <p>Loading historical execution trail...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">No execution runs logged for this pipeline server. Start training rounds to track progress.</div>
        ) : (
          <div className="table-responsive" style={{ marginTop: '16px' }}>
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>Origin Node</th>
                  <th>Round</th>
                  <th>Metrics (Local/Global)</th>
                  <th>Patient Samples</th>
                  <th>Orchestration Action Description</th>
                  <th>Audit Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const isGlobal = log.log_type === 'global'
                  return (
                    <tr key={log.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          {isGlobal ? (
                            <>
                              <HiOutlineGlobe style={{ color: '#00d2ff' }} />
                              Central Coordinator
                            </>
                          ) : (
                            <>
                              <HiOutlineOfficeBuilding style={{ color: '#667eea' }} />
                              {log.hospital_name || `Hospital Node #${log.hospital_id}`}
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        {log.round_number === 0 ? (
                          <span className="badge badge-secondary">Local Only</span>
                        ) : (
                          <span className="badge badge-success">Round {log.round_number}</span>
                        )}
                      </td>
                      <td>
                        {isGlobal ? (
                          <div>Global Acc: <strong>{(log.global_accuracy * 100).toFixed(1)}%</strong></div>
                        ) : (
                          <div>
                            Local Acc: <strong>{(log.local_accuracy * 100).toFixed(1)}%</strong>
                            {log.local_f1 > 0 && <span style={{ opacity: 0.6, marginLeft: '4px' }}>(F1: {(log.local_f1 * 100).toFixed(1)}%)</span>}
                          </div>
                        )}
                      </td>
                      <td>{log.samples_trained} patients</td>
                      <td style={{ maxWidth: '300px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                        {log.details}
                      </td>
                      <td style={{ opacity: 0.7 }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
