import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import DashboardLayout from './components/DashboardLayout'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import FindServicesPage from './pages/FindServicesPage'
import ServiceDetailPage from './pages/ServiceDetailPage'
import QueueTrackerPage from './pages/QueueTrackerPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import EditProfilePage from './pages/customer/EditProfilePage'
import QueueHistoryPage from './pages/customer/QueueHistoryPage'

import CustomerDashboardPage from './pages/customer/CustomerDashboardPage'

import OrgDashboardPage from './pages/org/OrgDashboardPage'
import OrgServicesPage from './pages/org/OrgServicesPage'
import OrgQueuesPage from './pages/org/OrgQueuesPage'
import OrgAnalyticsPage from './pages/org/OrgAnalyticsPage'
import OrgSettingsPage from './pages/org/OrgSettingsPage'
import OrgQueueHistoryPage from './pages/org/OrgQueueHistoryPage'

import StaffDashboardPage from './pages/staff/StaffDashboardPage'
import StaffCounterPage from './pages/staff/StaffCounterPage'
import { ThemeProvider } from './context/ThemeContext'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Customer */}
            <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<CustomerDashboardPage />} />
                <Route path="/services" element={<FindServicesPage />} />
                <Route path="/services/:id" element={<ServiceDetailPage />} />
                <Route path="/queue/:id" element={<QueueTrackerPage />} />
                <Route path="/history" element={<QueueHistoryPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/profile/edit" element={<EditProfilePage />} />
              </Route>
            </Route>

            {/* Organization Admin */}
            <Route element={<ProtectedRoute allowedRoles={['org_admin']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/organization/dashboard" element={<OrgDashboardPage />} />
                <Route path="/organization/services" element={<OrgServicesPage />} />
                <Route path="/organization/queues" element={<OrgQueuesPage />} />
                <Route path="/organization/history" element={<OrgQueueHistoryPage />} />
                <Route path="/organization/analytics" element={<OrgAnalyticsPage />} />
                <Route path="/organization/settings" element={<OrgSettingsPage />} />
              </Route>
            </Route>

            {/* Staff */}
            <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/staff/dashboard" element={<StaffDashboardPage />} />
                <Route path="/staff/counter/:id" element={<StaffCounterPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}