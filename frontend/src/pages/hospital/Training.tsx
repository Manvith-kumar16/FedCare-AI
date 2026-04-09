import React, { useState, useEffect, useRef } from 'react';
import hospitalService, { TrainingLog } from '../../services/hospitalService';
import Card from '../../components/ui/Card';
import { Activity, Play, Terminal, Target, Zap } from 'lucide-react';
import { Button, Row, Col, Badge, ProgressBar } from 'react-bootstrap';
import LineChart from '../../components/charts/LineChart';
import { toast } from 'react-toastify';

const Training: React.FC = () => {
  const [isTraining, setIsTraining] = useState(false);
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const startTraining = () => {
    setIsTraining(true);
    setLogs([]);
    setChartData([]);
    toast.success('Federated Training initiated on local node.');

    const cleanup = hospitalService.getTrainingLogs((newLog) => {
      setLogs(prev => [...prev, newLog]);
      setChartData(prev => [...prev, {
        round: newLog.round,
        accuracy: parseFloat(newLog.accuracy.toFixed(4)),
        loss: parseFloat(newLog.loss.toFixed(4))
      }]);
      
      if (newLog.round >= 10) {
        setIsTraining(false);
        toast.success('Training round completed successfully!');
      }
    });

    return cleanup;
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h2 className="fw-bold mb-1">Federated Training</h2>
          <p className="text-muted small">Monitor real-time model aggregation and local weight updates.</p>
        </div>
        <Button 
          variant="primary" 
          size="lg"
          onClick={startTraining} 
          disabled={isTraining}
          className="shadow-sm d-flex align-items-center px-4"
        >
          {isTraining ? <Zap size={18} className="me-2 animate-pulse" /> : <Play size={18} className="me-2" />}
          {isTraining ? 'Training in Progress...' : 'Start Local Training'}
        </Button>
      </div>

      <Row className="g-4 mb-4">
        <Col lg={8}>
          <Card className="h-100 border-0 shadow-sm" title="Performance Metrics">
            <LineChart 
              data={chartData} 
              xKey="round" 
              lines={[
                { key: 'accuracy', color: 'var(--success-color)', name: 'Accuracy' },
                { key: 'loss', color: 'var(--danger-color)', name: 'Loss' }
              ]}
              height={320}
            />
          </Card>
        </Col>
        <Col lg={4}>
          <div className="d-flex flex-column gap-4 h-100">
            <Card className="flex-fill border-0 shadow-sm" title="Active Nodes">
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                <span className="small text-muted">Total Participants</span>
                <span className="fw-bold h5 mb-0">12</span>
              </div>
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                <span className="small text-muted">Current Wait State</span>
                <Badge bg="info" className="bg-opacity-10 text-info border">Syncing Weights</Badge>
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <span className="small text-muted">Round Target</span>
                <span className="fw-bold">10 / 10</span>
              </div>
            </Card>

            <Card className="flex-fill border-0 shadow-sm bg-dark bg-opacity-90 text-white" title="Live Terminal">
              <div 
                className="terminal-log p-2 font-monospace extra-small overflow-auto" 
                style={{ height: '180px', color: '#00ff00' }}
              >
                {logs.length === 0 && <span className="opacity-50 fst-italic">Waiting for signal...</span>}
                {logs.map(log => (
                  <div key={log.id} className="mb-2">
                    <span className="text-muted me-2">[{log.timestamp}]</span>
                    {log.message}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </Card>
          </div>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          <Card className="border-0 shadow-sm" title="Training Schedule">
            <div className="p-2">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="small fw-bold">Overall Progress</span>
                    <span className="small text-muted">{logs.length * 10}%</span>
                  </div>
                  <ProgressBar now={logs.length * 10} variant="success" className="rounded-pill" style={{ height: '6px' }} />
                </div>
              </div>
              <div className="alert alert-light border-0 small text-muted">
                <strong>💡 Tip:</strong> Federated training ensures your raw medical data never leaves this node. Only model updates (gradients) are shared with the aggregator.
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }
        .animate-pulse {
          animation: pulse 1.5s infinite ease-in-out;
        }
        .terminal-log::-webkit-scrollbar {
          width: 4px;
        }
        .terminal-log::-webkit-scrollbar-thumb {
          background: #334155;
        }
      `}</style>
    </div>
  );
};

export default Training;
