import React from 'react';
import { Row, Col } from 'react-bootstrap';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import LineChart from '../../components/charts/LineChart';
import { Users, Server, Activity, ShieldCheck, Globe } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import LiveFeed from '../../components/ui/LiveFeed';

const AdminDashboard: React.FC = () => {
  // Mock Admin Data
  const recentHospitals = [
    { name: 'City General Hospital', region: 'North', servers: 4, status: 'Active' },
    { name: 'Mayo Clinic Prototype', region: 'Global', servers: 12, status: 'Active' },
    { name: 'Berlin Health Inst.', region: 'Europe', servers: 2, status: 'Pending' },
    { name: 'Tokyo Med University', region: 'Asia', servers: 8, status: 'Active' },
  ];

  const chartData = [
    { month: 'Jan', hospitals: 12, servers: 5 },
    { month: 'Feb', hospitals: 18, servers: 12 },
    { month: 'Mar', hospitals: 32, servers: 24 },
    { month: 'Apr', hospitals: 45, servers: 38 },
  ];

  const columns = [
    { header: 'Hospital Name', accessor: 'name', render: (row: any) => <span className="fw-bold">{row.name}</span> },
    { header: 'Region', accessor: 'region' },
    { header: 'Servers joined', accessor: 'servers' },
    { 
      header: 'Status', 
      accessor: 'status', 
      render: (row: any) => (
        <span className={`badge ${row.status === 'Active' ? 'bg-success' : 'bg-warning'} bg-opacity-10 text-${row.status === 'Active' ? 'success' : 'warning'}`}>
          {row.status}
        </span>
      )
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h2 className="fw-bold mb-1">System Administration</h2>
        <p className="text-muted small">Global oversight of the FedCare AI federated network.</p>
      </div>

      <Row className="g-4 mb-5">
        <Col md={3}>
          <StatCard label="Total Hospitals" value="45" icon={<Users size={20} />} trend={{ value: 12, isUp: true }} />
        </Col>
        <Col md={3}>
          <StatCard label="Live Servers" value="38" icon={<Server size={20} />} trend={{ value: 8, isUp: true }} colorClass="info" />
        </Col>
        <Col md={3}>
          <StatCard label="Active Tokens" value="1,240" icon={<ShieldCheck size={20} />} colorClass="success" />
        </Col>
        <Col md={3}>
          <StatCard label="Nodes Online" value="128" icon={<Globe size={20} />} colorClass="warning" />
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={8}>
          <Card title="Network Growth Summary">
            <LineChart 
              data={chartData} 
              xKey="month" 
              lines={[
                { key: 'hospitals', color: 'var(--primary-color)', name: 'Joined Hospitals' },
                { key: 'servers', color: 'var(--success-color)', name: 'Active Servers' }
              ]} 
              height={300}
            />
          </Card>
        </Col>
        <Col lg={4}>
          <Card title="Recent Registrations" className="h-100">
            <DataTable columns={columns} data={recentHospitals} searchable={false} pageSize={4} />
            <div className="text-center mt-3">
              <button className="btn btn-link link-primary extra-small text-decoration-none fw-bold uppercase-spacing">View All Entities</button>
            </div>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mt-2">
        <Col lg={12}>
          <Card title="Live Network Feed">
            <LiveFeed />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;
