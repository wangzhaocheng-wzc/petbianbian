import { useState, useEffect, createContext, useContext } from 'react'
import { ReactNode } from 'react'
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../../../shared/types'
import { tokenManager } from '../utils/helpers'
import { apiClient } from '../services/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginRequest) => Promise<AuthResponse>
  register: (userData: RegisterRequest) => Promise<AuthResponse>
  logout: () => void
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  // 初始化时检查本地存储的令牌
  useEffect(() => {
    const initAuth = async () => {
      const token = tokenManager.getAccessToken()
      const refreshToken = tokenManager.getRefreshToken()
      
      if (token && refreshToken) {
        try {
          const response = await apiClient.get('/auth/me')
          setUser(response.data.user)
        } catch (error: any) {
          if (error.response?.status === 401 || error.response?.status === 403) {
            tokenManager.clearTokens()
            setUser(null)
          }
        }
      }
      setIsLoading(false)
    }

    // 监听认证状态变化事件
    const handleAuthLogout = () => {
      setUser(null)
      setIsLoading(false)
    }

    window.addEventListener('auth-logout', handleAuthLogout)
    initAuth()

    return () => {
      window.removeEventListener('auth-logout', handleAuthLogout)
    }
  }, [])

  const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      setIsLoading(true)
      const response = await apiClient.post('/auth/login', credentials)
      const authData = response

      if (authData.success && authData.data) {
        const { user, tokens } = authData.data
        setUser(user)
        tokenManager.setAccessToken(tokens.access_token)
        tokenManager.setRefreshToken(tokens.refresh_token)
      }

      return authData
    } catch (error: any) {
      const errorResponse: AuthResponse = {
        success: false,
        message: error.response?.data?.message || '登录失败',
        errors: error.response?.data?.errors
      }
      return errorResponse
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (userData: RegisterRequest): Promise<AuthResponse> => {
    try {
      setIsLoading(true)
      const response = await apiClient.post('/auth/register', userData)
      const authData = response

      if (authData.success && authData.data) {
        const { user, tokens } = authData.data
        setUser(user)
        tokenManager.setAccessToken(tokens.access_token)
        tokenManager.setRefreshToken(tokens.refresh_token)
      }

      return authData
    } catch (error: any) {
      const errorResponse: AuthResponse = {
        success: false,
        message: error.response?.data?.message || '注册失败',
        errors: error.response?.data?.errors
      }
      return errorResponse
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    tokenManager.clearTokens()
    window.dispatchEvent(new CustomEvent('auth-logout'))
  }

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = tokenManager.getRefreshToken()
      if (!refreshToken) return false

      const response = await apiClient.post('/auth/refresh', { refreshToken })
      const { access_token } = response.data.tokens

      tokenManager.setAccessToken(access_token)
      return true
    } catch (error) {
      logout()
      return false
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}