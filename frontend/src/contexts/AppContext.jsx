import { createContext, useContext, useState, useCallback } from 'react'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [currentServer, setCurrentServer] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [userName, setUserName] = useState('')
  const [hospitalId, setHospitalId] = useState(null)
  const [hospitalName, setHospitalName] = useState('')

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const handleLoginSuccess = useCallback((data) => {
    setIsAuthenticated(true)
    setUserRole(data.user.role)
    setUserName(data.user.name)
    if (data.hospital) {
      setHospitalId(data.hospital.id)
      setHospitalName(data.hospital.name)
    }
  }, [])

  return (
    <AppContext.Provider value={{
      toasts, addToast, removeToast,
      currentServer, setCurrentServer,
      isAuthenticated, setIsAuthenticated,
      userRole, setUserRole,
      userName, setUserName,
      hospitalId, setHospitalId,
      hospitalName, setHospitalName,
      handleLoginSuccess
    }}>
      {children}
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`toast toast-${toast.type}`}
              onClick={() => removeToast(toast.id)}
            >
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✕'}
              {toast.type === 'info' && 'ℹ'}
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
