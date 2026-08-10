import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Add Authorization header
api.interceptors.request.use(config => {
  const token = localStorage.getItem('fedcare_token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

export default api
