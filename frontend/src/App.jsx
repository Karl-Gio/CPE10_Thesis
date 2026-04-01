import { Routes, Route } from 'react-router-dom'
import Login from './component/User/Login'
import Register from './component/User/Register'
import DashboardPage from './component/System_Dashboard/DashboardPage'
import VisualMonitoringDashboard from './component/Visual_Monitoring/VisualMonitoringDashboard'
import ParametersPage from './component/System_Configuration/ParametersPage'
import PredictionPage from './component/Growth Analytics_&_Prediction/PredictionPage'
import TestingPage from './component/Testing/TestingPage'
import ProtectedRoute from './ProtectedRoute'

function App() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* PROTECTED */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/parameters"
        element={
          <ProtectedRoute>
            <ParametersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/validation"
        element={
          <ProtectedRoute>
            <VisualMonitoringDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/prediction"
        element={
          <ProtectedRoute>
            <PredictionPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/testing"
        element={
          <ProtectedRoute>
            <TestingPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App