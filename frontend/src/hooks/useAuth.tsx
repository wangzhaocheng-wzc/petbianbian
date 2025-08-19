import { useState, useEffect, createContext, useContext } from 'react'
import { ReactNode } from 'react'
import axios from 'axios'
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../../../shared/types'

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

// API 基础配置
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// 配置 axios 默认设置
axios.defaults.baseURL = API_BASE_URL

// 请求拦截器 - 添加认证令牌
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理令牌过期
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const response = await axios.post('/auth/refresh', {
            refreshToken
          })
          
          const { accessToken } = response.data.data.tokens
          localStorage.setItem('accessToken', accessToken)
          
          // 重试原始请求
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return axios(originalRequest)
        } catch (refreshError) {
          // 刷新令牌失败，清除所有令牌并重定向到登录页
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/login'
        }
      }
    }
    
    return Promise.reject(error)
  }
)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  // 初始化时检查本地存储的令牌
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken')
      if (token) {
        try {
          const response = await axios.get('/auth/me')
          setUser(response.data.data.user)
        } catch (error) {
          // 令牌无效，清除本地存储
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      setIsLoading(true)
      const response = await axios.post('/auth/login', credentials)
      const authData = response.data

      if (authData.success && authData.data) {
        const { user, tokens } = authData.data
        setUser(user)
        localStorage.setItem('accessToken', tokens.accessToken)
        localStorage.setItem('refreshToken', tokens.refreshToken)
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
      const response = await axios.post('/auth/register', userData)
      const authData = response.data

      if (authData.success && authData.data) {
        const { user, tokens } = authData.data
        setUser(user)
        localStorage.setItem('accessToken', tokens.accessToken)
        localStorage.setItem('refreshToken', tokens.refreshToken)
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
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    window.location.href = '/'
  }

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) return false

      const response = await axios.post('/auth/refresh', { refreshToken })
      const { accessToken } = response.data.data.tokens
      
      localStorage.setItem('accessToken', accessToken)
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