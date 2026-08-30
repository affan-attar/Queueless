import { api } from './client'

export const organizationsApi = {
  // Backend organizations module exists but this endpoint may not yet —
  // OrgSettingsPage below tries this first and falls back to localStorage
  // if it 404s, same pattern as queues.js and notifications.js.
  getSettings: () => api.get('/api/organizations/me'),
  updateSettings: (payload) => api.patch('/api/organizations/me', payload),
}