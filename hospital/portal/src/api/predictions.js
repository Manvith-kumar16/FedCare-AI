import api from './client'

export const makePrediction = (data) => api.post('/predictions/predict', data)
export const getPredictionHistory = (serverId) => api.get(`/predictions/history/${serverId}`)
export const getExplanation = (predId) => api.get(`/explainability/explain/${predId}`)
export const getFeatureImportance = (serverId) => api.get(`/explainability/feature-importance/${serverId}`)
