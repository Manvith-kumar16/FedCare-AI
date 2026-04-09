import React, { useState, useEffect } from 'react';
import hospitalService, { DiseaseServer } from '../../services/hospitalService';
import StatCard from '../../components/ui/StatCard';
import DataTable from '../../components/ui/DataTable';
import Card from '../../components/ui/Card';
import { Server, Activity, Plus, Search, Filter } from 'lucide-react';
import { Button, Row, Col, Badge, InputGroup, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';

const Servers: React.FC = () => {
  const [servers, setServers] = useState<DiseaseServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    setLoading(true);
    const data = await hospitalService.getServers();
    setServers(data);
    setLoading(false);
  };

  const handleJoin = async (id: number) => {
    toast.info('Sending join request...');
    const success = await hospitalService.joinServer(id);
    if (success) {
      toast.success('Joined server successfully!');
    }
  };

  const filteredServers = servers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { 
      header: 'Server Name', 
      accessor: 'name',
      render: (row: DiseaseServer) => (
        <div className="d-flex align-items-center">
          <div className="p-2 bg-light rounded-circle me-3">
            <Server size={16} className="text-primary" />
          </div>
          <span className="fw-bold">{row.name}</span>
        </div>
      )
    },
    { 
      header: 'Data Type', 
      accessor: 'type',
      render: (row: DiseaseServer) => (
        <Badge bg="light" className="text-secondary border px-2 py-1">
          {row.type}
        </Badge>
      )
    },
    { header: 'Algorithm', accessor: 'algorithm' },
    { 
      header: 'Participants', 
      accessor: 'hospitalsCount',
      render: (row: DiseaseServer) => (
        <div className="small text-muted">
          <Activity size={12} className="me-1" />
          {row.hospitalsCount} Hospitals
        </div>
      )
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (row: DiseaseServer) => (
        <Badge bg={row.status === 'ACTIVE' ? 'success' : 'secondary'} className="rounded-pill">
          {row.status}
        </Badge>
      )
    },
    { 
      header: 'Actions', 
      accessor: 'id',
      render: (row: DiseaseServer) => (
        <Button 
          variant="outline-primary" 
          size="sm" 
          className="fw-bold px-3 border-0 bg-primary bg-opacity-10 text-primary"
          onClick={() => handleJoin(row.id)}
          disabled={row.status !== 'ACTIVE'}
        >
          Join
        </Button>
      )
    }
  ];

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h2 className="fw-bold mb-1">Disease Servers</h2>
          <p className="text-muted small">Discover and join federated AI training networks.</p>
        </div>
        <Button variant="primary" className="shadow-sm d-flex align-items-center">
          <Plus size={18} className="me-2" /> Request New Server
        </Button>
      </div>

      <Row className="mb-4 g-3">
        <Col md={8}>
          <InputGroup className="bg-white rounded-3 shadow-sm border">
            <InputGroup.Text className="bg-transparent border-0 pe-0">
              <Search size={18} className="text-muted" />
            </InputGroup.Text>
            <Form.Control 
              placeholder="Search servers by name or type..." 
              className="border-0 py-2 shadow-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={4}>
          <Button variant="light" className="w-100 bg-white border shadow-sm py-2 d-flex align-items-center justify-content-center text-muted">
            <Filter size={18} className="me-2" /> Filter Options
          </Button>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm overflow-hidden">
        <DataTable columns={columns} data={filteredServers} loading={loading} />
      </Card>
    </div>
  );
};

export default Servers;
