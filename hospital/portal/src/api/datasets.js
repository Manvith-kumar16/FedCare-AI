import api from './client'

export const getDatasets = (serverId) => api.get('/datasets/', { params: { server_id: serverId } })
export const getDatasetPreview = (id, rows = 10) => api.get(`/datasets/${id}/preview`, { params: { rows } })
export const clearDatasets = (serverId) => api.delete(`/datasets/clear/${serverId}`)
export const validateDataset = (id) => api.post(`/datasets/validate/${id}`)

export const uploadDataset = (serverId, file) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('server_id', serverId)

  return api.post('/datasets/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}
