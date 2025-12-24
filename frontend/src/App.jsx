import { Routes, Route } from 'react-router-dom'
import Page from './component/controled_environment_portal/Page'
import Login from './component/User/Login'
import Register from './component/User/Register'

function App() {
  return (
      <Routes>
        <Route path="/dashboard" element={<Page />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Login />} />
      </Routes>
  )
}

export default App