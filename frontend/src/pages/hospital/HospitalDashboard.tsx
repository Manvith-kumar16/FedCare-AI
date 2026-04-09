import React from 'react';
import { Row, Col } from 'react-bootstrap';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import { Database, Zap, BookOpen, Clock, Activity } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';

const HospitalDashboard: React.FC = () => {
  // Mock Hospital Data
  const recentActivities = [
    { activity: 'Model Update', server: 'Pneumonia Detect-AI', time: '2 mins ago', status: 'Success' },
    { activity: 'Data Sync', server: 'Diabetes Risk', time: '1 hour ago', status: 'Success' },
    { activity: 'Weight Ingest', server: 'Cardiac Audio', time: '4 hours ago', status: 'In-progress' },
  ];

  const columns = [
    { header: 'Recent Activity', accessor: 'activity', render: (row: any) => <span className="fw-bold">{row.activity}</span> },
    { header: 'Target Server', accessor: 'server' },
    { header: 'Time', accessor: 'time', render: (row: any) => <span className="text-muted small">{row.time}</span> },
    { header: 'Status', accessor: 'status', render: (row: any) => <BadgeStatus status={row.status} /> },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h2 className="fw-bold mb-1 brand-font">Hospital Node Performance</h2>
        <p className="text-muted small">Real-time status of your local federated learning node.</p>
      </div>

      <Row className="g-4 mb-5">
        <Col md={3}>
          <StatCard label="Local Records" value="6,420" icon={<Database size={20} />} trend={{ value: 5, isUp: true }} />
        </Col>
        <Col md={3}>
          <StatCard label="Active Rounts" value="12" icon={<Activity size={20} />} colorClass="success" />
        </Col>
        <Col md={3}>
          <StatCard label="Compute Status" value="Healthy" icon={<Zap size={20} />} colorClass="info" />
        </Col>
        <Col md={3}>
          <StatCard label="Reports Ready" value="4" icon={<BookOpen size={20} />} colorClass="warning" />
        </Col>
      </Row>

      <Row>
        <Col lg={8}>
          <Card title="Node Activity Log">
            <DataTable columns={columns} data={recentActivities} />
          </Card>
        </Col>
        <Col lg={4}>
          <Card title="Resource Utilization" className="h-100">
             <div className="p-2">
                <div className="mb-4">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="extra-small fw-bold">CPU Load</span>
                    <span className="extra-small">24%</span>
                  </div>
                  <div className="progress" style={{ height: '6px' }}>
                    <div className="progress-bar bg-primary" style={{ width: '24%' }}></div>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="extra-small fw-bold">VRAM Usage</span>
                    <span className="extra-small">4.8 GB / 12 GB</span>
                  </div>
                  <div className="progress" style={{ height: '6px' }}>
                    <div className="progress-bar bg-info" style={{ width: '40%' }}></div>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="extra-small fw-bold">Network I/O</span>
                    <span className="extra-small">1.2 MB/s</span>
                  </div>
                  <div className="progress" style={{ height: '6px' }}>
                    <div className="progress-bar bg-warning" style={{ width: '15%' }}></div>
                  </div>
                </div>
             </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

const BadgeStatus: React.FC<{status: string}> = ({ status }) => (
  <span className={`badge ${status === 'Success' ? 'bg-success' : 'bg-info'} bg-opacity-10 text-${status === 'Success' ? 'success' : 'info'}`}>
    {status}
  </span>
);

export default HospitalDashboard;
