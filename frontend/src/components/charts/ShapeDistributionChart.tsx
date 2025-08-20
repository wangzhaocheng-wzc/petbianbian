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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ShapeDistributionChartProps {
  shapeDistribution: { [key: string]: number };
  title?: string;
  height?: number;
  horizontal?: boolean;
}

const ShapeDistributionChart: React.FC<ShapeDistributionChartProps> = ({
  shapeDistribution,
  title = '便便形状分布',
  height = 300,
  horizontal = false
}) => {
  const shapeDescriptions: { [key: string]: string } = {
    type1: '第1型 - 硬球状',
    type2: '第2型 - 块状',
    type3: '第3型 - 裂纹香肠状',
    type4: '第4型 - 光滑香肠状',
    type5: '第5型 - 软块状',
    type6: '第6型 - 糊状',
    type7: '第7型 - 水状'
  };

  const shapeColors: { [key: string]: string } = {
    type1: 'rgba(139, 69, 19, 0.8)',    // 深棕色 - 硬球状
    type2: 'rgba(160, 82, 45, 0.8)',    // 棕色 - 块状
    type3: 'rgba(210, 180, 140, 0.8)',  // 浅棕色 - 裂纹香肠状
    type4: 'rgba(34, 197, 94, 0.8)',    // 绿色 - 理想状态
    type5: 'rgba(251, 191, 36, 0.8)',   // 黄色 - 软块状
    type6: 'rgba(249, 115, 22, 0.8)',   // 橙色 - 糊状
    type7: 'rgba(239, 68, 68, 0.8)'     // 红色 - 水状
  };

  const shapeBorderColors: { [key: string]: string } = {
    type1: 'rgb(139, 69, 19)',
    type2: 'rgb(160, 82, 45)',
    type3: 'rgb(210, 180, 140)',
    type4: 'rgb(34, 197, 94)',
    type5: 'rgb(251, 191, 36)',
    type6: 'rgb(249, 115, 22)',
    type7: 'rgb(239, 68, 68)'
  };

  // 按类型排序并过滤掉数量为0的
  const sortedShapes = Object.entries(shapeDistribution)
    .filter(([_, count]) => count > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  const labels = sortedShapes.map(([shape]) => shapeDescriptions[shape] || shape);
  const data = sortedShapes.map(([_, count]) => count);
  const backgroundColors = sortedShapes.map(([shape]) => shapeColors[shape] || 'rgba(107, 114, 128, 0.8)');
  const borderColors = sortedShapes.map(([shape]) => shapeBorderColors[shape] || 'rgb(107, 114, 128)');

  const total = data.reduce((sum, count) => sum + count, 0);

  const chartData = {
    labels,
    datasets: [
      {
        label: '记录数量',
        data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 2,
        hoverBackgroundColor: backgroundColors.map(color => color.replace('0.8', '0.9')),
        hoverBorderWidth: 3
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' as const : 'x' as const,
    plugins: {
      legend: {
        display: false
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
          label: (context: any) => {
            const value = context.parsed[horizontal ? 'x' : 'y'];
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `数量: ${value} (${percentage}%)`;
          },
          afterLabel: () => {
            return `总计: ${total} 次`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: horizontal ? '记录数量' : '便便类型',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          display: horizontal,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          maxRotation: horizontal ? 0 : 45,
          minRotation: horizontal ? 0 : 0,
          font: {
            size: 10
          }
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: horizontal ? '便便类型' : '记录数量',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        beginAtZero: true,
        grid: {
          display: !horizontal,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            size: 10
          }
        }
      }
    },
    elements: {
      bar: {
        borderRadius: 4
      }
    }
  };

  if (sortedShapes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        {title && (
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
            {title}
          </h3>
        )}
        <div 
          className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
          style={{ height }}
        >
          <div className="text-center">
            <div className="text-gray-400 text-lg mb-2">📊</div>
            <p className="text-gray-500">暂无形状数据</p>
            <p className="text-gray-400 text-sm">开始记录以查看分布</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div style={{ height }}>
        <Bar data={chartData} options={options} />
      </div>
      
      {/* 形状说明 */}
      <div className="mt-4 text-xs text-gray-600">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          <div>• 第1-2型：便秘</div>
          <div>• 第3-5型：正常</div>
          <div>• 第6-7型：腹泻</div>
          <div>• 第4型：理想状态</div>
        </div>
      </div>
    </div>
  );
};

export default ShapeDistributionChart;