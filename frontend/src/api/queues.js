import { api } from './client'

export const queuesApi = {
  join: (serviceId) => api.post('/api/queues/join', { service_id: serviceId }),
  leave: (queueId) => api.post(`/api/queues/${queueId}/leave`),
  status: (queueId) => api.get(`/api/queues/${queueId}`),
  myEntryLive: (entryId) => api.get(`/api/queues/entries/${entryId}/live`),
  history: () => api.get('/api/queues/history'),

  // Org admin: live queue management
  mine: () => api.get('/api/queues/mine'),
  stats: () => api.get('/api/queues/stats'),
  live: (queueId) => api.get(`/api/queues/${queueId}/live`),
  callNext: (queueId) => api.post(`/api/queues/${queueId}/call-next`),
  setEntryStatus: (entryId, newStatus) =>
    api.post(`/api/queues/entries/${entryId}/status?new_status=${newStatus}`),
  hold: (entryId) => api.post(`/api/queues/entries/${entryId}/hold`),
  orgHistory: () => api.get('/api/queues/org-history'),
}