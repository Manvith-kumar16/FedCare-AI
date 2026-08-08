import client from './client'

// Authentication
export const login = (email, password) => client.post('/auth/login', { email, password })
export const getMe = () => client.get('/auth/me')

// Hospitals / Investigators
export const registerHospital = (data) => client.post('/auth/register', data)
export const getHospitals = () => client.get('/servers/hospitals/list')

// Disease Servers
export const getServers = () => client.get('/servers/')
export const getServer = (id) => client.get(`/servers/${id}`)
export const createServer = (data) => client.post('/servers/', data)
export const deleteServer = (id) => client.delete(`/servers/${id}`)
export const updateServer = (id, data) => client.patch(`/servers/${id}`, data)

// Memberships (approved/pending hospitals)
export const getServerMembers = (serverId) => client.get(`/servers/${serverId}/members`)
export const updateMemberStatus = (memberId, data) => client.patch(`/servers/members/${memberId}`, data)

// Training Orchestration
export const startTrainingRound = (serverId) => client.post(`/training/start/${serverId}`)
export const triggerCentralAggregation = (serverId) => client.post(`/training/aggregate/${serverId}`)
export const getTrainingRounds = () => client.get('/training/rounds')
export const getTrainingHistory = (serverId) => client.get(`/training/logs/${serverId}`)
export const getGlobalModels = () => client.get('/training/global-models')

// Explainable AI
export const getGlobalFeatureImportance = (serverId) => client.get(`/explainability/feature-importance/${serverId}`)
