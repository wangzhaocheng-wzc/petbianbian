import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Activity, BarChart3, Gauge, TrendingUp, Timer, Download, RefreshCcw, Search } from 'lucide-react';
import governanceService, { GovernanceAnalyticsResponse } from '../../services/governanceService';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';

type TimeRange = 'day' | 'week' | 'month';

const numberFmt = (n: number) => n.toLocaleString();

function exportJSON(filename: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function exportCSV(filename: string, rows: Array<Record<string, any>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => escape(r[h])).join(','))).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

const GovernanceAnalyticsPanel: React.FC = () => {
  const [range, setRange] = useState<TimeRange>('week');
  const [refreshMs, setRefreshMs] = useState<number>(60_000);
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<GovernanceAnalyticsResponse | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<Record<string, boolean>>({
    invalidRatio: true,
    uploadsPrefixAddedRatio: true,
    portRewriteRatio: false,
    relativeToAbsoluteRatio: false,
    protocolNormalizedRatio: false,
  });
  const [showDrilldown, setShowDrilldown] = useState<boolean>(false);

  const fetchData = async (r: TimeRange) => {
    setLoading(true);
    try {
      const resp = await governanceService.getDailyAnalytics(r);
      setData(resp);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(range);
  }, [range]);

  useEffect(() => {
    if (refreshMs <= 0) return;
    const t = setInterval(() => fetchData(range), refreshMs);
    return () => clearInterval(t);
  }, [range, refreshMs]);

  const progressChartData = useMemo(() => {
    return (data?.series.progress || []).map(p => ({
      date: p.date,
      处理量: p.processedCount,
      剩余量: p.remainingCount,
      完成率: +(p.completionPct * 100).toFixed(2)
    }));
  }, [data]);

  const qualityChartData = useMemo(() => {
    return (data?.series.quality || []).map(q => ({
      date: q.date,
      invalidRatio: +(q.invalidRatio * 100).toFixed(2),
      uploadsPrefixAddedRatio: +(q.uploadsPrefixAddedRatio * 100).toFixed(2),
      portRewriteRatio: +(q.portRewriteRatio * 100).toFixed(2),
      relativeToAbsoluteRatio: +(q.relativeToAbsoluteRatio * 100).toFixed(2),
      protocolNormalizedRatio: +(q.protocolNormalizedRatio * 100).toFixed(2)
    }));
  }, [data]);

  const performanceHeatmap = useMemo(() => {
    const byDay = data?.series.performance.modelDurationsByDay || {};
    const days = Object.keys(byDay).sort();
    const modelsSet = new Set<string>();
    days.forEach(d => Object.keys(byDay[d]).forEach(m => modelsSet.add(m)));
    const models = Array.from(modelsSet);
    const cells = days.map(d => models.map(m => byDay[d]?.[m] || 0));
    const max = Math.max(1, ...cells.flat());
    return { days, models, cells, max };
  }, [data]);

  const latestPreview = data?.breakdown.latestPreview;
  const remainingByModel = data?.breakdown.remainingByModel || {};

  const onExportSeries = () => {
    exportJSON(`governance-analytics-${range}.json`, data);
  };

  const onExportProgressCSV = () => {
    exportCSV(`governance-progress-${range}.csv`, (data?.series.progress || []).map(p => ({
      date: p.date,
      processedCount: p.processedCount,
      remainingCount: p.remainingCount,
      completionPct: +(p.completionPct * 100).toFixed(2)
    })));
  };

  const toggleMetric = (key: string) => {
    setSelectedMetrics(s => ({ ...s, [key]: !s[key] }));
  };

  return (
    <div className="space-y-6">
      {/* 控制条 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-5 h-5 text-gray-600"/>
          <select value={range} onChange={e => setRange(e.target.value as TimeRange)} className="border rounded px-2 py-1">
            <option value="day">日</option>
            <option value="week">周</option>
            <option value="month">月</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <RefreshCcw className="w-5 h-5 text-gray-600"/>
          <select value={refreshMs} onChange={e => setRefreshMs(parseInt(e.target.value))} className="border rounded px-2 py-1">
            <option value={0}>不自动刷新</option>
            <option value={30000}>30秒</option>
            <option value={60000}>1分钟</option>
            <option value={300000}>5分钟</option>
          </select>
        </div>
        <button onClick={() => fetchData(range)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded">
          <Search className="w-4 h-4"/>刷新
        </button>
        <div className="flex-1"/>
        <button onClick={onExportSeries} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-white rounded">
          <Download className="w-4 h-4"/>导出JSON
        </button>
        <button onClick={onExportProgressCSV} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded">
          <Download className="w-4 h-4"/>导出进度CSV
        </button>
      </div>

      {/* 1. 历史清理进度可视化 */}
      <section className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-5 h-5 text-indigo-600"/>
          <h3 className="font-semibold">历史清理进度</h3>
          {loading && <span className="text-xs text-gray-500">加载中…</span>}
        </div>
        <div className="w-full h-64">
          <ResponsiveContainer>
            <BarChart data={progressChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="处理量" fill="#4f46e5" />
              <Bar dataKey="剩余量" fill="#e5e7eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* 当前完成率进度条 */}
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">当前完成率</span>
            <span className="text-sm font-semibold">{progressChartData.length ? `${progressChartData[progressChartData.length - 1].完成率}%` : '--'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded h-2 mt-1">
            <div className="bg-indigo-600 h-2 rounded" style={{ width: `${progressChartData.length ? progressChartData[progressChartData.length - 1].完成率 : 0}%` }} />
          </div>
        </div>
      </section>

      {/* 2. 剩余待处理数量展示（仪表盘 + 钻取） */}
      <section className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="w-5 h-5 text-orange-600"/>
          <h3 className="font-semibold">剩余待处理数量</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(remainingByModel).map(([model, count]) => (
            <div key={model} className="border rounded p-3">
              <div className="text-xs text-gray-500">{model}</div>
              <div className="text-2xl font-bold">{numberFmt(count)}</div>
              <div className="text-xs text-gray-500">估计剩余</div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200" onClick={() => setShowDrilldown(v => !v)}>
            明细钻取
          </button>
        </div>
        {showDrilldown && latestPreview && (
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-2">最近预览（{latestPreview.totalCandidates}）按模型与原因分类</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">按模型</h4>
                <ul className="space-y-1 text-sm">
                  {Object.entries(latestPreview.byModel).map(([m, c]) => (
                    <li key={m} className="flex justify-between"><span>{m}</span><span className="font-mono">{numberFmt(c)}</span></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">按原因</h4>
                <ul className="space-y-1 text-sm">
                  {Object.entries(latestPreview.byReason).map(([r, c]) => (
                    <li key={r} className="flex justify-between"><span>{r}</span><span className="font-mono">{numberFmt(c)}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. 质量改善趋势分析（折线图，多指标对比） */}
      <section className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-green-600"/>
          <h3 className="font-semibold">质量改善趋势</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {Object.keys(selectedMetrics).map(k => (
            <label key={k} className="inline-flex items-center gap-1 text-sm">
              <input type="checkbox" checked={selectedMetrics[k]} onChange={() => toggleMetric(k)} />
              {k}
            </label>
          ))}
        </div>
        <div className="w-full h-64">
          <ResponsiveContainer>
            <LineChart data={qualityChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis unit="%" />
              <Tooltip />
              <Legend />
              {selectedMetrics.invalidRatio && <Line type="monotone" dataKey="invalidRatio" stroke="#ef4444" dot={false} name="invalid %" />}
              {selectedMetrics.uploadsPrefixAddedRatio && <Line type="monotone" dataKey="uploadsPrefixAddedRatio" stroke="#10b981" dot={false} name="uploads_prefix_added %" />}
              {selectedMetrics.portRewriteRatio && <Line type="monotone" dataKey="portRewriteRatio" stroke="#3b82f6" dot={false} name="port_rewrite %" />}
              {selectedMetrics.relativeToAbsoluteRatio && <Line type="monotone" dataKey="relativeToAbsoluteRatio" stroke="#f59e0b" dot={false} name="relative_to_absolute %" />}
              {selectedMetrics.protocolNormalizedRatio && <Line type="monotone" dataKey="protocolNormalizedRatio" stroke="#8b5cf6" dot={false} name="protocol_normalized %" />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 4. 性能监控模块（耗时热力图 + 排序 + 异常） */}
      <section className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="w-5 h-5 text-purple-600"/>
          <h3 className="font-semibold">批处理耗时监控</h3>
        </div>
        {/* 热力图 */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">日期 \ 模型</th>
                {performanceHeatmap.models.map(m => (
                  <th key={m} className="text-left p-2">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {performanceHeatmap.days.map((d, rowIdx) => (
                <tr key={d}>
                  <td className="p-2 font-mono text-xs">{d}</td>
                  {performanceHeatmap.models.map((m, colIdx) => {
                    const val = performanceHeatmap.cells[rowIdx][colIdx];
                    const intensity = Math.min(1, val / performanceHeatmap.max);
                    const bg = `rgba(79,70,229,${0.15 + 0.7*intensity})`;
                    return (
                      <td key={m} className="p-2" style={{ backgroundColor: bg }}>
                        <span className="font-mono">{Math.round(val)}ms</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 耗时排序与异常检测（简单阈值） */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Top慢模型</h4>
            <ul className="space-y-1">
              {(data?.series.performance.topSlowModels || []).slice(0, 10).map(item => (
                <li key={`${item.model}-${item.date}`} className="flex justify-between text-sm">
                  <span>{item.model}（{item.date}）</span>
                  <span className="font-mono">{Math.round(item.durationMs)}ms</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">异常检测</h4>
            <ul className="space-y-1 text-sm">
              {(data?.series.performance.topSlowModels || []).filter(i => i.durationMs > 5000).slice(0, 5).map(item => (
                <li key={`anomaly-${item.model}-${item.date}`} className="flex justify-between">
                  <span>疑似异常：{item.model}（{item.date}）</span>
                  <span className="text-red-600 font-mono">{Math.round(item.durationMs)}ms</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

    </div>
  );
};

export default GovernanceAnalyticsPanel;