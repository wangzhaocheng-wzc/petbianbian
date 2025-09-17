import { ReactNode, useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Camera, BarChart3, Users, User, Menu, X, Heart, TrendingUp, Shield, GitCompare, LogOut } from 'lucide-react'
import { useMobile } from '../hooks/useMobile'
import { useAuth } from '../hooks/useAuth'
import MobileNavigation from './mobile/MobileNavigation'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { isMobile } = useMobile()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()

  const navigation = [
    { name: '首页', href: '/', icon: Home },
    { name: '便便分析', href: '/analysis', icon: Camera, requireAuth: true },
    { name: '我的宠物', href: '/pets', icon: Heart, requireAuth: true },
    { name: '健康记录', href: '/records', icon: BarChart3, requireAuth: true },
    { name: '数据统计', href: '/statistics', icon: TrendingUp, requireAuth: true },
    { name: '宠物对比', href: '/comparison', icon: GitCompare, requireAuth: true },
    { name: '宠物社区', href: '/community', icon: Users, requireAuth: true },
    { name: '个人中心', href: '/profile', icon: User, requireAuth: true },
    { name: '管理后台', href: '/admin', icon: Shield, requireAuth: true },
  ]

  // 过滤导航项：未认证用户只能看到首页
  const filteredNavigation = navigation.filter(item => 
    !item.requireAuth || isAuthenticated
  )

  // 移动端菜单打开时禁止背景滚动
  useEffect(() => {
    if (isMobileMenuOpen && isMobile) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen, isMobile])

  return (
    <div className="min-h-screen-safe bg-gray-50">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-40 pt-safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link 
                to="/" 
                className="text-lg sm:text-xl font-bold text-primary-600 truncate"
                onClick={() => setIsMobileMenuOpen(false)}
              >
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
              
              {/* 用户菜单 */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">{user?.username}</span>
                  <button
                    onClick={logout}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    退出
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    登录
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
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
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 touch:p-3 touch:bg-gray-50"
                aria-label={isMobileMenuOpen ? '关闭菜单' : '打开菜单'}
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
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              
              {/* Mobile Menu */}
              <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-50 md:hidden transform transition-transform duration-300 ease-in-out">
                <div className="flex flex-col h-full pt-safe-top">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b">
                    <span className="text-lg font-bold text-primary-600">菜单</span>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                      aria-label="关闭菜单"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {/* Navigation */}
                  <div className="flex-1 overflow-y-auto py-4">
                    <div className="space-y-1 px-2">
                      {filteredNavigation.map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.href
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center px-3 py-3 text-base font-medium rounded-lg transition-colors ${
                              isActive
                                ? 'text-primary-600 bg-primary-50'
                                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                            <span className="truncate">{item.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                    
                    {/* 移动端用户菜单 */}
                    <div className="mt-6 pt-6 border-t border-gray-200 px-2">
                      {isAuthenticated ? (
                        <div className="space-y-1">
                          <div className="flex items-center px-3 py-2 text-sm text-gray-700">
                            <User className="w-5 h-5 mr-3 flex-shrink-0" />
                            <span className="truncate">{user?.username}</span>
                          </div>
                          <button
                            onClick={() => {
                              logout()
                              setIsMobileMenuOpen(false)
                            }}
                            className="flex items-center w-full px-3 py-3 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <LogOut className="w-5 h-5 mr-3 flex-shrink-0" />
                            <span>退出登录</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Link
                            to="/login"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center px-3 py-3 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <User className="w-5 h-5 mr-3 flex-shrink-0" />
                            <span>登录</span>
                          </Link>
                          <Link
                            to="/register"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center px-3 py-3 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                          >
                            <User className="w-5 h-5 mr-3 flex-shrink-0" />
                            <span>注册</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </nav>
      
      <main className={`
        max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8 
        ${isMobile ? 'pb-20' : 'pb-safe-bottom'}
      `}>
        {children}
      </main>
      
      {/* 移动端底部导航 */}
      <MobileNavigation />
    </div>
  )
}