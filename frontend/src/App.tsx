import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './hooks/useAuth'
import Layout from './components/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import LoadingSpinner from './components/common/LoadingSpinner'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import OfflineIndicator from './components/OfflineIndicator'
import PWAUpdateNotification from './components/PWAUpdateNotification'

// 懒加载页面组件
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const PoopAnalysis = lazy(() => import('./pages/PoopAnalysis'))
const Records = lazy(() => import('./pages/Records'))
const Community = lazy(() => import('./pages/Community'))
const Profile = lazy(() => import('./pages/Profile'))
const Pets = lazy(() => import('./pages/Pets'))
const Statistics = lazy(() => import('./pages/Statistics'))
const PetComparison = lazy(() => import('./pages/PetComparison'))
const Debug = lazy(() => import('./pages/Debug'))
const Admin = lazy(() => import('./pages/Admin'))

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Suspense fallback={<LoadingSpinner />}>
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
            <Route 
              path="/comparison" 
              element={
                <ProtectedRoute>
                  <PetComparison />
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
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Suspense>
      </Layout>
      
      {/* PWA Components */}
      <OfflineIndicator />
      <PWAInstallPrompt />
      <PWAUpdateNotification />
    </AuthProvider>
  )
}

export default App