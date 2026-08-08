import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getServers, createServer, deleteServer } from '../api'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineServer, HiOutlinePlus, HiOutlineTrash, 
  HiOutlineRefresh, HiOutlineChevronRight, HiOutlineShieldCheck
} from 'react-icons/hi'

export default function Servers() {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    disease_type: '',
    description: '',
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
      // Form payload mapping
      await createServer({
        name: form.name,
        disease_type: form.disease_type,
        description: form.description,
        input_type: 'tabular',
        model_type: form.model_type,
        fl_algorithm: form.fl_algorithm,
        num_rounds: parseInt(form.num_rounds),
        target_column: form.target_column
      })

      addToast('Federated disease server created successfully!', 'success')
      setShowForm(false)
      setForm({
        name: '',
        disease_type: '',
        description: '',
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
    return <div className="loader"><div className="spinner"></div></div>
  }

  return (
    <div className="servers-admin-page fade-in">
      <div className="page-header">
        <div>
          <h2>Federated Prediction Networks</h2>
          <p>Configure model targets, mathematical aggregation algorithms, and manage active training networks.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={loadServers}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <HiOutlineRefresh /> Refresh
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowForm(!showForm)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <HiOutlinePlus /> {showForm ? 'Cancel Pipeline' : 'Create Server Pipeline'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="glass-panel fade-in" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3>Configure New Federated Prediction Pipeline</h3>
          <form onSubmit={handleCreate} style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group">
              <label>Pipeline Display Name</label>
              <input 
                type="text" 
                placeholder="e.g. Global Diabetes Predictor"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
                required 
              />
            </div>

            <div className="input-group">
              <label>Target Disease / System</label>
              <input 
                type="text" 
                placeholder="e.g. Diabetes Risk"
                value={form.disease_type}
                onChange={(e) => setForm(prev => ({ ...prev, disease_type: e.target.value }))}
                style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
                required 
              />
            </div>

            <div className="input-group" style={{ gridColumn: 'span 2' }}>
              <label>Description</label>
              <textarea 
                placeholder="Brief summary of targets and requirements..."
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', minHeight: '80px', resize: 'vertical' }}
                required 
              />
            </div>

            <div className="input-group">
              <label>Model Architecture</label>
              <select 
                value={form.model_type}
                onChange={(e) => {
                  const val = e.target.value
                  setForm(prev => ({ 
                    ...prev, 
                    model_type: val,
                    // Auto select best algorithm matching model type
                    fl_algorithm: val === 'logistic_regression' ? 'FedAvg' : 'FedAvg'
                  }))
                }}
                style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
              >
                <option value="xgboost">XGBoost Ensemble (Voting Ensemble)</option>
                <option value="logistic_regression">Logistic Regression (True Parameter FedAvg)</option>
              </select>
            </div>

            <div className="input-group">
              <label>Aggregation Algorithm</label>
              <select 
                value={form.fl_algorithm}
                onChange={(e) => setForm(prev => ({ ...prev, fl_algorithm: e.target.value }))}
                style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
              >
                <option value="FedAvg">FedAvg (Weighted Parameter Averaging)</option>
              </select>
            </div>

            <div className="input-group">
              <label>Coordinate Rounds Limit</label>
              <input 
                type="number" 
                min="1" 
                max="50"
                value={form.num_rounds}
                onChange={(e) => setForm(prev => ({ ...prev, num_rounds: e.target.value }))}
                style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
                required 
              />
            </div>

            <div className="input-group">
              <label>Dataset Target Class Label Column</label>
              <input 
                type="text" 
                placeholder="Outcome"
                value={form.target_column}
                onChange={(e) => setForm(prev => ({ ...prev, target_column: e.target.value }))}
                style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
                required 
              />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={creating}
                style={{ padding: '12px 24px' }}
              >
                {creating ? <span className="spinner-small"></span> : 'Provision Pipeline Server'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Servers List */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3>Federated Servers List</h3>
        <div className="table-responsive" style={{ marginTop: '16px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Server Pipeline Name</th>
                <th>Model Architecture</th>
                <th>Target Column</th>
                <th>Registered Nodes</th>
                <th>Current Round</th>
                <th>Accuracy</th>
                <th>Pipeline Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {servers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center">No Coordinating servers provisioned.</td>
                </tr>
              ) : (
                servers.map(srv => (
                  <tr key={srv.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                        <HiOutlineServer style={{ color: '#667eea' }} />
                        {srv.name}
                      </div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{srv.description}</span>
                    </td>
                    <td>
                      <span className="badge badge-info">{srv.model_type?.toUpperCase()}</span>
                      <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '2px' }}>Alg: {srv.fl_algorithm}</div>
                    </td>
                    <td><span className="badge badge-secondary">{srv.target_column}</span></td>
                    <td>{srv.member_count} active hospitals</td>
                    <td>Round {srv.current_round} / {srv.num_rounds}</td>
                    <td style={{ fontWeight: 700, color: '#34d399' }}>
                      {srv.global_accuracy > 0 ? (srv.global_accuracy * 100).toFixed(1) + '%' : 'N/A'}
                    </td>
                    <td>
                      <span className={`badge ${srv.status === 'TRAINING' ? 'badge-error' : 'badge-active'}`}>
                        {srv.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link to={`/servers/${srv.id}`} className="btn-small btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          Manage <HiOutlineChevronRight />
                        </Link>
                        <button 
                          className="btn-small btn-danger" 
                          onClick={() => handleDelete(srv.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '2px' }}
                        >
                          <HiOutlineTrash /> Delete
                        </button>
                      </div>
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
