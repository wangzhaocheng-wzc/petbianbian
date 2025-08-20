import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ComparisonAnalysis } from '../../services/statisticsService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ComparisonChartProps {
  comparison: ComparisonAnalysis;
  title?: string;
  height?: number;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({
  comparison,
  title = '周期对比分析',
  height = 300
}) => {
  const { currentPeriod, previousPeriod, changes } = comparison;

  const data = {
    labels: ['健康记录', '警告记录', '异常记录', '平均置信度', '每周频率'],
    datasets: [
      {
        label: `上个${currentPeriod.period === 'week' ? '周' : currentPeriod.period === 'month' ? '月' : '季度'}`,
        data: [
          previousPeriod.healthyPercentage,
          previousPeriod.warningPercentage,
          previousPeriod.concerningPercentage,
          previousPeriod.averageConfidence,
          previousPeriod.frequencyPerWeek
        ],
        backgroundColor: 'rgba(107, 114, 128, 0.6)',
        borderColor: 'rgb(107, 114, 128)',
        borderWidth: 2
      },
      {
        label: `当前${currentPeriod.period === 'week' ? '周' : currentPeriod.period === 'month' ? '月' : '季度'}`,
        data: [
          currentPeriod.healthyPercentage,
          currentPeriod.warningPercentage,
          currentPeriod.concerningPercentage,
          currentPeriod.averageConfidence,
          currentPeriod.frequencyPerWeek
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold' as const
        },
        padding: {
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          afterBody: (context: any) => {
            const index = context[0].dataIndex;
            const changeValues = [
              changes.healthyChange,
              changes.warningChange,
              changes.concerningChange,
              changes.confidenceChange,
              changes.frequencyChange
            ];
            const change = changeValues[index];
            const changeText = change > 0 ? `↗ +${change.toFixed(1)}` : change < 0 ? `↘ ${change.toFixed(1)}` : '→ 0';
            const units = ['%', '%', '%', '%', '次/周'];
            return `变化: ${changeText}${units[index]}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '指标类型',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          font: {
            size: 10
          }
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: '数值',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    elements: {
      bar: {
        borderRadius: 4
      }
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '📈';
      case 'declining':
        return '📉';
      default:
        return '📊';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '改善中';
      case 'declining':
        return '需要关注';
      default:
        return '保持稳定';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div style={{ height }}>
        <Bar data={data} options={options} />
      </div>
      
      {/* 趋势总结 */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getTrendIcon(comparison.trend)}</span>
            <span className={`font-semibold ${getTrendColor(comparison.trend)}`}>
              总体趋势：{getTrendText(comparison.trend)}
            </span>
          </div>
        </div>
        
        {comparison.significantChanges.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-medium text-gray-700 mb-1">显著变化：</p>
            <ul className="text-sm text-gray-600 space-y-1">
              {comparison.significantChanges.map((change, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-orange-500 mr-1">•</span>
                  {change}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {comparison.significantChanges.length === 0 && (
          <p className="text-sm text-gray-600">
            各项指标变化不大，宠物健康状况相对稳定。
          </p>
        )}
      </div>
    </div>
  );
};

export default ComparisonChart;