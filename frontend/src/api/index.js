import api from './client'
import * as auth from './auth'
import * as servers from './servers'
import * as datasets from './datasets'
import * as training from './training'
import * as predictions from './predictions'

// Health
export const getHealth = () => api.get('/health/')

// Re-export all modules
export * from './auth'
export * from './servers'
export * from './datasets'
export * from './training'
export * from './predictions'

export default {
  ...auth,
  ...servers,
  ...datasets,
  ...training,
  ...predictions,
  getHealth
}
