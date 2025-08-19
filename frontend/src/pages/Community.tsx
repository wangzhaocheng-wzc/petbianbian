import { useState } from 'react'
import { Heart, MessageCircle, Share2, Plus, Search } from 'lucide-react'

interface Post {
  id: string
  user: {
    name: string
    avatar: string
  }
  pet: {
    name: string
    type: string
  }
  title: string
  content: string
  images: string[]
  likes: number
  comments: number
  timeAgo: string
  tags: string[]
}

export default function Community() {
  const [activeTab, setActiveTab] = useState('all')
  
  // 模拟数据
  const posts: Post[] = [
    {
      id: '1',
      user: {
        name: '小王',
        avatar: '👤'
      },
      pet: {
        name: '豆豆',
        type: '金毛'
      },
      title: '豆豆今天的便便很健康！',
      content: '分享一下豆豆今天的便便分析结果，医生说很健康。想问问大家平时都给狗狗吃什么保持肠道健康的？',
      images: ['🐕'],
      likes: 23,
      comments: 8,
      timeAgo: '2小时前',
      tags: ['健康分享', '金毛', '肠道健康']
    },
    {
      id: '2',
      user: {
        name: '猫咪妈妈',
        avatar: '👩'
      },
      pet: {
        name: '咪咪',
        type: '英短'
      },
      title: '新手养猫求助',
      content: '刚养了一只小猫，不太会看便便是否正常，有经验的朋友能分享一下吗？',
      images: ['🐱'],
      likes: 15,
      comments: 12,
      timeAgo: '4小时前',
      tags: ['新手求助', '英短', '健康咨询']
    }
  ]

  const tabs = [
    { id: 'all', name: '全部', count: 156 },
    { id: 'health', name: '健康分享', count: 89 },
    { id: 'help', name: '求助问答', count: 45 },
    { id: 'experience', name: '经验分享', count: 22 }
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">宠物社区</h1>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
          <Plus className="w-4 h-4 mr-2" />
          发布动态
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="搜索社区内容..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
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
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* 帖子列表 */}
        <div className="divide-y divide-gray-200">
          {posts.map((post) => (
            <div key={post.id} className="p-6">
              <div className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    {post.user.avatar}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <p className="text-sm font-medium text-gray-900">
                      {post.user.name}
                    </p>
                    <span className="text-gray-500">·</span>
                    <p className="text-sm text-gray-500">
                      {post.pet.name}（{post.pet.type}）
                    </p>
                    <span className="text-gray-500">·</span>
                    <p className="text-sm text-gray-500">
                      {post.timeAgo}
                    </p>
                  </div>
                  
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {post.title}
                  </h3>
                  
                  <p className="text-gray-700 mb-3">
                    {post.content}
                  </p>
                  
                  {post.images.length > 0 && (
                    <div className="flex space-x-2 mb-3">
                      {post.images.map((image, index) => (
                        <div key={index} className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                          {image}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <button className="flex items-center space-x-1 hover:text-red-500">
                      <Heart className="w-4 h-4" />
                      <span>{post.likes}</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:text-blue-500">
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments}</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:text-green-500">
                      <Share2 className="w-4 h-4" />
                      <span>分享</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}