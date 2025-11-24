import { Link } from 'react-router-dom'
import { Camera, BarChart3, Users } from 'lucide-react'
import { useI18n } from '../i18n/I18nProvider'

export default function Home() {
  const { t } = useI18n()
  const features = [
    {
      name: t('home.features.analysis.name'),
      description: t('home.features.analysis.description'),
      icon: Camera,
      href: '/analysis',
      color: 'bg-blue-500'
    },
    {
      name: t('home.features.records.name'),
      description: t('home.features.records.description'),
      icon: BarChart3,
      href: '/records',
      color: 'bg-green-500'
    },
    {
      name: t('home.features.community.name'),
      description: t('home.features.community.description'),
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
          {t('home.hero.title')}
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          {t('home.hero.subtitle')}
        </p>
        <Link
          to="/analysis"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <Camera className="w-5 h-5 mr-2" />
          {t('home.hero.cta')}
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
            <div className="text-gray-600">{t('home.stats.analysisCount')}</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary-600">500+</div>
            <div className="text-gray-600">{t('home.stats.registeredUsers')}</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary-600">95%</div>
            <div className="text-gray-600">{t('home.stats.accuracy')}</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary-600">24/7</div>
            <div className="text-gray-600">{t('home.stats.onlineService')}</div>
          </div>
        </div>
      </div>
    </div>
  )
}