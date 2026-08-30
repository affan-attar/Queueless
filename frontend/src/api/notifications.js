import { api } from './client'

export const notificationsApi = {
  list: () => api.get('/api/notifications'),
  markRead: (id) => api.patch(`/api/notifications/${id}/read`),
  markAllRead: () => api.patch('/api/notifications/read-all'),
  getPreferences: () => api.get('/api/notifications/preferences'),
  updatePreferences: (data) => api.put('/api/notifications/preferences', data),
}