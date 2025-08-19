import { Link } from 'react-router-dom'
import { Camera, BarChart3, Users } from 'lucide-react'

export default function Home() {
  const features = [
    {
      name: '便便健康分析',
      description: '上传宠物便便照片，AI智能分析健康状况',
      icon: Camera,
      href: '/analysis',
      color: 'bg-blue-500'
    },
    {
      name: '健康记录追踪',
      description: '记录和统计宠物排便情况，追踪健康趋势',
      icon: BarChart3,
      href: '/records',
      color: 'bg-green-500'
    },
    {
      name: '宠物社区',
      description: '与其他养宠人士分享经验，交流心得',
      icon: Users,
      href: '/community',
      color: 'bg-purple-500'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🐾 关爱宠物健康，从便便开始
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          通过AI智能分析，帮助您更好地了解宠物的健康状况
        </p>
        <Link
          to="/analysis"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <Camera className="w-5 h-5 mr-2" />
          开始分析
        </Link>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <Link
              key={feature.name}
              to={feature.href}
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.name}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </Link>
          )
        })}
      </div>

      {/* Stats */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-primary-600">1000+</div>
            <div className="text-gray-600">分析次数</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary-600">500+</div>
            <div className="text-gray-600">注册用户</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary-600">95%</div>
            <div className="text-gray-600">准确率</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary-600">24/7</div>
            <div className="text-gray-600">在线服务</div>
          </div>
        </div>
      </div>
    </div>
  )
}