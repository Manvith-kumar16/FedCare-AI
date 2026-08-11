import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './contexts/AppContext'
import Loader from './components/Loader'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Hospitals from './pages/Hospitals'
import Servers from './pages/Servers'
import ServerDetail from './pages/ServerDetail'
import Rounds from './pages/Rounds'
import Models from './pages/Models'
import Metrics from './pages/Metrics'
import Explainability from './pages/Explainability'
import TrainingHistory from './pages/TrainingHistory'
import Profile from './pages/Profile'
import Register from './pages/Register'
import UserDashboard from './pages/UserDashboard'
import UserPredictionResults from './pages/UserPredictionResults'
import AdminLogin from './pages/AdminLogin'

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, userRole, loading } = useApp()

  if (loading) {
    return <Loader fullScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={userRole === 'PUBLIC_USER' ? '/user-dashboard' : '/'} replace />
  }

  return children
}

function AppRoutes() {
  const { userRole, isAuthenticated } = useApp()

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={userRole === 'PUBLIC_USER' ? '/user-dashboard' : '/'} replace /> : <Login />} />
      <Route path="/admin/login" element={isAuthenticated ? <Navigate to={userRole === 'PUBLIC_USER' ? '/user-dashboard' : '/'} replace /> : <AdminLogin />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to={userRole === 'PUBLIC_USER' ? '/user-dashboard' : '/'} replace /> : <Register />} />
      
      <Route path="/" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'PUBLIC_USER']}>
          <Layout />
        </ProtectedRoute>
      }>
        {/* Admin Routes */}
        <Route index element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="hospitals" element={<ProtectedRoute allowedRoles={['ADMIN']}><Hospitals /></ProtectedRoute>} />
        <Route path="servers" element={<ProtectedRoute allowedRoles={['ADMIN']}><Servers /></ProtectedRoute>} />
        <Route path="servers/:id" element={<ProtectedRoute allowedRoles={['ADMIN']}><ServerDetail /></ProtectedRoute>} />
        <Route path="rounds" element={<ProtectedRoute allowedRoles={['ADMIN']}><Rounds /></ProtectedRoute>} />
        <Route path="models" element={<ProtectedRoute allowedRoles={['ADMIN']}><Models /></ProtectedRoute>} />
        <Route path="metrics" element={<ProtectedRoute allowedRoles={['ADMIN']}><Metrics /></ProtectedRoute>} />
        <Route path="explainability" element={<ProtectedRoute allowedRoles={['ADMIN']}><Explainability /></ProtectedRoute>} />
        
        {/* Public User Routes */}
        <Route path="user-dashboard" element={<ProtectedRoute allowedRoles={['PUBLIC_USER']}><UserDashboard /></ProtectedRoute>} />
        <Route path="predict/:serverId" element={<ProtectedRoute allowedRoles={['PUBLIC_USER']}><UserPredictionResults /></ProtectedRoute>} />
        
        {/* Shared Routes */}
        <Route path="history" element={<TrainingHistory />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to={userRole === 'PUBLIC_USER' ? '/user-dashboard' : '/'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <Router>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </Router>
  )
}
