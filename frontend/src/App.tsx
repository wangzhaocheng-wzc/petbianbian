import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import Layout from './components/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import PoopAnalysis from './pages/PoopAnalysis'
import Records from './pages/Records'
import Community from './pages/Community'
import Profile from './pages/Profile'
import Pets from './pages/Pets'
import Statistics from './pages/Statistics'
import Debug from './pages/Debug'

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/debug" element={<Debug />} />
          <Route 
            path="/analysis" 
            element={
              <ProtectedRoute>
                <PoopAnalysis />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/records" 
            element={
              <ProtectedRoute>
                <Records />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/pets" 
            element={
              <ProtectedRoute>
                <Pets />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/statistics" 
            element={
              <ProtectedRoute>
                <Statistics />
              </ProtectedRoute>
            } 
          />
          <Route path="/community" element={<Community />} />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Layout>
    </AuthProvider>
  )
}

export default App