import { api } from './client'

export const servicesApi = {
  browse: () => api.get('/api/services/browse'),
  getLive: (serviceId) => api.get(`/api/services/${serviceId}/live`),
  list: () => api.get('/api/services/list'),
  create: (data) => api.post('/api/services/create', data),
  update: (serviceId, data) => api.put(`/api/services/${serviceId}`, data),
  remove: (serviceId) => api.delete(`/api/services/${serviceId}`),
}