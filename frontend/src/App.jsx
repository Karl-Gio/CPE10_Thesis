import { Routes, Route } from 'react-router-dom'
import Page from './component/controled_environment_portal/Page'

function App() {
  return (
    <div className="App">
      <Routes>
        {/* When URL is /, show Dashboard */}
        <Route path="/" element={<Page />} />
      </Routes>
    </div>
  )
}

export default App