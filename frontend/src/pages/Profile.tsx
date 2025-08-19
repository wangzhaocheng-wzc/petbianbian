import { useState } from 'react'
import { PlusCircle, Edit3 } from 'lucide-react'

interface Pet {
  id: string
  name: string
  type: string
  breed: string
  age: number
  weight: number
  avatar: string
}

export default function Profile() {
  const [activeTab, setActiveTab] = useState('pets')
  
  // 模拟用户数据
  const user = {
    name: '张三',
    email: 'zhangsan@example.com',
    avatar: '👤',
    joinDate: '2024-01-15',
    totalAnalysis: 45,
    totalPosts: 12
  }

  // 模拟宠物数据
  const pets: Pet[] = [
    {
      id: '1',
      name: '豆豆',
      type: '狗',
      breed: '金毛',
      age: 3,
      weight: 28.5,
      avatar: '🐕'
    },
    {
      id: '2',
      name: '咪咪',
      type: '猫',
      breed: '英短',
      age: 2,
      weight: 4.2,
      avatar: '🐱'
    }
  ]

  const tabs = [
    { id: 'pets', name: '我的宠物' },
    { id: 'settings', name: '账户设置' }
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 用户信息卡片 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-3xl">
            {user.avatar}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-gray-600">{user.email}</p>
            <p className="text-sm text-gray-500">加入时间：{user.joinDate}</p>
          </div>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Edit3 className="w-4 h-4 mr-2" />
            编辑资料
          </button>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary-600">{user.totalAnalysis}</div>
            <div className="text-sm text-gray-600">分析次数</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary-600">{pets.length}</div>
            <div className="text-sm text-gray-600">宠物数量</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary-600">{user.totalPosts}</div>
            <div className="text-sm text-gray-600">社区发帖</div>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'pets' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">我的宠物</h2>
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  添加宠物
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pets.map((pet) => (
                  <div key={pet.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                        {pet.avatar}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{pet.name}</h3>
                        <p className="text-sm text-gray-600">{pet.breed} · {pet.age}岁</p>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">类型：</span>
                        <span className="text-gray-900">{pet.type}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">体重：</span>
                        <span className="text-gray-900">{pet.weight}kg</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">账户设置</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    用户名
                  </label>
                  <input
                    type="text"
                    defaultValue={user.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    邮箱
                  </label>
                  <input
                    type="email"
                    defaultValue={user.email}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    密码
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div className="pt-4">
                  <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
                    保存设置
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}