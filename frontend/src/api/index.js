import axios from 'axios'

const API_BASE_URL = '/api/v1'


const api = axios.create({
  baseURL: API_BASE_URL,
})

// Auth
export const login = (data) => api.post('/auth/login', data)

// Servers
export const getServers = () => api.get('/servers/')
export const getServer = (id) => api.get(`/servers/${id}`)
export const createServer = (data) => api.post('/servers/', data)
export const updateServer = (id, data) => api.patch(`/servers/${id}`, data)
export const deleteServer = (id) => api.delete(`/servers/${id}`)
export const getServerMembers = (id) => api.get(`/servers/${id}/members`)
export const joinServer = (data) => api.post('/servers/join', data)
export const updateMemberStatus = (memberId, data) => api.patch(`/servers/members/${memberId}`, data)

// Datasets
export const getDatasets = (serverId) => api.get('/datasets/', { params: { server_id: serverId } })
export const getDatasetStats = (serverId) => api.get('/datasets/stats', { params: { server_id: serverId } })
export const getDatasetPreview = (id, rows = 10) => api.get(`/datasets/${id}/preview`, { params: { rows } })
export const clearDatasets = (serverId) => api.delete(`/datasets/clear/${serverId}`)

export const uploadDataset = (serverId, file) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('server_id', serverId)
  formData.append('hospital_id', 1) // Default for demo

  return api.post('/datasets/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

// Training
export const startTraining = (data) => api.post('/training/start', data)
export const trainFullModel = (data) => api.post('/training/train-full', data)
export const getTrainingStatus = (serverId) => api.get(`/training/status/${serverId}`)
export const getTrainingLogs = (serverId, logType) => api.get(`/training/logs/${serverId}`, { params: { log_type: logType } })

// Predictions
export const makePrediction = (data) => api.post('/predictions/predict', data)
export const getPredictionHistory = (serverId) => api.get(`/predictions/history/${serverId}`)
export const getExplanation = (predId) => api.get(`/predictions/explain/${predId}`)
export const getFeatureImportance = (serverId) => api.get(`/predictions/feature-importance/${serverId}`)

// Health
export const getHealth = () => api.get('/health/')

export default {
  login,
  getServers, getServer, createServer, updateServer, deleteServer, getServerMembers,
  joinServer, updateMemberStatus,
  getDatasets, getDatasetStats, getDatasetPreview, uploadDataset, clearDatasets,
  startTraining, trainFullModel, getTrainingStatus, getTrainingLogs,
  makePrediction, getPredictionHistory, getExplanation, getFeatureImportance,
  getHealth
}


