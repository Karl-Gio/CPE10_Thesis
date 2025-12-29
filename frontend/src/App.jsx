import { Routes, Route } from 'react-router-dom'
import Page from './component/Controled_Environment_Portal/Page'
import Login from './component/User/Login'
import Register from './component/User/Register'
import AgriVisionDashboard from './component/AgriVision/AgriVisionDashboard'

function App() {
  return (
      <Routes>
        <Route path="/dashboard" element={<Page />} />
        <Route path="/AgriDashboard" element={<AgriVisionDashboard />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Login />} />
      </Routes>
  )
}

export default App