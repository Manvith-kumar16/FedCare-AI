import api from './client'

export const startLocalTraining = (data) => api.post('/training/local-start', data)
export const triggerSync = () => api.post('/training/sync')
export const getTrainingLogs = (serverId) => api.get(`/training/logs/${serverId}`)
export const getTrainingHistory = (serverId) => api.get('/training/history', { params: { server_id: serverId } })
