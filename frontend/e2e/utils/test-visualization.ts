import { TestResult } from '@playwright/test/reporter';

export interface ChartConfig {
  type: 'pie' | 'bar' | 'line' | 'doughnut';
  data: any;
  options?: any;
}

export interface VisualizationData {
  statusDistribution: ChartConfig;
  durationTrends: ChartConfig;
  browserComparison: ChartConfig;
  testSuiteBreakdown: ChartConfig;
  retryAnalysis: ChartConfig;
}

export class TestVisualization {
  /**
   * 创建测试结果可视化图表
   */
  static createVisualization(testResults: TestResult[]): VisualizationData {
    return {
      statusDistribution: this.createStatusDistribution(testResults),
      durationTrends: this.createDurationTrends(testResults),
      browserComparison: this.createBrowserComparison(testResults),
      testSuiteBreakdown: this.createTestSuiteBreakdown(testResults),
      retryAnalysis: this.createRetryAnalysis(testResults)
    };
  }

  /**
   * 创建状态分布饼图
   */
  private static createStatusDistribution(testResults: TestResult[]): ChartConfig {
    const statusCounts = testResults.reduce((acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusLabels = {
      passed: '通过',
      failed: '失败',
      skipped: '跳过',
      timedOut: '超时'
    };

    const statusColors = {
      passed: '#10B981',
      failed: '#EF4444',
      skipped: '#F59E0B',
      timedOut: '#8B5CF6'
    };

    return {
      type: 'doughnut',
      data: {
        labels: Object.keys(statusCounts).map(status => statusLabels[status] || status),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: Object.keys(statusCounts).map(status => statusColors[status] || '#6B7280'),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        }
      }
    };
  }

  /**
   * 创建执行时间趋势图
   */
  private static createDurationTrends(testResults: TestResult[]): ChartConfig {
    const sortedResults = testResults
      .filter(r => r.duration)
      .sort((a, b) => (a.startTime?.getTime() || 0) - (b.startTime?.getTime() || 0));

    const labels = sortedResults.map((_, index) => `测试 ${index + 1}`);
    const durations = sortedResults.map(r => (r.duration || 0) / 1000);

    return {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '执行时间 (秒)',
          data: durations,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '时间 (秒)'
            }
          },
          x: {
            title: {
              display: true,
              text: '测试序号'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    };
  }

  /**
   * 创建浏览器对比图
   */
  private static createBrowserComparison(testResults: TestResult[]): ChartConfig {
    const browserStats = testResults.reduce((acc, result) => {
      const browser = this.extractBrowserName(result);
      if (!acc[browser]) {
        acc[browser] = { total: 0, passed: 0, failed: 0, duration: 0 };
      }
      acc[browser].total++;
      if (result.status === 'passed') acc[browser].passed++;
      if (result.status === 'failed') acc[browser].failed++;
      acc[browser].duration += result.duration || 0;
      return acc;
    }, {} as Record<string, any>);

    const browsers = Object.keys(browserStats);
    const passRates = browsers.map(browser => 
      browserStats[browser].total > 0 
        ? (browserStats[browser].passed / browserStats[browser].total) * 100 
        : 0
    );
    const avgDurations = browsers.map(browser => 
      browserStats[browser].total > 0 
        ? (browserStats[browser].duration / browserStats[browser].total) / 1000 
        : 0
    );

    return {
      type: 'bar',
      data: {
        labels: browsers,
        datasets: [
          {
            label: '通过率 (%)',
            data: passRates,
            backgroundColor: '#10B981',
            yAxisID: 'y'
          },
          {
            label: '平均耗时 (秒)',
            data: avgDurations,
            backgroundColor: '#3B82F6',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: '通过率 (%)'
            },
            max: 100
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: '平均耗时 (秒)'
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        }
      }
    };
  }

  /**
   * 创建测试套件分解图
   */
  private static createTestSuiteBreakdown(testResults: TestResult[]): ChartConfig {
    const suiteStats = testResults.reduce((acc, result) => {
      const suite = this.extractSuiteName(result);
      if (!acc[suite]) {
        acc[suite] = { total: 0, passed: 0, failed: 0 };
      }
      acc[suite].total++;
      if (result.status === 'passed') acc[suite].passed++;
      if (result.status === 'failed') acc[suite].failed++;
      return acc;
    }, {} as Record<string, any>);

    const suites = Object.keys(suiteStats);
    const passedData = suites.map(suite => suiteStats[suite].passed);
    const failedData = suites.map(suite => suiteStats[suite].failed);

    return {
      type: 'bar',
      data: {
        labels: suites,
        datasets: [
          {
            label: '通过',
            data: passedData,
            backgroundColor: '#10B981'
          },
          {
            label: '失败',
            data: failedData,
            backgroundColor: '#EF4444'
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            stacked: true,
            title: {
              display: true,
              text: '测试套件'
            }
          },
          y: {
            stacked: true,
            title: {
              display: true,
              text: '测试数量'
            }
          }
        }
      }
    };
  }

  /**
   * 创建重试分析图
   */
  private static createRetryAnalysis(testResults: TestResult[]): ChartConfig {
    const retryStats = testResults.reduce((acc, result) => {
      const retryCount = result.retry || 0;
      acc[retryCount] = (acc[retryCount] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const maxRetries = Math.max(...Object.keys(retryStats).map(Number));
    const labels = Array.from({ length: maxRetries + 1 }, (_, i) => `${i} 次重试`);
    const data = labels.map((_, i) => retryStats[i] || 0);

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '测试数量',
          data,
          backgroundColor: data.map((_, i) => 
            i === 0 ? '#10B981' : i === 1 ? '#F59E0B' : '#EF4444'
          )
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '测试数量'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    };
  }

  /**
   * 从测试结果中提取浏览器名称
   */
  private static extractBrowserName(result: TestResult): string {
    // 从测试标题或项目名称中提取浏览器信息
    const title = result.title || '';
    const projectName = (result as any).projectName || '';
    
    if (title.includes('chrome') || projectName.includes('chrome')) return 'Chrome';
    if (title.includes('firefox') || projectName.includes('firefox')) return 'Firefox';
    if (title.includes('safari') || projectName.includes('safari')) return 'Safari';
    if (title.includes('edge') || projectName.includes('edge')) return 'Edge';
    
    return '未知浏览器';
  }

  /**
   * 从测试结果中提取测试套件名称
   */
  private static extractSuiteName(result: TestResult): string {
    const title = result.title || '';
    
    // 根据文件路径或测试标题提取套件名称
    if (title.includes('auth')) return '认证测试';
    if (title.includes('pets')) return '宠物管理';
    if (title.includes('analysis')) return '便便分析';
    if (title.includes('community')) return '社区功能';
    if (title.includes('performance')) return '性能测试';
    if (title.includes('visual')) return '视觉测试';
    if (title.includes('accessibility')) return '可访问性';
    if (title.includes('error')) return '错误处理';
    if (title.includes('boundary')) return '边界测试';
    if (title.includes('integration')) return '集成测试';
    
    return '其他测试';
  }

  /**
   * 生成测试覆盖率可视化
   */
  static createCoverageVisualization(coverage: any): ChartConfig {
    const metrics = ['语句', '分支', '函数', '行数'];
    const values = [
      coverage.statements || 0,
      coverage.branches || 0,
      coverage.functions || 0,
      coverage.lines || 0
    ];

    return {
      type: 'bar',
      data: {
        labels: metrics,
        datasets: [{
          label: '覆盖率 (%)',
          data: values,
          backgroundColor: values.map(value => 
            value >= 80 ? '#10B981' : value >= 60 ? '#F59E0B' : '#EF4444'
          )
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: '覆盖率 (%)'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    };
  }
}