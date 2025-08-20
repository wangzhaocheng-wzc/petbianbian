import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { HealthTrendPoint } from '../../services/statisticsService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface HealthTrendChartProps {
  data: HealthTrendPoint[];
  title?: string;
  height?: number;
  showPercentage?: boolean;
}

const HealthTrendChart: React.FC<HealthTrendChartProps> = ({
  data,
  title = '健康趋势',
  height = 300,
  showPercentage = false
}) => {
  const chartData = {
    labels: data.map(point => {
      const date = new Date(point.date);
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: '健康',
        data: data.map(point => showPercentage ? point.healthyPercentage : point.healthy),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: '警告',
        data: data.map(point => showPercentage ? point.warningPercentage : point.warning),
        borderColor: 'rgb(251, 191, 36)',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: '异常',
        data: data.map(point => showPercentage ? point.concerningPercentage : point.concerning),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
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
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          title: (context: any) => {
            const index = context[0].dataIndex;
            const date = new Date(data[index].date);
            return date.toLocaleDateString('zh-CN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
          },
          afterBody: (context: any) => {
            const index = context[0].dataIndex;
            const point = data[index];
            return [
              '',
              `总记录数: ${point.total}`,
              showPercentage ? '' : `健康率: ${point.healthyPercentage}%`
            ].filter(Boolean);
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '日期',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          display: false
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: showPercentage ? '百分比 (%)' : '记录数量',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        beginAtZero: true,
        max: showPercentage ? 100 : undefined,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value: any) {
            return showPercentage ? `${value}%` : value;
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    },
    elements: {
      point: {
        hoverBackgroundColor: 'white',
        hoverBorderWidth: 2
      }
    }
  };

  if (data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        style={{ height }}
      >
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">📊</div>
          <p className="text-gray-500">暂无趋势数据</p>
          <p className="text-gray-400 text-sm">需要更多记录来生成趋势图</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div style={{ height }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default HealthTrendChart;