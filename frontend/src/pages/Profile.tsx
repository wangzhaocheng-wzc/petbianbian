import { useState } from 'react'
import { PlusCircle, Edit3 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { usePets } from '../hooks/usePets'
import PetForm from '../components/PetForm'
import { Pet } from '../../../shared/types'
import { useI18n } from '../i18n/I18nProvider'



export default function Profile() {
  const { t, language } = useI18n()
  const [activeTab, setActiveTab] = useState('pets')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPet, setEditingPet] = useState<Pet | null>(null)
  const { user, isLoading: authLoading } = useAuth()
  const { pets, loading: petsLoading, createPet, updatePet } = usePets()

  // 处理添加宠物
  const handleAddPet = () => {
    setEditingPet(null)
    setIsFormOpen(true)
  }

  // 处理表单提交
  const handleFormSubmit = async (data: any) => {
    if (editingPet) {
      return await updatePet(editingPet.id, data)
    } else {
      return await createPet(data)
    }
  }

  // 处理表单关闭
  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingPet(null)
  }

  // 如果用户信息还在加载中
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // 如果没有用户信息，显示错误状态
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">{t('profile.errorNoUser')}</p>
        </div>
      </div>
    )
  }

  // 格式化加入日期
  const formatJoinDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')
  }

  const tabs = [
    { id: 'pets', name: t('profile.tabs.myPets') },
    { id: 'settings', name: t('profile.tabs.account') }
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 用户信息卡片 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-3xl">
            {user.avatar || '👤'}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{user.username}</h1>
            <p className="text-gray-600">{user.email}</p>
            <p className="text-sm text-gray-500">{t('profile.joinedAt')}: {formatJoinDate(user.createdAt)}</p>
          </div>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Edit3 className="w-4 h-4 mr-2" />
            {t('profile.editProfile')}
          </button>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{user.stats.totalAnalysis}</div>
            <div className="text-sm text-gray-600">{t('profile.stats.analysisCount')}</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{pets.length}</div>
            <div className="text-sm text-gray-600">{t('profile.stats.petCount')}</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{user.stats.totalPosts}</div>
            <div className="text-sm text-gray-600">{t('profile.stats.posts')}</div>
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
                    ? 'border-orange-500 text-orange-600'
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
                <h2 className="text-lg font-medium text-gray-900">{t('profile.myPetsTitle')}</h2>
                <button 
                  onClick={handleAddPet}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  {t('profile.addPet')}
                </button>
              </div>
              
              {petsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">{t('profile.loadingPets')}</p>
                </div>
              ) : pets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">{t('profile.noPets')}</p>
                  <button 
                    onClick={handleAddPet}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    {t('profile.addFirstPet')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pets.map((pet) => (
                    <div key={pet.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          {pet.avatar ? (
                            <img src={pet.avatar} alt={pet.name} className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <span className="text-2xl">
                              {pet.type === 'dog' ? '🐕' : pet.type === 'cat' ? '🐱' : '🐾'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">{pet.name}</h3>
                          <p className="text-sm text-gray-600">
                            {pet.breed || t('profile.unknownBreed')} · {pet.age ? `${Math.floor(pet.age / 12)}${t('petInfo.ageYears')}` : t('profile.unknownAge')}
                          </p>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">{t('petInfo.type')}：</span>
                          <span className="text-gray-900 capitalize">{pet.type}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('petInfo.weight')}：</span>
                          <span className="text-gray-900">{pet.weight ? `${pet.weight}${t('petInfo.weightUnit')}` : t('petInfo.unknown')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">{t('profile.accountSettings')}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.fields.username')}
                  </label>
                  <input
                    type="text"
                    defaultValue={user.username}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.fields.email')}
                  </label>
                  <input
                    type="email"
                    defaultValue={user.email}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.fields.password')}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div className="pt-4">
                  <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700">
                    {t('profile.saveSettings')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 宠物表单模态框 */}
      <PetForm
        pet={editingPet}
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        loading={petsLoading}
      />
    </div>
  )
}