import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Camera, BarChart3, Users, User, LogOut, Menu, X, Heart, TrendingUp, Shield } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigation = [
    { name: '首页', href: '/', icon: Home, requireAuth: false },
    { name: '便便分析', href: '/analysis', icon: Camera, requireAuth: true },
    { name: '我的宠物', href: '/pets', icon: Heart, requireAuth: true },
    { name: '健康记录', href: '/records', icon: BarChart3, requireAuth: true },
    { name: '数据统计', href: '/statistics', icon: TrendingUp, requireAuth: true },
    { name: '宠物社区', href: '/community', icon: Users, requireAuth: false },
    { name: '个人中心', href: '/profile', icon: User, requireAuth: true },
    { name: '管理后台', href: '/admin', icon: Shield, requireAuth: true, requireRole: 'admin' },
  ]

  // 根据认证状态和角色过滤导航项
  const filteredNavigation = navigation.filter(item => {
    // 如果不需要认证，直接显示
    if (!item.requireAuth) return true
    
    // 如果需要认证但用户未登录，不显示
    if (!isAuthenticated) return false
    
    // 如果需要特定角色但用户角色不匹配，不显示
    if (item.requireRole && user?.role !== item.requireRole) return false
    
    return true
  })

  const handleLogout = () => {
    logout()
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-primary-600">
                🐾 宠物健康助手
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:space-x-8">
              {filteredNavigation.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                      isActive
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}

              {/* User Menu */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    欢迎，{user?.username}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-500 hover:text-gray-700"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    退出
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/login"
                    className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
                  >
                    登录
                  </Link>
                  <Link
                    to="/register"
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    注册
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                {isMobileMenuOpen ? (
                  <X className="block h-6 w-6" />
                ) : (
                  <Menu className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden">
              <div className="pt-2 pb-3 space-y-1">
                {filteredNavigation.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block pl-3 pr-4 py-2 text-base font-medium ${
                        isActive
                          ? 'text-primary-600 bg-primary-50 border-r-4 border-primary-600'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Mobile User Menu */}
              <div className="pt-4 pb-3 border-t border-gray-200">
                {isAuthenticated ? (
                  <div className="space-y-1">
                    <div className="px-4 py-2">
                      <div className="text-base font-medium text-gray-800">
                        {user?.username}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user?.email}
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <LogOut className="w-5 h-5 mr-3" />
                        退出登录
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Link
                      to="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    >
                      登录
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-4 py-2 text-base font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                    >
                      注册
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}