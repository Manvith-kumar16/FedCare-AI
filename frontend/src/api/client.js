import axios from 'axios'

const API_BASE_URL = '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Add Authorization header and hospital context
api.interceptors.request.use(config => {
  const token = localStorage.getItem('fedcare_token')
  const hospId = localStorage.getItem('fedcare_hospital_id')
  const role = localStorage.getItem('fedcare_user_role')
  
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  if (hospId) {
    config.headers['X-Hospital-Id'] = hospId
  }
  if (role) {
    config.headers['X-User-Role'] = role
  }
  return config
})

export default api
