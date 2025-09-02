import React, { useState, useEffect } from 'react';
import { PoopRecord } from '../../../../shared/types';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Shield,
  Eye,
  Info,
  Lightbulb,
  Clock
} from 'lucide-react';

interface HealthStatusVisualizationProps {
  record: PoopRecord;
  showDetails?: boolean;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const HealthStatusVisualization: React.FC<HealthStatusVisualizationProps> = ({
  record,
  showDetails = true,
  interactive = false,
  size = 'md',
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    if (interactive) {
      const interval = setInterval(() => {
        setAnimationPhase(prev => (prev + 1) % 3);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [interactive]);

  const getHealthStatusConfig = () => {
    const { healthStatus } = record.analysis;
    
    const baseConfig = {
      healthy: {
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        ringColor: 'ring-green-500',
        title: '健康状态',
        subtitle: '一切正常',
        description: '便便状态健康，继续保持良好习惯',
        recommendation: '保持当前的饮食和生活习惯',
        urgency: 'none',
        riskLevel: 'low'
      },
      warning: {
        icon: AlertTriangle,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        ringColor: 'ring-yellow-500',
        title: '需要关注',
        subtitle: '轻微异常',
        description: '检测到需要注意的情况',
        recommendation: '观察几天并适当调整饮食',
        urgency: 'monitor',
        riskLevel: 'medium'
      },
      concerning: {
        icon: XCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        ringColor: 'ring-red-500',
        title: '建议就医',
        subtitle: '异常状态',
        description: '检测到明显异常情况',
        recommendation: '建议尽快咨询兽医',
        urgency: 'consult',
        riskLevel: 'high'
      }
    };

    return baseConfig[healthStatus] || baseConfig.healthy;
  };

  const getSizeConfig = () => {
    const configs = {
      sm: {
        iconSize: 'w-6 h-6',
        containerPadding: 'p-3',
        titleSize: 'text-sm',
        subtitleSize: 'text-xs',
        badgeSize: 'text-xs px-2 py-1',
        ringSize: 'ring-2'
      },
      md: {
        iconSize: 'w-8 h-8',
        containerPadding: 'p-4',
        titleSize: 'text-base',
        subtitleSize: 'text-sm',
        badgeSize: 'text-sm px-3 py-1',
        ringSize: 'ring-4'
      },
      lg: {
        iconSize: 'w-12 h-12',
        containerPadding: 'p-6',
        titleSize: 'text-lg',
        subtitleSize: 'text-base',
        badgeSize: 'text-base px-4 py-2',
        ringSize: 'ring-8'
      }
    };
    return configs[size];
  };

  const config = getHealthStatusConfig();
  const sizeConfig = getSizeConfig();
  const IconComponent = config.icon;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getUrgencyIcon = () => {
    switch (config.urgency) {
      case 'consult':
        return <Clock className="w-4 h-4" />;
      case 'monitor':
        return <Eye className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getRiskLevelIndicator = () => {
    const indicators = {
      low: { color: 'bg-green-400', count: 1 },
      medium: { color: 'bg-yellow-400', count: 2 },
      high: { color: 'bg-red-400', count: 3 }
    };
    
    const indicator = indicators[config.riskLevel as keyof typeof indicators];
    return (
      <div className="flex space-x-1">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${
              i < indicator.count ? indicator.color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      {/* 主要状态显示 */}
      <div
        className={`
          ${config.bgColor} ${config.borderColor} border-2 rounded-xl 
          ${sizeConfig.containerPadding} transition-all duration-300
          ${interactive ? 'cursor-pointer hover:shadow-lg transform hover:scale-105' : ''}
          ${interactive && animationPhase === 1 ? `${config.ringColor} ${sizeConfig.ringSize} ring-opacity-50` : ''}
        `}
        onMouseEnter={() => interactive && setShowTooltip(true)}
        onMouseLeave={() => interactive && setShowTooltip(false)}
      >
        <div className="flex items-start space-x-4">
          {/* 状态图标 */}
          <div className="flex-shrink-0 relative">
            <IconComponent className={`${sizeConfig.iconSize} ${config.color}`} />
            {interactive && animationPhase === 2 && (
              <div className={`absolute inset-0 ${config.color} animate-ping`}>
                <IconComponent className={sizeConfig.iconSize} />
              </div>
            )}
          </div>

          {/* 状态信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className={`font-semibold ${config.color} ${sizeConfig.titleSize}`}>
                  {config.title}
                </h3>
                <p className={`text-gray-600 ${sizeConfig.subtitleSize}`}>
                  {config.subtitle}
                </p>
              </div>
              
              {/* 置信度徽章 */}
              <div className={`
                rounded-full font-medium ${sizeConfig.badgeSize}
                ${getConfidenceColor(record.analysis.confidence)}
              `}>
                {record.analysis.confidence}%
              </div>
            </div>

            {showDetails && (
              <>
                <p className={`text-gray-700 mb-3 ${sizeConfig.subtitleSize}`}>
                  {config.description}
                </p>

                {/* 详细信息网格 */}
                <div className="grid grid-cols-2 gap-3">
                  {/* 形状类型 */}
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">形状类型</p>
                      <p className="text-sm font-medium text-gray-900">
                        {record.analysis.shapeDescription || record.analysis.shape}
                      </p>
                    </div>
                  </div>

                  {/* 风险等级 */}
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">风险等级</p>
                      <div className="flex items-center space-x-2">
                        {getRiskLevelIndicator()}
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {config.riskLevel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 建议 */}
                <div className="mt-4 p-3 bg-white bg-opacity-50 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">建议</p>
                      <p className="text-sm text-gray-700">{config.recommendation}</p>
                    </div>
                  </div>
                </div>

                {/* 紧急程度指示器 */}
                {config.urgency !== 'none' && (
                  <div className="mt-3 flex items-center space-x-2 text-sm">
                    {getUrgencyIcon()}
                    <span className="text-gray-600">
                      {config.urgency === 'consult' ? '建议咨询兽医' : '持续观察'}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 交互式提示框 */}
      {interactive && showTooltip && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-900">详细分析</span>
            </div>
            <p className="text-sm text-gray-700">{record.analysis.details}</p>
            
            {record.analysis.recommendations.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1">健康建议:</p>
                <ul className="space-y-1">
                  {record.analysis.recommendations.slice(0, 2).map((rec, index) => (
                    <li key={index} className="text-xs text-gray-600 flex items-start">
                      <span className="w-1 h-1 bg-blue-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};