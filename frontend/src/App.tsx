import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import PoopAnalysis from './pages/PoopAnalysis'
import Records from './pages/Records'
import Community from './pages/Community'
import Profile from './pages/Profile'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/analysis" element={<PoopAnalysis />} />
        <Route path="/records" element={<Records />} />
        <Route path="/community" element={<Community />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Layout>
  )
}

export default App