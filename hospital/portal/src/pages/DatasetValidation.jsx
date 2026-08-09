import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getDatasets, validateDataset } from '../api'
import Loader from '../components/Loader'
import { useApp } from '../contexts/AppContext'
import { 
  HiOutlineCheckCircle, HiOutlineExclamationCircle, 
  HiOutlineRefresh, HiOutlineDatabase, HiOutlineChartPie 
} from 'react-icons/hi'

export default function DatasetValidation() {
  const [datasets, setDatasets] = useState([])
  const [selectedDatasetId, setSelectedDatasetId] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const location = useLocation()
  const { addToast } = useApp()

  useEffect(() => {
    loadDatasets()
  }, [])

  // Handle redirect from datasets list with pre-selected state
  useEffect(() => {
    if (datasets.length > 0) {
      const stateId = location.state?.datasetId
      if (stateId && datasets.some(d => d.id === stateId)) {
        setSelectedDatasetId(stateId)
        runValidation(stateId)
      } else {
        setSelectedDatasetId(datasets[0].id)
        runValidation(datasets[0].id)
      }
    }
  }, [datasets, location])

  async function loadDatasets() {
    try {
      setLoading(true)
      const res = await getDatasets()
      setDatasets(res.data || [])
    } catch (e) {
      addToast('Failed to load local datasets list', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function runValidation(id) {
    if (!id) return
    setValidating(true)
    try {
      const res = await validateDataset(id)
      setReport(res.data)
      addToast('Local dataset validation completed!', 'success')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Validation execution failed'
      addToast(msg, 'error')
      setReport(null)
    } finally {
      setValidating(false)
    }
  }

  const handleSelectChange = (e) => {
    const val = e.target.value
    setSelectedDatasetId(val)
    runValidation(val)
  }

  if (loading) {
    return <Loader message="Analyzing dataset structure..." />
  }

  return (
    <div className="validation-page fade-in">
      <div className="page-header">
        <div>
          <h2>Dataset Deep Validation</h2>
          <p>Examine class balance, feature shapes, duplicates, and missing values prior to local or federated training.</p>
        </div>
      </div>

      {/* Dataset Selection */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="input-group" style={{ margin: 0, minWidth: '320px' }}>
            <label>Select Custody Dataset</label>
            <select 
              value={selectedDatasetId} 
              onChange={handleSelectChange}
              style={{ padding: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px' }}
            >
              {datasets.length === 0 ? (
                <option value="">No custody datasets available</option>
              ) : (
                datasets.map(ds => (
                  <option key={ds.id} value={ds.id}>{ds.filename} ({ds.row_count} rows)</option>
                ))
              )}
            </select>
          </div>

          <button 
            className="btn btn-primary" 
            onClick={() => runValidation(selectedDatasetId)} 
            disabled={validating || !selectedDatasetId}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }}
          >
            {validating ? (
              <span className="spinner-small"></span>
            ) : (
              <>
                <HiOutlineRefresh size={18} />
                Run Validation Check
              </>
            )}
          </button>
        </div>
      </div>

      {/* Validation Report View */}
      {validating && (
        <Loader message="Running validation checks..." />
      )}

      {!validating && report && (
        <div className="report-container fade-in">
          {/* Main Status Panel */}
          <div className={`glass-panel alert-bar ${report.status === 'valid' ? 'alert-success' : 'alert-warning'}`} style={{ padding: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            {report.status === 'valid' ? (
              <HiOutlineCheckCircle size={36} style={{ color: '#34d399' }} />
            ) : (
              <HiOutlineExclamationCircle size={36} style={{ color: '#fbbf24' }} />
            )}
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                {report.status === 'valid' ? 'Dataset Preprocessing: Valid' : 'Dataset Preprocessing: Warning'}
              </h3>
              <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>
                {report.status === 'valid' 
                  ? 'All checks passed! The dataset structure is fully aligned and ready for local training.' 
                  : 'Warnings detected: Missing values require automated imputation during training.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
            {/* Left Column: Metadata & Metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <HiOutlineDatabase style={{ color: '#38bdf8' }} /> Metadata Profile
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.7 }}>File Name</span>
                    <strong>{report.filename}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.7 }}>Total Rows</span>
                    <strong>{report.row_count} records</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.7 }}>Total Features</span>
                    <strong>{report.feature_count} columns</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.7 }}>Duplicate Records</span>
                    <strong style={{ color: report.duplicates > 0 ? '#f87171' : '#34d399' }}>
                      {report.duplicates} duplicate(s)
                    </strong>
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <HiOutlineChartPie style={{ color: '#818cf8' }} /> Class Distribution
                </h4>
                {Object.keys(report.class_distribution || {}).length === 0 ? (
                  <p style={{ opacity: 0.6 }}>No class target columns identified in validation.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.entries(report.class_distribution).map(([lbl, val]) => {
                      const pct = ((val / report.row_count) * 100).toFixed(1)
                      return (
                        <div key={lbl} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span>Label Class "{lbl}"</span>
                            <strong>{val} samples ({pct}%)</strong>
                          </div>
                          <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: lbl === '1' ? '#38bdf8' : '#818cf8', width: `${pct}%` }}></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Missing Values & Data Types */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h4 style={{ marginBottom: '16px' }}>Missing Values & Data Types Per Column</h4>
              <div className="table-responsive">
                <table className="data-table text-xs">
                  <thead>
                    <tr>
                      <th>Column / Feature</th>
                      <th>Data Type</th>
                      <th>Null Count</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.data_types || {}).map(([col, typ]) => {
                      const missingCount = report.missing_values?.by_column?.[col] || 0
                      return (
                        <tr key={col}>
                          <td style={{ fontWeight: 600 }}>{col}</td>
                          <td><span className="badge badge-secondary">{typ}</span></td>
                          <td>{missingCount}</td>
                          <td>
                            {missingCount > 0 ? (
                              <span style={{ color: '#fb3', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <HiOutlineExclamationCircle /> Missing
                              </span>
                            ) : (
                              <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <HiOutlineCheckCircle /> Intact
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {!validating && !report && datasets.length > 0 && (
        <div className="glass-panel text-center" style={{ padding: '48px' }}>
          <p>Please select a dataset and run validation to review its profile report.</p>
        </div>
      )}

      {datasets.length === 0 && (
        <div className="glass-panel text-center" style={{ padding: '48px' }}>
          <p>No custody datasets available on this node. Please upload a dataset in the Dataset Management page first.</p>
        </div>
      )}
    </div>
  )
}
