import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ProfileSetupPage } from './pages/ProfileSetupPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProfilePage } from './pages/ProfilePage'
import { LocationDashboard } from './pages/LocationDashboard'
import { OptInPage } from './pages/OptInPage'
import { ScheduledOptInsPage } from './pages/ScheduledOptInsPage'
import { ScheduledOptInAutomationPage } from './pages/ScheduledOptInAutomationPage'
import { RouteOptimizationTestPage } from './pages/RouteOptimizationTestPage'
import { TelegramBotTestPage } from './pages/TelegramBotTestPage'
import { SystemAutomationPage } from './pages/SystemAutomationPage'
import { DebugPage } from './pages/DebugPage'
import { OptInStatusPage } from './pages/OptInStatusPage'
import { MatchingTestPage } from './pages/MatchingTestPage'
import { MatchedRidesPage } from './pages/MatchedRidesPage'
import { MatchingAdminPage } from './pages/MatchingAdminPage'
import { RidesPage } from './pages/RidesPage'
import { TestingPage } from './pages/TestingPage'
import { MapboxTestPage } from './pages/MapboxTestPage'
import { LoadingSpinner } from './components/LoadingSpinner'
import './App.css'

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If user is authenticated but doesn't have a complete profile, redirect to profile setup
  if (!user.full_name || user.full_name.trim() === '') {
    return <Navigate to="/profile-setup" replace />
  }

  return <>{children}</>
}

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/profile-setup"
          element={<ProfileSetupPage />}
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/locations"
          element={
            <ProtectedRoute>
              <LocationDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opt-in"
          element={
            <ProtectedRoute>
              <OptInPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scheduled-opt-ins"
          element={
            <ProtectedRoute>
              <ScheduledOptInsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scheduled-automation"
          element={
            <ProtectedRoute>
              <ScheduledOptInAutomationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/route-optimization-test"
          element={
            <ProtectedRoute>
              <RouteOptimizationTestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/telegram-bot-test"
          element={
            <ProtectedRoute>
              <TelegramBotTestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/system-automation"
          element={
            <ProtectedRoute>
              <SystemAutomationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/debug"
          element={<DebugPage />}
        />
        <Route
          path="/testing"
          element={<TestingPage />}
        />
        <Route
          path="/opt-in-status"
          element={
            <ProtectedRoute>
              <OptInStatusPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/matching-test"
          element={
            <ProtectedRoute>
              <MatchingTestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/matched-rides"
          element={
            <ProtectedRoute>
              <MatchedRidesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/matching-admin"
          element={
            <ProtectedRoute>
              <MatchingAdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rides"
          element={
            <ProtectedRoute>
              <RidesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mapbox-test"
          element={
            <ProtectedRoute>
              <MapboxTestPage />
            </ProtectedRoute>
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
