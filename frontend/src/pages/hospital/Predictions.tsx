import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import { Search, Upload, Target, Brain, ShieldCheck, Download, Info } from 'lucide-react';
import { Button, Row, Col, Form, Badge, ProgressBar } from 'react-bootstrap';
import { toast } from 'react-toastify';
import HeatmapViewer from '../../components/xai/HeatmapViewer';
import TabularXAI from '../../components/xai/TabularXAI';

const Predictions: React.FC = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handlePredict = () => {
    setAnalyzing(true);
    setResult(null);
    
    // Simulate complex AI pipeline
    setTimeout(() => {
      setAnalyzing(false);
      setResult({
        class: 'Pneumonia (Viral)',
        confidence: 94.8,
        inferenceTime: '240ms',
        riskFactor: 'High',
        // Simulated X-Ray image for demo
        imageSrc: 'https://media.istockphoto.com/id/1141662580/photo/chest-x-ray.jpg?s=612x612&w=0&k=20&c=u3fG6H8l0V8t7W4_5Z3z_Xw_R_1zW6p_v8_1z_r4_0=',
        // Simulated XAI Data
        shapData: [
          { feature: 'Lung Opacity', value: 0.45 },
          { feature: 'Pleural Effusion', value: 0.12 },
          { feature: 'Cardiomegaly', value: -0.05 },
          { feature: 'Infiltration', value: 0.28 },
          { feature: 'Patient Age', value: 0.08 },
        ],
        probabilityData: [
          { diagnosis: 'Pneumonia', probability: 94.8 },
          { diagnosis: 'Tuberculosis', probability: 3.2 },
          { diagnosis: 'Infection', probability: 1.5 },
          { diagnosis: 'Healthy', probability: 0.5 },
        ]
      });
      toast.success('Inference and XAI Pipeline Complete.');
    }, 4000);
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h2 className="fw-bold mb-1 brand-font">Medical Insight Engine</h2>
          <p className="text-muted small">Collaborative inference powered by high-fidelity federated models.</p>
        </div>
        <div className="d-flex gap-2">
          {result && (
            <Button variant="outline-primary" size="sm" className="fw-bold px-3 d-flex align-items-center shadow-sm">
              <Download size={16} className="me-2" /> Export Report
            </Button>
          )}
          <Badge bg="success" className="bg-opacity-10 text-success border p-2 px-3 fw-bold d-flex align-items-center">
            <ShieldCheck size={16} className="me-2" /> Privacy Verified
          </Badge>
        </div>
      </div>

      {!result && (
        <Row className="justify-content-center">
          <Col lg={7}>
            <Card className="border-0 shadow-sm mb-4" title="Sample Data Ingestion">
              <div className="p-2">
                <p className="small text-muted mb-4 text-center">Select or drag a patient sample (DICOM, JPG, or CSV) for cryptographic analysis.</p>
                <div className="upload-zone p-5 border-dashed rounded-3 text-center bg-light transition-all mb-4 cursor-pointer" onClick={() => toast.info('Accessing local storage node...')}>
                  <Brain size={48} className="text-primary mb-3 opacity-25" />
                  <p className="text-muted small mb-0">Securely ingest diagnostic media</p>
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    className="mt-3 px-4 font-bold border-0 bg-primary bg-opacity-10 text-primary"
                  >
                    Select X-Ray / Scan
                  </Button>
                </div>

                <div className="d-flex gap-3 mb-4">
                  <Form.Select className="py-2 border-light bg-light small flex-grow-1">
                    <option>Global Model: Pulmonary-V4 (FedAvg)</option>
                    <option>Local Model: Node-Personalized-CNN</option>
                  </Form.Select>
                  <Button variant="light" className="border px-3"><Info size={18} className="text-muted" /></Button>
                </div>

                <Button 
                  variant="primary" 
                  className="w-100 py-3 fw-bold shadow-md"
                  onClick={handlePredict}
                  disabled={analyzing}
                >
                  {analyzing ? 'Propagating Weights & Analyzing...' : 'Initialize Inference'}
                </Button>
              </div>
            </Card>

            {analyzing && (
              <div className="mt-4 animate-fade-in text-center">
                <ProgressBar animated now={100} variant="primary" className="rounded-pill mb-3" style={{ height: '8px' }} />
                <span className="extra-small fw-bold text-muted uppercase-spacing">Decrypting Node Data... Running Convolutional Pipeline...</span>
              </div>
            )}
          </Col>
        </Row>
      )}

      {result && (
        <div className="animate-fade-in">
          <Row className="g-4">
            {/* Left Column: Visual Interpretation (Image XAI) */}
            <Col lg={6}>
              <h6 className="fw-bold mb-3 uppercase-spacing extra-small text-muted d-flex align-items-center">
                <Target size={14} className="me-2" /> Spatial Focus (Grad-CAM)
              </h6>
              <HeatmapViewer imageSrc={result.imageSrc} />
              
              <Card className="border-0 shadow-sm mt-4 border-start border-4 border-danger" title="Primary Classification">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h3 className="fw-bold text-danger m-0">{result.class}</h3>
                  <Badge bg="danger" className="p-2 px-3 rounded-pill h5 mb-0">{result.confidence}% Confidence</Badge>
                </div>
                <p className="small text-muted">
                  The model detected high-density opacities in the bilateral lower lobes, which is highly consistent with viral pneumonia presentation.
                </p>
              </Card>
            </Col>

            {/* Right Column: Mathematical Interpretation (Tabular XAI) */}
            <Col lg={6}>
              <h6 className="fw-bold mb-3 uppercase-spacing extra-small text-muted d-flex align-items-center">
                <Info size={14} className="me-2" /> Feature Contribution (SHAP)
              </h6>
              <TabularXAI shapData={result.shapData} probabilityData={result.probabilityData} />
              
              <div className="mt-4 d-flex gap-2">
                <Button variant="primary" className="flex-fill py-2 fw-bold" onClick={() => toast.success('Confirmed! Updating local database...')}>Confirm & Save</Button>
                <Button variant="outline-secondary" className="flex-fill py-2 fw-bold" onClick={() => setResult(null)}>Discard Result</Button>
              </div>
            </Col>
          </Row>
        </div>
      )}

      <style>{`
        .upload-zone { border: 2px dashed #e2e8f0; transition: all 0.2s; }
        .upload-zone:hover { border-color: var(--primary-color); background: var(--primary-soft) !important; }
      `}</style>
    </div>
  );
};

export default Predictions;
