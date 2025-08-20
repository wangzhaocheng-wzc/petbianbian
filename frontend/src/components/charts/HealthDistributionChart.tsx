import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface HealthDistributionChartProps {
  healthyCount: number;
  warningCount: number;
  concerningCount: number;
  title?: string;
  size?: number;
  showLegend?: boolean;
}

const HealthDistributionChart: React.FC<HealthDistributionChartProps> = ({
  healthyCount,
  warningCount,
  concerningCount,
  title = '健康状态分布',
  size = 200,
  showLegend = true
}) => {
  const total = healthyCount + warningCount + concerningCount;

  const data = {
    labels: ['健康', '警告', '异常'],
    datasets: [
      {
        data: [healthyCount, warningCount, concerningCount],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // 绿色 - 健康
          'rgba(251, 191, 36, 0.8)',  // 黄色 - 警告
          'rgba(239, 68, 68, 0.8)'    // 红色 - 异常
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(251, 191, 36)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(34, 197, 94, 0.9)',
          'rgba(251, 191, 36, 0.9)',
          'rgba(239, 68, 68, 0.9)'
        ],
        hoverBorderWidth: 3
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          },
          generateLabels: (chart: any) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, i: number) => {
                const value = data.datasets[0].data[i];
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return {
                  text: `${label}: ${value} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor[i],
                  lineWidth: data.datasets[0].borderWidth,
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
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
          label: (context: any) => {
            const value = context.parsed;
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${context.label}: ${value} 次 (${percentage}%)`;
          },
          afterLabel: () => {
            return `总计: ${total} 次`;
          }
        }
      }
    },
    cutout: '60%', // 创建甜甜圈效果
    elements: {
      arc: {
        borderWidth: 2
      }
    }
  };

  if (total === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        {title && (
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
            {title}
          </h3>
        )}
        <div 
          className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
          style={{ height: size }}
        >
          <div className="text-center">
            <div className="text-gray-400 text-lg mb-2">📊</div>
            <p className="text-gray-500">暂无数据</p>
            <p className="text-gray-400 text-sm">开始记录以查看分布</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
          {title}
        </h3>
      )}
      <div className="relative" style={{ height: size }}>
        <Doughnut data={data} options={options} />
        {/* 中心显示总数 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{total}</div>
            <div className="text-sm text-gray-500">总记录</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthDistributionChart;