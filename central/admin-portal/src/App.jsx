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

function ProtectedRoute({ children }) {
  const { isAuthenticated, userRole, loading } = useApp()

  if (loading) {
    return <Loader fullScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (userRole !== 'ADMIN') {
    return <Navigate to="/login" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="hospitals" element={<Hospitals />} />
        <Route path="servers" element={<Servers />} />
        <Route path="servers/:id" element={<ServerDetail />} />
        <Route path="rounds" element={<Rounds />} />
        <Route path="models" element={<Models />} />
        <Route path="metrics" element={<Metrics />} />
        <Route path="explainability" element={<Explainability />} />
        <Route path="history" element={<TrainingHistory />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
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
