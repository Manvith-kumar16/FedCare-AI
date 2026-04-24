import api from './client'

export const getServers = () => api.get('/servers/')
export const getServer = (id) => api.get(`/servers/${id}`)
export const createServer = (data) => api.post('/servers/', data)
export const updateServer = (id, data) => api.patch(`/servers/${id}`, data)
export const deleteServer = (id) => api.delete(`/servers/${id}`)
export const getServerMembers = (id) => api.get(`/servers/${id}/members`)
export const joinServer = (data) => api.post('/servers/join', data)
export const updateMemberStatus = (memberId, data) => api.patch(`/servers/members/${memberId}`, data)
