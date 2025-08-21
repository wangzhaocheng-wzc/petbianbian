import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { ModerationStats } from '../../services/moderationService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface Props {
  stats: ModerationStats | null;
}

const ModerationDashboard: React.FC<Props> = ({ stats }) => {
  if (!stats) {
    return <div>加载中...</div>;
  }

  const pendingData = {
    labels: ['帖子', '评论', '举报'],
    datasets: [
      {
        data: [stats.pending.posts, stats.pending.comments, stats.pending.reports],
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
        borderWidth: 1,
      },
    ],
  };

  const processedData = {
    labels: ['拒绝的帖子', '拒绝的评论', '已处理举报'],
    datasets: [
      {
        label: '已处理内容',
        data: [stats.processed.rejectedPosts, stats.processed.rejectedComments, stats.processed.resolvedReports],
        backgroundColor: '#EF4444',
        borderWidth: 1,
      },
    ],
  };

  const recentActivityData = {
    labels: ['帖子', '评论', '举报'],
    datasets: [
      {
        label: '近期活动',
        data: [stats.recentActivity.posts, stats.recentActivity.comments, stats.recentActivity.reports],
        backgroundColor: '#8B5CF6',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 待审核内容分布 */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">待审核内容分布</h3>
          <div className="h-80">
            <Pie 
              data={pendingData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        return `${context.label}: ${context.parsed}`;
                      }
                    }
                  }
                },
              }}
            />
          </div>
        </div>

        {/* 已处理内容统计 */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">已处理内容统计</h3>
          <div className="h-80">
            <Bar 
              data={processedData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* 近期活动 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">近7天审核活动</h3>
        <div className="h-80">
          <Bar 
            data={recentActivityData} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            }}
          />
        </div>
      </div>

      {/* 详细统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h4 className="text-lg font-medium text-blue-900 mb-2">待审核</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-blue-700">帖子:</span>
              <span className="font-medium text-blue-900">{stats.pending.posts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">评论:</span>
              <span className="font-medium text-blue-900">{stats.pending.comments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">举报:</span>
              <span className="font-medium text-blue-900">{stats.pending.reports}</span>
            </div>
            <div className="border-t border-blue-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-blue-700 font-medium">总计:</span>
                <span className="font-bold text-blue-900">{stats.pending.total}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-red-50 p-6 rounded-lg">
          <h4 className="text-lg font-medium text-red-900 mb-2">已处理</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-red-700">拒绝帖子:</span>
              <span className="font-medium text-red-900">{stats.processed.rejectedPosts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-700">拒绝评论:</span>
              <span className="font-medium text-red-900">{stats.processed.rejectedComments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-700">处理举报:</span>
              <span className="font-medium text-red-900">{stats.processed.resolvedReports}</span>
            </div>
            <div className="border-t border-red-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-red-700 font-medium">总计:</span>
                <span className="font-bold text-red-900">{stats.processed.total}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-6 rounded-lg">
          <h4 className="text-lg font-medium text-purple-900 mb-2">近期活动</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-purple-700">帖子审核:</span>
              <span className="font-medium text-purple-900">{stats.recentActivity.posts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-700">评论审核:</span>
              <span className="font-medium text-purple-900">{stats.recentActivity.comments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-700">举报处理:</span>
              <span className="font-medium text-purple-900">{stats.recentActivity.reports}</span>
            </div>
            <div className="border-t border-purple-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-purple-700 font-medium">总计:</span>
                <span className="font-bold text-purple-900">{stats.recentActivity.total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModerationDashboard;