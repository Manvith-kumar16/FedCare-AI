import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Servers from './pages/Servers'
import Datasets from './pages/Datasets'
import Training from './pages/Training'
import Predictions from './pages/Predictions'
import Explainability from './pages/Explainability'

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="servers" element={<Servers />} />
            <Route path="datasets" element={<Datasets />} />
            <Route path="training" element={<Training />} />
            <Route path="predictions" element={<Predictions />} />
            <Route path="explainability" element={<Explainability />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}

export default App
