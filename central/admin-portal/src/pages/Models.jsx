import { useState, useEffect } from 'react'
import { getGlobalModels, getServers } from '../api'
import Loader from '../components/Loader'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineGlobe, HiOutlineRefresh, HiOutlineShieldCheck, 
  HiOutlineCheckCircle, HiOutlineClock, HiOutlineDocumentText 
} from 'react-icons/hi'

export default function Models() {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useApp()

  useEffect(() => {
    loadModels()
  }, [])

  async function loadModels() {
    try {
      setLoading(true)
      const res = await getGlobalModels()
      setModels(res.data || [])
    } catch (e) {
      addToast('Failed to load global models registry', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loader message="Loading global models..." />
  }

  return (
    <div className="models-page fade-in">
      <div className="page-header">
        <div>
          <h2>Global Models Versioning Registry</h2>
          <p>Audit version history, validation parameter metrics, and cryptographically verify model weights integrity hashes.</p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={loadModels}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <HiOutlineRefresh /> Refresh
        </button>
      </div>

      {/* Global Models Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3>Compiled Global Models Index ({models.length} active models)</h3>
        <div className="table-responsive" style={{ marginTop: '16px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Model Version</th>
                <th>Disease Server Pipeline</th>
                <th>Round ID</th>
                <th>Architecture Shape</th>
                <th>Validation Metrics</th>
                <th>Cryptographic SHA-256 Hash</th>
                <th>Aggregation Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {models.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center">No global model versions aggregated yet. Run training rounds first.</td>
                </tr>
              ) : (
                models.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                        <HiOutlineGlobe style={{ color: '#00d2ff' }} />
                        {m.version}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{m.server_name}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{m.disease_type}</div>
                    </td>
                    <td>
                      <span className="badge badge-success">Round {m.round_number}</span>
                    </td>
                    <td>
                      <span className="badge badge-info">{m.model_type?.toUpperCase()}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        <div>Acc: <strong>{(m.metrics_json?.accuracy * 100).toFixed(1)}%</strong></div>
                        <div>F1: <strong>{(m.metrics_json?.f1 * 100).toFixed(1)}%</strong></div>
                        <div style={{ opacity: 0.6, fontSize: '0.75rem' }}>Loss: {m.metrics_json?.loss?.toFixed(4)}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        <HiOutlineShieldCheck style={{ color: '#34d399' }} size={14} />
                        <span title={m.model_hash}>{m.model_hash ? `${m.model_hash.substring(0, 16)}...` : 'N/A'}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.5, wordBreak: 'break-all', maxWidth: '180px', marginTop: '2px' }}>
                        Path: {m.model_path}
                      </div>
                    </td>
                    <td style={{ opacity: 0.7 }}>
                      {m.created_at ? new Date(m.created_at).toLocaleString() : '-'}
                    </td>
                    <td>
                      {m.is_active ? (
                        <span className="badge badge-active">Active</span>
                      ) : (
                        <span className="badge badge-secondary">Archived</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
