import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Protected Route Wrapper
export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// Admin Only Route Wrapper
export const AdminRoute: React.FC = () => {
  const { user } = useAuth();

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

// Hospital Only Route Wrapper
export const HospitalRoute: React.FC = () => {
  const { user } = useAuth();

  if (!user || user.role !== 'HOSPITAL') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
