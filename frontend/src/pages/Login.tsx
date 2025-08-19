import LoginForm from '../components/auth/LoginForm'
import ProtectedRoute from '../components/auth/ProtectedRoute'

export default function Login() {
  return (
    <ProtectedRoute requireAuth={false}>
      <LoginForm />
    </ProtectedRoute>
  )
}