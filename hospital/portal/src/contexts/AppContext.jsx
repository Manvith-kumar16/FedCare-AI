import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getMe } from '../api'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [currentServer, setCurrentServer] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('fedcare_token'))
  const [userRole, setUserRole] = useState(localStorage.getItem('fedcare_user_role'))
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState(localStorage.getItem('fedcare_user_email'))
  const [hospitalId, setHospitalId] = useState(localStorage.getItem('fedcare_hospital_id'))
  const [hospitalName, setHospitalName] = useState('')
  const [loading, setLoading] = useState(true)

  // Fetch user data on mount if token exists
  useEffect(() => {
    async function init() {
      const token = localStorage.getItem('fedcare_token')
      if (token) {
        try {
          const res = await getMe()
          handleLoginSuccess(res.data)
        } catch (e) {
          console.error("Session expired or invalid", e)
          logout()
        }
      }
      setLoading(false)
    }
    init()
  }, [])

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
    localStorage.setItem('fedcare_user_role', data.user.role)
    setUserName(data.user.name)
    setUserEmail(data.user.email)
    localStorage.setItem('fedcare_user_email', data.user.email)
    
    if (data.access_token && data.access_token !== 'already-authenticated') {
      localStorage.setItem('fedcare_token', data.access_token)
    }
    
    if (data.hospital) {
      setHospitalId(data.hospital.id)
      localStorage.setItem('fedcare_hospital_id', data.hospital.id)
      setHospitalName(data.hospital.name)
    }
  }, [])

  const logout = useCallback(() => {
    setIsAuthenticated(false)
    setUserRole(null)
    setUserName('')
    setUserEmail('')
    setHospitalId(null)
    setHospitalName('')
    localStorage.removeItem('fedcare_token')
    localStorage.removeItem('fedcare_user_role')
    localStorage.removeItem('fedcare_user_email')
    localStorage.removeItem('fedcare_hospital_id')
  }, [])

  return (
    <AppContext.Provider value={{
      toasts, addToast, removeToast,
      currentServer, setCurrentServer,
      isAuthenticated, setIsAuthenticated,
      userRole, setUserRole,
      userName, setUserName,
      userEmail, setUserEmail,
      hospitalId, setHospitalId,
      hospitalName, setHospitalName,
      handleLoginSuccess, logout,
      loading
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
