import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Camera, BarChart3, Users, User, Heart, GitCompare } from 'lucide-react'
import { useSwipeGesture } from '../../hooks/useMobile'
import { useAuth } from '../../hooks/useAuth'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  requireAuth?: boolean
}

export default function MobileNavigation() {
  const location = useLocation()
  const [isVisible, setIsVisible] = useState(true)
  const { isAuthenticated } = useAuth()

  const navigation: NavigationItem[] = [
    { name: '首页', href: '/', icon: Home },
    { name: '分析', href: '/analysis', icon: Camera, requireAuth: true },
    { name: '宠物', href: '/pets', icon: Heart, requireAuth: true },
    { name: '记录', href: '/records', icon: BarChart3, requireAuth: true },
    { name: '对比', href: '/comparison', icon: GitCompare, requireAuth: true },
    { name: '社区', href: '/community', icon: Users, requireAuth: true },
    { name: '我的', href: '/profile', icon: User, requireAuth: true },
  ]

  // 过滤导航项：未认证用户只能看到首页
  const filteredNavigation = navigation.filter(item => 
    !item.requireAuth || isAuthenticated
  )

  // 如果没有认证，添加登录按钮到导航中
  const displayNavigation: NavigationItem[] = isAuthenticated 
    ? filteredNavigation.slice(0, 5)
    : [
        ...filteredNavigation,
        { name: '登录', href: '/login', icon: User },
        { name: '注册', href: '/register', icon: User }
      ].slice(0, 5)

  // 手势控制导航栏显示/隐藏
  useSwipeGesture(
    undefined, // onSwipeLeft
    undefined, // onSwipeRight
    () => setIsVisible(false), // onSwipeUp - 向上滑动隐藏
    () => setIsVisible(true)   // onSwipeDown - 向下滑动显示
  )

  return (
    <nav 
      className={`
        fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 pb-safe-bottom
        transform transition-transform duration-300 ease-in-out
        ${isVisible ? 'translate-y-0' : 'translate-y-full'}
        md:hidden
      `}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {displayNavigation.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex flex-col items-center justify-center px-2 py-2 min-w-[60px] rounded-lg
                transition-colors duration-200 relative
                ${isActive 
                  ? 'text-orange-600 bg-orange-50' 
                  : 'text-gray-500 hover:text-gray-700 active:bg-gray-100'
                }
              `}
            >
              <div className="relative">
                <Icon className="w-6 h-6 mb-1" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium leading-none">
                {item.name}
              </span>
              
              {/* 活跃状态指示器 */}
              {isActive && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-orange-600 rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}