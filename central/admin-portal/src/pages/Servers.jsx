import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getServers, createServer, deleteServer } from '../api'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineServer, HiOutlinePlus, HiOutlineTrash, 
  HiOutlineRefresh, HiOutlineChevronRight, HiOutlineShieldCheck,
  HiOutlineCog
} from 'react-icons/hi'
import { FaServer } from 'react-icons/fa'

export default function Servers() {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    disease_type: '',
    description: '',
    input_type: 'tabular',
    num_rounds: 5,
    target_column: 'Outcome',
    model_type: 'xgboost',
    fl_algorithm: 'FedAvg'
  })

  const { addToast } = useApp()

  useEffect(() => {
    loadServers()
  }, [])

  async function loadServers() {
    try {
      setLoading(true)
      const res = await getServers()
      setServers(res.data || [])
    } catch (e) {
      addToast('Failed to load disease servers list', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await createServer({
        name: form.name,
        disease_type: form.disease_type,
        description: form.description,
        input_type: form.input_type,
        model_type: form.model_type,
        fl_algorithm: form.fl_algorithm,
        num_rounds: parseInt(form.num_rounds),
        target_column: form.input_type === 'image' ? 'Image Class' : form.target_column
      })

      addToast('Federated disease server created successfully!', 'success')
      setShowForm(false)
      setForm({
        name: '',
        disease_type: '',
        description: '',
        input_type: 'tabular',
        num_rounds: 5,
        target_column: 'Outcome',
        model_type: 'xgboost',
        fl_algorithm: 'FedAvg'
      })
      await loadServers()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Pipeline creation failed', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (serverId) => {
    if (!window.confirm('Are you sure you want to delete this disease server? This will also remove all approved hospital member records associated with it. This action cannot be undone.')) {
      return
    }

    try {
      await deleteServer(serverId)
      addToast('Disease server deleted successfully', 'success')
      await loadServers()
    } catch (err) {
      addToast('Failed to delete disease server', 'error')
    }
  }

  if (loading && !showForm) {
    return (
      <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
        <div style={{ height: '100px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ height: '300px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: '300px', background: '#fff', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="servers-admin-page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Federated Prediction Networks
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Configure model targets, mathematical aggregation algorithms, and manage active training networks.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={loadServers}
          >
            <HiOutlineRefresh size={18} /> Refresh
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowForm(!showForm)}
          >
            <HiOutlinePlus size={18} /> {showForm ? 'Cancel Pipeline' : 'Create Server Pipeline'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card fade-in" style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '24px' }}>Configure New Federated Prediction Pipeline</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Pipeline Display Name</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="e.g. Global Diabetes Predictor"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                required 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Target Disease / System</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="e.g. Diabetes Risk"
                value={form.disease_type}
                onChange={(e) => setForm(prev => ({ ...prev, disease_type: e.target.value }))}
                required 
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
              <label className="form-label">Description</label>
              <textarea 
                className="form-input"
                placeholder="Brief summary of targets and requirements..."
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                style={{ minHeight: '80px', resize: 'vertical' }}
                required 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Data Input Type</label>
              <select 
                className="form-select"
                value={form.input_type}
                onChange={(e) => {
                  const val = e.target.value
                  setForm(prev => ({ 
                    ...prev, 
                    input_type: val,
                    model_type: val === 'image' ? 'cnn' : 'xgboost'
                  }))
                }}
              >
                <option value="tabular">Tabular (CSV/TXT)</option>
                <option value="image">Image Dataset (ZIP)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Model Architecture</label>
              <select 
                className="form-select"
                value={form.model_type}
                onChange={(e) => {
                  const val = e.target.value
                  setForm(prev => ({ 
                    ...prev, 
                    model_type: val,
                    fl_algorithm: val === 'logistic_regression' ? 'FedAvg' : 'FedAvg'
                  }))
                }}
              >
                {form.input_type === 'tabular' ? (
                  <>
                    <option value="xgboost">XGBoost Ensemble (Voting Ensemble)</option>
                    <option value="logistic_regression">Logistic Regression (True Parameter FedAvg)</option>
                  </>
                ) : (
                  <>
                    <option value="cnn">PyTorch Convolutional Neural Net (CNN)</option>
                  </>
                )}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Aggregation Algorithm</label>
              <select 
                className="form-select"
                value={form.fl_algorithm}
                onChange={(e) => setForm(prev => ({ ...prev, fl_algorithm: e.target.value }))}
              >
                <option value="FedAvg">FedAvg (Weighted Parameter Averaging)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Coordinate Rounds Limit</label>
              <input 
                type="number" 
                className="form-input"
                min="1" 
                max="50"
                value={form.num_rounds}
                onChange={(e) => setForm(prev => ({ ...prev, num_rounds: e.target.value }))}
                required 
              />
            </div>

            {form.input_type === 'tabular' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Dataset Target Class Label Column</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="Outcome"
                  value={form.target_column}
                  onChange={(e) => setForm(prev => ({ ...prev, target_column: e.target.value }))}
                  required 
                />
              </div>
            )}

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={creating}
                style={{ padding: '12px 24px' }}
              >
                {creating ? 'Processing...' : 'Provision Pipeline Server'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Servers Card Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
        {servers.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', background: '#FAFAFD', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
            <div style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              <HiOutlineServer size={48} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>No Servers Configured</h3>
            <p style={{ color: 'var(--color-text-muted)' }}>Create a new pipeline to start federated aggregation.</p>
          </div>
        ) : (
          servers.map(srv => (
            <div key={srv.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--color-bg-secondary)', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FaServer size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>{srv.name}</h3>
                    <span className="badge badge-inactive">{srv.disease_type}</span>
                  </div>
                </div>
                <span className={`badge ${srv.status === 'TRAINING' ? 'badge-error' : 'badge-active'}`}>
                  {srv.status === 'TRAINING' ? 'TRAINING' : 'IDLE'}
                </span>
              </div>
              
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5, flex: 1, minHeight: '40px' }}>
                {srv.description}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px', padding: '16px', background: '#FAFAFD', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Architecture</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{srv.model_type?.toUpperCase()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Algorithm</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{srv.fl_algorithm}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Participants</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{srv.member_count} Nodes</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Global Accuracy</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-accent-green)' }}>
                    {srv.global_accuracy > 0 ? (srv.global_accuracy * 100).toFixed(1) + '%' : 'N/A'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                  Round {srv.current_round} of {srv.num_rounds}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn btn-danger btn-sm" 
                    onClick={() => handleDelete(srv.id)}
                    title="Delete Server"
                    style={{ padding: '8px 12px' }}
                  >
                    <HiOutlineTrash size={16} />
                  </button>
                  <Link to={`/servers/${srv.id}`} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                    Manage Pipeline <HiOutlineChevronRight />
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
