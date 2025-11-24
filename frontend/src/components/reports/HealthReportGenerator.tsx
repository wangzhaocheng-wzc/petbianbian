import React, { useState } from 'react';
import { FileText, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import reportService from '../../services/reportService';
import { useI18n } from '../../i18n/I18nProvider';

interface HealthReportGeneratorProps {
  petId: string;
  petName: string;
  onReportGenerated?: (reportData: any) => void;
}

const HealthReportGenerator: React.FC<HealthReportGeneratorProps> = ({
  petId,
  petName,
  onReportGenerated
}) => {
  const { t, language } = useI18n();
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const daysOptions = [7, 14, 30, 60, 90];

  // 下载PDF功能已移除

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const reportData = await reportService.getHealthReportData(petId, days);
      
      if (onReportGenerated) {
        onReportGenerated(reportData);
      }
      
      setSuccess(t('reports.generator.successGenerated'));
    } catch (error: any) {
      console.error('生成健康报告失败:', error);
      setError(error.response?.data?.message || t('reports.generator.errorGenerating'));
    } finally {
      setLoading(false);
    }
  };

  // 生成并保存PDF功能已移除

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <FileText className="h-6 w-6 text-blue-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">{t('reports.generator.title')}</h3>
      </div>

      <div className="space-y-4">
        {/* 宠物信息 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">{t('reports.generator.petLabel')}</p>
          <p className="font-medium text-gray-900">{petName}</p>
        </div>

        {/* 时间范围选择 */}
        <div>
          <div className="flex items-center mb-3">
            <Calendar className="h-5 w-5 text-gray-500 mr-2" />
            <label className="text-sm font-medium text-gray-700">{t('reports.generator.reportRange')}</label>
          </div>
          <div className="flex flex-wrap gap-2">
            {daysOptions.map(option => (
              <button
                key={option}
                onClick={() => setDays(option)}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  days === option
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                }`}
              >
                {language === 'zh' ? `${option}${t('reports.generator.daysSuffix')}` : `${option} ${t('reports.generator.daysSuffix')}`}
              </button>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-3">
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            ) : (
              <FileText className="h-5 w-5 mr-2" />
            )}
            {t('reports.generator.generateData')}
          </button>

          {/* 下载PDF功能已移除 */}

          {/* 生成并保存PDF功能已移除 */}
        </div>

        {/* 成功提示 */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* 说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">{t('reports.generator.guideTitle')}</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>{t('reports.generator.guideGenerateData')}</li>
            {/* 相关PDF说明已移除 */}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HealthReportGenerator;
