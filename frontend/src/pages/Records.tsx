import { useState } from 'react'
import { Calendar, TrendingUp, Filter } from 'lucide-react'

interface Record {
  id: string
  date: string
  time: string
  healthStatus: 'healthy' | 'warning' | 'concerning'
  shape: string
  notes?: string
}

export default function Records() {
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  
  // 模拟数据
  const records: Record[] = [
    {
      id: '1',
      date: '2025-01-18',
      time: '08:30',
      healthStatus: 'healthy',
      shape: '类型4',
      notes: '正常'
    },
    {
      id: '2',
      date: '2025-01-17',
      time: '19:15',
      healthStatus: 'healthy',
      shape: '类型3',
    },
    {
      id: '3',
      date: '2025-01-17',
      time: '07:45',
      healthStatus: 'warning',
      shape: '类型2',
      notes: '稍微偏硬'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'concerning':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return '健康'
      case 'warning':
        return '注意'
      case 'concerning':
        return '异常'
      default:
        return '未知'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">健康记录</h1>
        <div className="flex space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="week">最近一周</option>
            <option value="month">最近一月</option>
            <option value="quarter">最近三月</option>
          </select>
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" />
            筛选
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">本周次数</p>
              <p className="text-2xl font-semibold text-gray-900">12</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">健康率</p>
              <p className="text-2xl font-semibold text-gray-900">85%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">!</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">需注意</p>
              <p className="text-2xl font-semibold text-gray-900">2</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">平均/天</p>
              <p className="text-2xl font-semibold text-gray-900">1.7</p>
            </div>
          </div>
        </div>
      </div>

      {/* 记录列表 */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">详细记录</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {records.map((record) => (
            <div key={record.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    {record.date} {record.time}
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.healthStatus)}`}>
                    {getStatusText(record.healthStatus)}
                  </span>
                  <div className="text-sm text-gray-900">
                    {record.shape}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {record.notes}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 趋势图占位 */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-medium text-gray-900 mb-4">健康趋势</h2>
        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">趋势图表（待集成图表库）</p>
        </div>
      </div>
    </div>
  )
}