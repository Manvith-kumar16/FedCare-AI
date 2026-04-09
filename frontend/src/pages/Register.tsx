import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, InputGroup, Spinner, Row, Col } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import { toast } from 'react-toastify';
import { Mail, Lock, User as UserIcon, UserPlus, Shield, Hospital } from 'lucide-react';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'HOSPITAL',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      // 1. Call Register API
      await authService.register(
        formData.name,
        formData.email,
        formData.password,
        formData.role
      );

      toast.success('Registration successful! You can now log in.');
      navigate('/login');
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Registration failed. Email might be in use.';
      setError(detail);
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper py-5">
      <Container>
        <div className="d-flex justify-content-center">
          <Card className="auth-card shadow-lg border-0" style={{ maxWidth: '500px' }}>
            <Card.Body className="p-4 p-md-5">
              <div className="text-center mb-5">
                <div className="bg-primary bg-opacity-10 d-inline-block p-3 rounded-circle mb-3">
                  <UserPlus size={32} className="text-primary" />
                </div>
                <h2 className="fw-bold">Create Account</h2>
                <p className="text-muted small">Join the FedCare AI collaborative network</p>
              </div>

              {error && (
                <Alert variant="danger" className="py-2 small border-0 shadow-sm mb-4">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit} autoComplete="off">
                {/* Dummy fields to trick password managers */}
                <input type="text" name="prevent_autofill" style={{ display: 'none' }} tabIndex={-1} />
                <input type="password" name="password_fake" style={{ display: 'none' }} tabIndex={-1} />

                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold">Full Name</Form.Label>
                  <InputGroup>
                    <InputGroup.Text className="bg-light border-end-0">
                      <UserIcon size={18} className="text-muted" />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      name="name"
                      placeholder="Dr. John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      className="bg-light border-start-0 py-2"
                      required
                    />
                  </InputGroup>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold">Email Address</Form.Label>
                  <InputGroup>
                    <InputGroup.Text className="bg-light border-end-0">
                      <Mail size={18} className="text-muted" />
                    </InputGroup.Text>
                    <Form.Control
                      type="email"
                      name="email"
                      placeholder="name@company.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="bg-light border-start-0 py-2"
                      required
                    />
                  </InputGroup>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold">Account Type</Form.Label>
                  <div className="d-flex gap-3 mt-1">
                    <div 
                      className={`flex-fill p-3 border rounded cursor-pointer text-center ${formData.role === 'HOSPITAL' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-light'}`}
                      onClick={() => setFormData({...formData, role: 'HOSPITAL'})}
                      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      <Hospital size={20} className="mb-1" />
                      <div className="extra-small fw-bold">HOSPITAL</div>
                    </div>
                    <div 
                      className={`flex-fill p-3 border rounded cursor-pointer text-center ${formData.role === 'ADMIN' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-light'}`}
                      onClick={() => setFormData({...formData, role: 'ADMIN'})}
                      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      <Shield size={20} className="mb-1" />
                      <div className="extra-small fw-bold">ADMIN</div>
                    </div>
                  </div>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-4">
                      <Form.Label className="small fw-bold">Password</Form.Label>
                      <InputGroup>
                        <InputGroup.Text className="bg-light border-end-0">
                          <Lock size={18} className="text-muted" />
                        </InputGroup.Text>
                        <Form.Control
                          type="password"
                          name="password"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={handleChange}
                          className="bg-light border-start-0 py-2"
                          required
                          autoComplete="new-password"
                        />
                      </InputGroup>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-4">
                      <Form.Label className="small fw-bold">Confirm</Form.Label>
                      <InputGroup>
                        <InputGroup.Text className="bg-light border-end-0">
                          <Lock size={18} className="text-muted" />
                        </InputGroup.Text>
                        <Form.Control
                          type="password"
                          name="confirmPassword"
                          placeholder="••••••••"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className="bg-light border-start-0 py-2"
                          required
                          autoComplete="new-password"
                        />
                      </InputGroup>
                    </Form.Group>
                  </Col>
                </Row>

                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100 py-2 fw-bold shadow-sm" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Creating account...
                    </>
                  ) : (
                    'Register Now'
                  )}
                </Button>
              </Form>

              <div className="text-center mt-5">
                <p className="text-muted small">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary fw-bold text-decoration-none">
                    Log In
                  </Link>
                </p>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Container>
    </div>
  );
};

export default Register;
