import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminDashboard from './admin/AdminDashboard';
import HospitalDashboard from './hospital/HospitalDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Role-based dashboard routing
  if (user?.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  return <HospitalDashboard />;
};

export default Dashboard;
