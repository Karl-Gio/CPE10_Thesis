import { Routes, Route } from 'react-router-dom'
import Login from './component/User/Login'
import Register from './component/User/Register'
import DashboardPage from './component/System_Dashboard/DashboardPage'
import VisualMonitoringDashboard from './component/Visual_Monitoring/VisualMonitoringDashboard'
import ParametersPage from './component/System_Configuration/ParametersPage'
import PredictionPage from './component/Growth Analytics_&_Prediction/PredictionPage'
import TestingPage from './component/Testing/TestingPage'

function App() {
  return (
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/parameters" element={<ParametersPage />} />
        <Route path="/validation" element={<VisualMonitoringDashboard />} />
        <Route path="/prediction" element={<PredictionPage />} />
        <Route path="/testing" element={<TestingPage />} />
      </Routes>
  )
}

export default App