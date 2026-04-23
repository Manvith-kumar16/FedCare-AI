import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './contexts/AppContext'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Servers from './pages/Servers'
import ServerDetail from './pages/ServerDetail'
import Datasets from './pages/Datasets'
import Training from './pages/Training'
import Predictions from './pages/Predictions'
import Explainability from './pages/Explainability'
import Login from './pages/Login'
import Profile from './pages/Profile'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useApp()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="servers" element={<Servers />} />
          <Route path="servers/:id" element={<ServerDetail />} />
          <Route path="datasets" element={<Datasets />} />
          <Route path="training" element={<Training />} />
          <Route path="predictions" element={<Predictions />} />
          <Route path="explainability" element={<Explainability />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
