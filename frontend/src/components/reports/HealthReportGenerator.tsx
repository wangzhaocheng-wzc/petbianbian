import React, { useState } from 'react';
import { FileText, Download, Share, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import reportService from '../../services/reportService';

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
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const daysOptions = [
    { value: 7, label: '7天' },
    { value: 14, label: '14天' },
    { value: 30, label: '30天' },
    { value: 60, label: '60天' },
    { value: 90, label: '90天' }
  ];

  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await reportService.downloadHealthReportPDF(petId, days);
      setSuccess('PDF报告下载成功！');
    } catch (error: any) {
      console.error('下载PDF报告失败:', error);
      setError(error.response?.data?.message || '下载PDF报告失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const reportData = await reportService.getHealthReportData(petId, days);
      
      if (onReportGenerated) {
        onReportGenerated(reportData);
      }
      
      setSuccess('健康报告生成成功！');
    } catch (error: any) {
      console.error('生成健康报告失败:', error);
      setError(error.response?.data?.message || '生成健康报告失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAndSavePDF = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const result = await reportService.generateHealthReportPDF(petId, days);
      setSuccess(`PDF报告已生成并保存，可通过链接访问：${result.downloadUrl}`);
    } catch (error: any) {
      console.error('生成并保存PDF报告失败:', error);
      setError(error.response?.data?.message || '生成并保存PDF报告失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <FileText className="h-6 w-6 text-blue-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">生成健康报告</h3>
      </div>

      <div className="space-y-4">
        {/* 宠物信息 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">宠物</p>
          <p className="font-medium text-gray-900">{petName}</p>
        </div>

        {/* 时间范围选择 */}
        <div>
          <div className="flex items-center mb-3">
            <Calendar className="h-5 w-5 text-gray-500 mr-2" />
            <label className="text-sm font-medium text-gray-700">报告时间范围</label>
          </div>
          <div className="flex flex-wrap gap-2">
            {daysOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setDays(option.value)}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  days === option.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                }`}
              >
                {option.label}
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
            生成报告数据
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            ) : (
              <Download className="h-5 w-5 mr-2" />
            )}
            下载PDF报告
          </button>

          <button
            onClick={handleGenerateAndSavePDF}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            ) : (
              <Share className="h-5 w-5 mr-2" />
            )}
            生成并保存PDF
          </button>
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
          <h4 className="font-medium text-blue-900 mb-2">报告说明</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 生成报告数据：在页面中显示详细的健康分析数据</li>
            <li>• 下载PDF报告：直接下载PDF格式的健康报告文件</li>
            <li>• 生成并保存PDF：在服务器生成PDF文件，可通过链接分享</li>
            <li>• 报告包含健康统计、趋势分析、形状分布和专业建议</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HealthReportGenerator;