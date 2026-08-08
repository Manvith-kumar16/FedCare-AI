import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getDatasets, uploadDataset, clearDatasets, getDatasetPreview, getServers } from '../api'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineDatabase, HiOutlineTrash, HiOutlineUpload, 
  HiOutlineEye, HiOutlineRefresh, HiOutlineCheckCircle,
  HiOutlineExclamationCircle
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
    return <div className="loader"><div className="spinner"></div></div>
  }

  return (
    <div className="datasets-page fade-in">
      <div className="page-header">
        <div>
          <h2>Dataset Management</h2>
          <p>Custody control of patient datasets. Data resides strictly inside this node's isolated storage.</p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={loadData}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <HiOutlineRefresh /> Refresh
        </button>
      </div>

      {/* Upload Zone */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3>Upload Patient Dataset</h3>
        <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '20px' }}>
          Select a Disease Server network below to import patient metrics for training. Only CSV and TXT formats are supported.
        </p>

        {servers.length === 0 ? (
          <div className="alert alert-warning" style={{ margin: 0 }}>
            <HiOutlineExclamationCircle size={20} />
            <span>You have not joined any Disease Servers yet. Please <Link to="/servers" style={{ color: '#38bdf8', textDecoration: 'underline' }}>join a server</Link> to associate dataset records.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="input-group" style={{ margin: 0, minWidth: '280px' }}>
              <label>Target Disease Network</label>
              <select 
                value={selectedServerId} 
                onChange={(e) => setSelectedServerId(e.target.value)}
                style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
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
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }}
            >
              {uploading ? (
                <span className="spinner-small"></span>
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

      {/* Custody Datasets List */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3>Custody Datasets List</h3>
        <div className="table-responsive" style={{ marginTop: '16px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Dataset Name</th>
                <th>Disease Server</th>
                <th>Records Count</th>
                <th>Features Count</th>
                <th>File Size</th>
                <th>Target Class</th>
                <th>Local Path</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center">No local datasets under custody.</td>
                </tr>
              ) : (
                datasets.map(ds => {
                  const srv = servers.find(s => s.id === ds.server_id)
                  
                  return (
                    <tr key={ds.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                          <HiOutlineDatabase style={{ color: '#38bdf8' }} />
                          {ds.filename}
                        </div>
                      </td>
                      <td>{srv ? srv.name : `Server #${ds.server_id}`}</td>
                      <td>{ds.row_count} patients</td>
                      <td>{ds.feature_count} features</td>
                      <td>{ds.file_size_kb} KB</td>
                      <td>
                        <span className="badge badge-info">{ds.target_column}</span>
                      </td>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', opacity: 0.6 }}>
                        {ds.file_path}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn-small btn-secondary" 
                            onClick={() => handlePreviewDataset(ds.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <HiOutlineEye /> Preview
                          </button>
                          <Link 
                            to="/datasets/validation" 
                            state={{ datasetId: ds.id }}
                            className="btn-small btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <HiOutlineCheckCircle /> Validate
                          </Link>
                          <button 
                            className="btn-small btn-danger" 
                            onClick={() => handleClearDatasets(ds.server_id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <HiOutlineTrash /> Clear
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dataset Preview Section */}
      {preview && (
        <div className="glass-panel fade-in" style={{ padding: '24px', marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Local Dataset Preview (First 10 Rows)</h3>
            <button className="btn-small btn-secondary" onClick={() => { setPreview(null); setPreviewDatasetId(null); }}>Close Preview</button>
          </div>
          <div className="table-responsive">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  {preview.columns.map((col, idx) => (
                    <th key={idx}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {preview.columns.map((col, cIdx) => (
                      <td key={cIdx}>{row[col] !== undefined ? String(row[col]) : ''}</td>
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
