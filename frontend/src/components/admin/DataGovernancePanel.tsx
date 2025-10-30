import React, { useState } from 'react';
import { PlayCircle, Eye, CheckCircle, AlertTriangle } from 'lucide-react';
import governanceService, { GovernancePreviewResult, GovernanceExecuteResult } from '../../services/governanceService';

const DataGovernancePanel: React.FC = () => {
  const [limitPerModel, setLimitPerModel] = useState<number>(200);
  const [previewJobId, setPreviewJobId] = useState<string>('');
  const [preview, setPreview] = useState<GovernancePreviewResult | null>(null);
  const [executing, setExecuting] = useState<boolean>(false);
  const [executeResult, setExecuteResult] = useState<GovernanceExecuteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async () => {
    try {
      setError(null);
      setExecuteResult(null);
      const { jobId, result } = await governanceService.preview(limitPerModel);
      setPreviewJobId(jobId);
      setPreview(result);
    } catch (err: any) {
      setError(err?.message || '生成预览失败');
    }
  };

  const handleExecute = async () => {
    if (!previewJobId) return;
    try {
      setExecuting(true);
      setError(null);
      const result = await governanceService.execute(previewJobId);
      setExecuteResult(result);
    } catch (err: any) {
      setError(err?.message || '执行更新失败');
    } finally {
      setExecuting(false);
    }
  };

  const invalidCount = preview?.summary.byReason?.invalid || 0;
  const total = preview?.summary.totalCandidates || 0;
  const invalidPct = total ? (invalidCount / total) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-700">每模型预览上限</h3>
              <p className="text-xs text-gray-500">用于生成治理预览的采样上限</p>
            </div>
            <input
              type="number"
              value={limitPerModel}
              onChange={e => setLimitPerModel(parseInt(e.target.value) || 0)}
              className="w-24 border rounded px-2 py-1 text-sm"
              min={10}
              step={10}
            />
          </div>
          <button
            onClick={handlePreview}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700"
          >
            <Eye className="h-5 w-5 mr-2" /> 生成预览
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-700">预览统计</h3>
              <p className="text-xs text-gray-500">总计与分布</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-semibold text-gray-900">{preview?.summary.totalCandidates ?? '-'}</div>
              <div className="text-xs text-gray-500">候选总数</div>
            </div>
          </div>
          {preview && (
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-700 mb-2">按模型</div>
                {Object.entries(preview.summary.byModel).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-600">{k}</span>
                    <span className="text-gray-900">{v}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="font-medium text-gray-700 mb-2">按原因</div>
                {Object.entries(preview.summary.byReason).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-600">{k}</span>
                    <span className="text-gray-900">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-700">执行批量更新</h3>
              <p className="text-xs text-gray-500">预览确认后执行落库与报告</p>
            </div>
            <button
              onClick={handleExecute}
              disabled={!previewJobId || executing}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${previewJobId ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}
            >
              <PlayCircle className="h-5 w-5 mr-2" /> 执行更新
            </button>
          </div>
          {executeResult && (
            <div className="mt-4 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>更新成功条数</span>
                <span className="font-semibold text-green-700">{executeResult.updatedCount}</span>
              </div>
              <div className="flex justify-between">
                <span>失败条数</span>
                <span className="font-semibold text-red-700">{executeResult.failedCount}</span>
              </div>
              {executeResult.reportFile && (
                <div className="mt-2 text-xs text-gray-500">报告文件：{executeResult.reportFile}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {preview && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">预览变更明细（采样）</h3>
            {invalidPct > 0.1 && (
              <div className="flex items-center text-yellow-700">
                <AlertTriangle className="h-5 w-5 mr-2" />
                异常比例 {Math.round(invalidPct * 100)}% ，建议检查数据来源
              </div>
            )}
          </div>
          <div className="p-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">模型</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">字段</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">原因</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">原始值</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">修正值</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {preview.sampleChanges.map((c, idx) => (
                  <tr key={`${c.docId}-${c.field}-${idx}`}>
                    <td className="px-3 py-2 whitespace-nowrap">{c.model}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{c.field}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{c.reason}</td>
                    <td className="px-3 py-2 break-all text-gray-600">{c.original}</td>
                    <td className="px-3 py-2 break-all text-gray-900">{c.resolved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataGovernancePanel;