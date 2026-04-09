import React, { useState, useEffect } from 'react';
import hospitalService, { HospitalDataset } from '../../services/hospitalService';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import Loader from '../../components/ui/Loader';
import { Database, Upload, FileText, CheckCircle, Clock } from 'lucide-react';
import { Button, Modal, Form, ProgressBar, Badge, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';

const Datasets: React.FC = () => {
  const [datasets, setDatasets] = useState<HospitalDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    setLoading(true);
    const data = await hospitalService.getDatasets();
    setDatasets(data);
    setLoading(false);
  };

  const [newDataset, setNewDataset] = useState({
    name: '',
    type: 'IMAGE' as 'IMAGE' | 'TABULAR' | 'AUDIO',
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDataset.name) return;

    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      const result = await hospitalService.uploadDataset(newDataset, (p) => {
        setUploadProgress(p);
      });
      
      setDatasets(prev => [result, ...prev]);
      toast.success('Dataset uploaded and processed successfully!');
      setShowUpload(false);
      setNewDataset({ name: '', type: 'IMAGE' });
    } catch (err) {
      toast.error('Upload failed.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const columns = [
    { 
      header: 'Dataset Name', 
      accessor: 'name',
      render: (row: HospitalDataset) => (
        <div className="d-flex align-items-center">
          <div className="p-2 bg-info bg-opacity-10 rounded-circle me-3">
            <Database size={16} className="text-info" />
          </div>
          <span className="fw-bold">{row.name}</span>
        </div>
      )
    },
    { header: 'Type', accessor: 'type' },
    { 
      header: 'Size / Count', 
      accessor: 'size',
      render: (row: HospitalDataset) => (
        <div className="small">
          <span className="text-dark fw-medium">{row.size}</span>
          <span className="text-muted ms-2">({row.count} items)</span>
        </div>
      )
    },
    { header: 'Uploaded', accessor: 'uploadedAt' },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (row: HospitalDataset) => (
        <Badge bg={row.status === 'PROCESSED' ? 'success' : row.status === 'PROCESSING' ? 'warning' : 'danger'} className="rounded-pill">
          {row.status === 'PROCESSED' && <CheckCircle size={10} className="me-1" />}
          {row.status === 'PROCESSING' && <Clock size={10} className="me-1" />}
          {row.status}
        </Badge>
      )
    }
  ];

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h2 className="fw-bold mb-1">Local Datasets</h2>
          <p className="text-muted small">Manage your private data silos for secure federated training.</p>
        </div>
        <Button variant="primary" onClick={() => setShowUpload(true)} className="shadow-sm d-flex align-items-center">
          <Upload size={18} className="me-2" /> Upload New Dataset
        </Button>
      </div>

      <Row className="g-4 mb-5">
        <Col md={4}>
          <Card className="text-center p-4">
            <div className="display-4 fw-bold text-primary mb-2">2.4</div>
            <div className="text-muted extra-small uppercase-spacing fw-bold">Total Storage (GB)</div>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center p-4">
            <div className="display-4 fw-bold text-success mb-2">6.2k</div>
            <div className="text-muted extra-small uppercase-spacing fw-bold">Total Records</div>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center p-4">
            <div className="display-4 fw-bold text-info mb-2">3</div>
            <div className="text-muted extra-small uppercase-spacing fw-bold">Active Silos</div>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <DataTable columns={columns} data={datasets} loading={loading} />
      </Card>

      {/* Upload Modal */}
      <Modal show={showUpload} onHide={() => !isUploading && setShowUpload(false)} centered border-0>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">Upload Local Dataset</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpload}>
          <Modal.Body className="p-4">
            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold">Dataset Display Name</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="e.g. Hospital_MRI_Batch_1" 
                value={newDataset.name}
                onChange={(e) => setNewDataset({...newDataset, name: e.target.value})}
                required
                disabled={isUploading}
              />
            </Form.Group>
            
            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold">Data Modality</Form.Label>
              <Form.Select 
                value={newDataset.type}
                onChange={(e) => setNewDataset({...newDataset, type: e.target.value as any})}
                disabled={isUploading}
              >
                <option value="IMAGE">Medical Images (X-Ray, MRI, etc.)</option>
                <option value="TABULAR">Tabular Records (CSV / DB)</option>
                <option value="AUDIO">Audio Samples (WAV / MP3)</option>
              </Form.Select>
            </Form.Group>

            <div className="upload-zone p-5 border-dashed rounded-3 text-center bg-light transition-all">
              <Upload size={48} className="text-muted mb-3 opacity-50" />
              <p className="text-muted small mb-0">Select local files or directory from your node</p>
              <input type="file" className="opacity-0 position-absolute" style={{ width: 1, height: 1 }} disabled={isUploading} />
              <Button variant="outline-dark" size="sm" className="mt-3 px-4 font-bold border-0 bg-dark bg-opacity-10 text-dark" onClick={() => toast.info('Browser file picker would open here.')}>
                Browse Files
              </Button>
            </div>

            {isUploading && (
              <div className="mt-4">
                <div className="d-flex justify-content-between mb-2">
                  <span className="extra-small fw-bold uppercase-spacing text-primary">Uploading & Processing...</span>
                  <span className="extra-small fw-bold">{uploadProgress}%</span>
                </div>
                <ProgressBar now={uploadProgress} striped animated className="rounded-pill" style={{ height: '8px' }} />
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0 p-4">
            <Button variant="light" className="px-4 fw-bold" onClick={() => setShowUpload(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="px-5 fw-bold shadow-sm" disabled={isUploading}>
              {isUploading ? 'Processing...' : 'Start Secure Upload'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <style>{`
        .border-dashed {
          border: 2px dashed #cbd5e1 !important;
        }
        .upload-zone:hover {
          border-color: var(--primary-color) !important;
          background-color: var(--primary-soft) !important;
        }
      `}</style>
    </div>
  );
};

export default Datasets;
