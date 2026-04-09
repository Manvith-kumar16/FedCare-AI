import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, AdminRoute } from './GuardRoutes';
import MainLayout from '../layouts/MainLayout';

// Auth Pages
import Login from '../pages/Login';
import Register from '../pages/Register';

// Dashboard & Multi-tenant Pages
import Dashboard from '../pages/Dashboard';
import Servers from '../pages/hospital/Servers';
import Datasets from '../pages/hospital/Datasets';
import Training from '../pages/hospital/Training';
import Predictions from '../pages/hospital/Predictions';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={
        <MainLayout>
          <div className="p-5 text-center animate-fade-in">
            <h3 className="fw-bold">Unauthorized Access</h3>
            <p className="text-muted">You do not have permission to view this medical resource.</p>
          </div>
        </MainLayout>
      } />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={
            <MainLayout>
              <Dashboard />
            </MainLayout>
          }
        />
        
        {/* Hospital Workflow Routes */}
        <Route 
          path="/servers" 
          element={<MainLayout><Servers /></MainLayout>} 
        />
        <Route 
          path="/datasets" 
          element={<MainLayout><Datasets /></MainLayout>} 
        />
        <Route 
          path="/training" 
          element={<MainLayout><Training /></MainLayout>} 
        />
        <Route 
          path="/predictions" 
          element={<MainLayout><Predictions /></MainLayout>} 
        />

        {/* Admin Only Routes */}
        <Route element={<AdminRoute />}>
          <Route
            path="/admin/settings"
            element={
              <MainLayout>
                <div className="animate-fade-in">
                  <h2 className="fw-bold mb-4">Admin System Settings</h2>
                  <p>Centralized configuration for federated learning nodes and hospital registration.</p>
                </div>
              </MainLayout>
            }
          />
        </Route>

        <Route 
          path="/settings" 
          element={<MainLayout><div className="animate-fade-in"><h2 className="fw-bold mb-4">User Preferences</h2></div></MainLayout>} 
        />
      </Route>

      {/* Default Routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<MainLayout><div className="p-5 text-center"><h3>404 - Not Found</h3></div></MainLayout>} />
    </Routes>
  );
};

export default AppRoutes;
