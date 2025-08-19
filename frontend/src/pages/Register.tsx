import RegisterForm from '../components/auth/RegisterForm'
import ProtectedRoute from '../components/auth/ProtectedRoute'

export default function Register() {
  return (
    <ProtectedRoute requireAuth={false}>
      <RegisterForm />
    </ProtectedRoute>
  )
}