import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getDatasets, uploadDataset, clearDatasets, getDatasetPreview, getServers } from '../api'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineDatabase, HiOutlineTrash, HiOutlineUpload, 
  HiOutlineEye, HiOutlineRefresh, HiOutlineCheckCircle,
  HiOutlineExclamationCircle, HiOutlineDocumentText
} from 'react-icons/hi'

export default function Datasets() {
  const [servers, setServers] = useState([])
  const [datasets, setDatasets] = useState([])
  const [selectedServerId, setSelectedServerId] = useState('')
  const [preview, setPreview] = useState(null)
  const [previewDatasetId, setPreviewDatasetId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const { addToast } = useApp()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [serversRes, datasetsRes] = await Promise.all([
        getServers().catch(() => ({ data: [] })),
        getDatasets().catch(() => ({ data: [] }))
      ])

      const approvedServers = (serversRes.data || []).filter(
        s => s.is_member || s.member_status === 'APPROVED'
      )
      setServers(approvedServers)
      setDatasets(datasetsRes.data || [])

      if (approvedServers.length > 0) {
        setSelectedServerId(approvedServers[0].id)
      }
    } catch (e) {
      console.error(e)
      addToast('Failed to load dataset management data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!selectedServerId) {
      addToast('Please select a disease server first', 'warning')
      return
    }

    setUploading(true)
    try {
      await uploadDataset(selectedServerId, file)
      addToast('Dataset uploaded locally successfully!', 'success')
      // Refresh
      const datasetsRes = await getDatasets()
      setDatasets(datasetsRes.data || [])
      setPreview(null)
      setPreviewDatasetId(null)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to upload dataset'
      addToast(msg, 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleClearDatasets = async (serverId) => {
    if (!window.confirm('Are you sure you want to delete all local dataset files for this server? This action is irreversible.')) {
      return
    }

    try {
      await clearDatasets(serverId)
      addToast('Local datasets cleared successfully', 'success')
      // Refresh
      const datasetsRes = await getDatasets()
      setDatasets(datasetsRes.data || [])
      setPreview(null)
      setPreviewDatasetId(null)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to clear datasets'
      addToast(msg, 'error')
    }
  }

  const handlePreviewDataset = async (datasetId) => {
    try {
      if (previewDatasetId === datasetId) {
        // Toggle close
        setPreview(null)
        setPreviewDatasetId(null)
        return
      }

      const res = await getDatasetPreview(datasetId, 10)
      setPreview(res.data)
      setPreviewDatasetId(datasetId)
    } catch (err) {
      addToast('Failed to load dataset preview', 'error')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
        <div style={{ height: '100px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ height: '200px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
      </div>
    )
  }

  return (
    <div className="datasets-page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Dataset Management
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Custody control of patient datasets. Data resides strictly inside this node's isolated storage.
          </p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={loadData}
        >
          <HiOutlineRefresh size={18} /> Refresh
        </button>
      </div>

      {/* Upload Zone */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>Import Patient Dataset</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Select a Disease Server network below to import patient metrics for training. Only CSV and TXT formats are supported.
        </p>

        {servers.length === 0 ? (
          <div style={{ padding: '16px', background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: '8px', color: '#C2410C', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <HiOutlineExclamationCircle size={24} />
            <span>You have not joined any Disease Servers yet. Please <Link to="/servers" style={{ color: '#EA580C', fontWeight: 600, textDecoration: 'underline' }}>join a server</Link> to associate dataset records.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0, minWidth: '320px' }}>
              <label className="form-label">Target Disease Network</label>
              <select 
                className="form-select"
                value={selectedServerId} 
                onChange={(e) => setSelectedServerId(e.target.value)}
                style={{ marginBottom: 0 }}
              >
                {servers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.disease_type})</option>
                ))}
              </select>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              style={{ display: 'none' }}
              accept=".csv,.txt"
            />

            <button 
              className="btn btn-primary" 
              onClick={handleUploadClick} 
              disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 24px' }}
            >
              {uploading ? (
                'Processing...'
              ) : (
                <>
                  <HiOutlineUpload size={18} />
                  Select & Upload Dataset
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Custody Datasets Grid */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '24px' }}>Local Datasets Under Custody</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
          {datasets.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', background: '#FAFAFD', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
              <div style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                <HiOutlineDatabase size={48} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>No local datasets under custody.</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Import a dataset using the controls above.</p>
            </div>
          ) : (
            datasets.map(ds => {
              const srv = servers.find(s => s.id === ds.server_id)
              
              return (
                <div key={ds.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-bg-secondary)', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <HiOutlineDocumentText size={20} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '2px' }}>{ds.filename}</h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                          {srv ? srv.name : `Server #${ds.server_id}`}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', padding: '16px', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Records Count</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{ds.row_count} patients</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Features</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{ds.feature_count} features</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>File Size</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{ds.file_size_kb} KB</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Target Class</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-accent-blue)' }}>{ds.target_column}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginBottom: '24px', padding: '8px', background: 'rgba(0,0,0,0.02)', borderRadius: '4px' }}>
                    {ds.file_path}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => handlePreviewDataset(ds.id)}
                      style={{ flex: 1 }}
                    >
                      <HiOutlineEye size={16} /> Preview
                    </button>
                    <Link 
                      to="/datasets/validation" 
                      state={{ datasetId: ds.id }}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, display: 'flex', justifyContent: 'center' }}
                    >
                      <HiOutlineCheckCircle size={16} /> Validate
                    </Link>
                    <button 
                      className="btn btn-danger btn-sm" 
                      onClick={() => handleClearDatasets(ds.server_id)}
                      title="Clear Dataset"
                    >
                      <HiOutlineTrash size={16} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Dataset Preview Section */}
      {preview && (
        <div className="card fade-in" style={{ marginTop: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Local Dataset Preview (First 10 Rows)</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => { setPreview(null); setPreviewDatasetId(null); }}>Close Preview</button>
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
            <table className="data-table" style={{ margin: 0 }}>
              <thead style={{ background: 'var(--color-bg-secondary)' }}>
                <tr>
                  {preview.columns.map((col, idx) => (
                    <th key={idx} style={{ fontSize: '0.75rem', padding: '12px 16px' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {preview.columns.map((col, cIdx) => (
                      <td key={cIdx} style={{ fontSize: '0.8rem', padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                        {row[col] !== undefined ? String(row[col]) : ''}
                      </td>
                    ))}
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
