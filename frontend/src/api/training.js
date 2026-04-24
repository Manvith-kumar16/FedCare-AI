import api from './client'

export const startTraining = (data) => api.post('/training/start', data)
export const trainFullModel = (data) => api.post('/training/train-full', data)
export const getTrainingStatus = (serverId) => api.get(`/training/status/${serverId}`)
export const getTrainingLogs = (serverId, logType) => api.get(`/training/logs/${serverId}`, { params: { log_type: logType } })
