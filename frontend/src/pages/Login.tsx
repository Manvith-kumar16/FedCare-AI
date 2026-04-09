import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, InputGroup, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import { toast } from 'react-toastify';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoLogin = async (role: 'ADMIN' | 'HOSPITAL') => {
    setDemoLoading(true);
    try {
      const mockEmail = role === 'ADMIN' ? 'admin@fedcare.ai' : 'hospital@fedcare.ai';
      const tokens = await authService.login(mockEmail, 'password123');
      
      const mockUserData = {
        id: role === 'ADMIN' ? 1 : 2,
        name: role === 'ADMIN' ? 'System Administrator' : 'St. Mary\'s Hospital',
        email: mockEmail,
        role: role,
      };

      login(tokens, mockUserData);
      toast.success(`Welcome to ${role} Dashboard (Demo Mode)`);
      navigate('/dashboard');
    } catch (err) {
      toast.error('Demo login failed.');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      // 1. Authenticate via Service
      const tokens = await authService.login(email, password);
      
      // 2. Mock User Data for now since login only returns tokens in Phase 1 backend
      // In a real scenario, we might call /users/me or have user info in JWT
      const mockUserData = {
        id: 1,
        name: 'Logged-in User',
        email: email,
        role: email.toLowerCase().includes('admin') ? 'ADMIN' : 'HOSPITAL',
      };

      // 3. Update Global Context
      login(tokens, mockUserData);
      
      toast.success('Login successful! Welcome to FedCare AI.');
      navigate('/dashboard');
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Invalid email or password. Please try again.';
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
          <Card className="auth-card shadow-lg border-0">
            <Card.Body className="p-4 p-md-5">
              <div className="text-center mb-5">
                <div className="bg-primary bg-opacity-10 d-inline-block p-3 rounded-circle mb-3">
                  <LogIn size={32} className="text-primary" />
                </div>
                <h2 className="fw-bold">Welcome Back</h2>
                <p className="text-muted small">Sign in to your account to continue</p>
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
                  <Form.Label className="small fw-bold">Email Address</Form.Label>
                  <InputGroup>
                    <InputGroup.Text className="bg-light border-end-0">
                      <Mail size={18} className="text-muted" />
                    </InputGroup.Text>
                    <Form.Control
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-light border-start-0 py-2"
                      required
                      autoComplete="off"
                    />
                  </InputGroup>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold">Password</Form.Label>
                  <InputGroup>
                    <InputGroup.Text className="bg-light border-end-0">
                      <Lock size={18} className="text-muted" />
                    </InputGroup.Text>
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-light border-start-0 border-end-0 py-2"
                      required
                      autoComplete="new-password"
                    />
                    <InputGroup.Text 
                      className="bg-light border-start-0 cursor-pointer" 
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ cursor: 'pointer' }}
                    >
                      {showPassword ? <EyeOff size={18} className="text-muted" /> : <Eye size={18} className="text-muted" />}
                    </InputGroup.Text>
                  </InputGroup>
                  <div className="text-end mt-2">
                  <Link to="/forgot-password" className="text-primary text-decoration-none small">
                      Forgot password?
                    </Link>
                  </div>
                </Form.Group>

                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100 py-2 fw-bold shadow-sm" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <div className="mt-4 border-top pt-4">
                  <p className="extra-small text-center text-muted fw-bold mb-3 uppercase-spacing">
                    Demo Access (No Backend Needed)
                  </p>
                  <div className="d-flex gap-2">
                    <Button 
                      variant="outline-primary" 
                      onClick={() => handleDemoLogin('HOSPITAL')}
                      className="flex-fill py-2 small fw-bold"
                    >
                      Login as Hospital
                    </Button>
                    <Button 
                      variant="outline-dark" 
                      onClick={() => handleDemoLogin('ADMIN')}
                      className="flex-fill py-2 small fw-bold"
                    >
                      Login as Admin
                    </Button>
                  </div>
                </div>
              </Form>

              <div className="text-center mt-5">
                <p className="text-muted small">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-primary fw-bold text-decoration-none">
                    Register Now
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

export default Login;
