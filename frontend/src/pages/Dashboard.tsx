import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, Server, Activity } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <h3 className="mb-4 fw-bold">Welcome back, {user?.name}</h3>
      <Row className="g-4">
        <Col md={3}>
          <Card className="p-3">
            <div className="d-flex align-items-center">
              <div className="p-2 bg-primary bg-opacity-10 rounded-3 me-3">
                <LayoutDashboard className="text-primary" size={24} />
              </div>
              <div>
                <small className="text-muted d-block">Active Servers</small>
                <span className="h4 fw-bold">12</span>
              </div>
            </div>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="p-3">
            <div className="d-flex align-items-center">
              <div className="p-2 bg-success bg-opacity-10 rounded-3 me-3">
                <Users className="text-success" size={24} />
              </div>
              <div>
                <small className="text-muted d-block">Hospitals</small>
                <span className="h4 fw-bold">45</span>
              </div>
            </div>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="p-3">
            <div className="d-flex align-items-center">
              <div className="p-2 bg-info bg-opacity-10 rounded-3 me-3">
                <Server className="text-info" size={24} />
              </div>
              <div>
                <small className="text-muted d-block">Training Rounds</small>
                <span className="h4 fw-bold">128</span>
              </div>
            </div>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="p-3">
            <div className="d-flex align-items-center">
              <div className="p-2 bg-warning bg-opacity-10 rounded-3 me-3">
                <Activity className="text-warning" size={24} />
              </div>
              <div>
                <small className="text-muted d-block">Model Accuracy</small>
                <span className="h4 fw-bold">94.2%</span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col md={12}>
          <Card className="p-4 shadow-sm">
            <h5>System Overview</h5>
            <p className="text-muted">This is an enterprise-grade dashboard setup for FedCare AI.</p>
            <div className="alert alert-info">
              Phase 7A complete: Frontend infrastructure and core routing are operational.
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
