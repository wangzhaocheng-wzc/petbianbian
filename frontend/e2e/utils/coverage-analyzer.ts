import * as fs from 'fs';
import * as path from 'path';

export interface CoverageData {
  statements: CoverageMetric;
  branches: CoverageMetric;
  functions: CoverageMetric;
  lines: CoverageMetric;
  files: FileCoverage[];
}

export interface CoverageMetric {
  total: number;
  covered: number;
  percentage: number;
}

export interface FileCoverage {
  path: string;
  statements: CoverageMetric;
  branches: CoverageMetric;
  functions: CoverageMetric;
  lines: CoverageMetric;
  uncoveredLines: number[];
}

export interface CoverageReport {
  summary: CoverageData;
  details: FileCoverage[];
  recommendations: string[];
  trends: CoverageTrend[];
}

export interface CoverageTrend {
  date: string;
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export class CoverageAnalyzer {
  private coverageDir: string;
  private historyFile: string;

  constructor(coverageDir: string = 'coverage') {
    this.coverageDir = coverageDir;
    this.historyFile = path.join(coverageDir, 'coverage-history.json');
  }

  /**
   * 分析测试覆盖率数据
   */
  async analyzeCoverage(): Promise<CoverageReport> {
    const coverageData = await this.loadCoverageData();
    const recommendations = this.generateRecommendations(coverageData);
    const trends = await this.loadCoverageTrends();

    return {
      summary: coverageData,
      details: coverageData.files,
      recommendations,
      trends
    };
  }

  /**
   * 加载覆盖率数据
   */
  private async loadCoverageData(): Promise<CoverageData> {
    const coverageFile = path.join(this.coverageDir, 'coverage-final.json');
    
    if (!fs.existsSync(coverageFile)) {
      console.warn('⚠️ 未找到覆盖率数据文件，返回默认数据');
      return this.getDefaultCoverageData();
    }

    try {
      const rawData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      return this.processCoverageData(rawData);
    } catch (error) {
      console.error('❌ 解析覆盖率数据失败:', error);
      return this.getDefaultCoverageData();
    }
  }

  /**
   * 处理原始覆盖率数据
   */
  private processCoverageData(rawData: any): CoverageData {
    const files: FileCoverage[] = [];
    let totalStatements = { total: 0, covered: 0 };
    let totalBranches = { total: 0, covered: 0 };
    let totalFunctions = { total: 0, covered: 0 };
    let totalLines = { total: 0, covered: 0 };

    // 处理每个文件的覆盖率数据
    for (const [filePath, fileData] of Object.entries(rawData)) {
      const fileCoverage = this.processFileCoverage(filePath, fileData as any);
      files.push(fileCoverage);

      // 累计总数
      totalStatements.total += fileCoverage.statements.total;
      totalStatements.covered += fileCoverage.statements.covered;
      totalBranches.total += fileCoverage.branches.total;
      totalBranches.covered += fileCoverage.branches.covered;
      totalFunctions.total += fileCoverage.functions.total;
      totalFunctions.covered += fileCoverage.functions.covered;
      totalLines.total += fileCoverage.lines.total;
      totalLines.covered += fileCoverage.lines.covered;
    }

    return {
      statements: {
        ...totalStatements,
        percentage: this.calculatePercentage(totalStatements.covered, totalStatements.total)
      },
      branches: {
        ...totalBranches,
        percentage: this.calculatePercentage(totalBranches.covered, totalBranches.total)
      },
      functions: {
        ...totalFunctions,
        percentage: this.calculatePercentage(totalFunctions.covered, totalFunctions.total)
      },
      lines: {
        ...totalLines,
        percentage: this.calculatePercentage(totalLines.covered, totalLines.total)
      },
      files
    };
  }

  /**
   * 处理单个文件的覆盖率数据
   */
  private processFileCoverage(filePath: string, fileData: any): FileCoverage {
    const statements = fileData.s || {};
    const branches = fileData.b || {};
    const functions = fileData.f || {};
    const statementMap = fileData.statementMap || {};

    // 计算语句覆盖率
    const statementMetric = this.calculateMetric(statements);
    
    // 计算分支覆盖率
    const branchMetric = this.calculateBranchMetric(branches);
    
    // 计算函数覆盖率
    const functionMetric = this.calculateMetric(functions);
    
    // 计算行覆盖率（基于语句映射）
    const lineMetric = this.calculateLineMetric(statements, statementMap);
    
    // 找出未覆盖的行
    const uncoveredLines = this.findUncoveredLines(statements, statementMap);

    return {
      path: filePath,
      statements: statementMetric,
      branches: branchMetric,
      functions: functionMetric,
      lines: lineMetric,
      uncoveredLines
    };
  }

  /**
   * 计算覆盖率指标
   */
  private calculateMetric(data: Record<string, number>): CoverageMetric {
    const total = Object.keys(data).length;
    const covered = Object.values(data).filter(count => count > 0).length;
    
    return {
      total,
      covered,
      percentage: this.calculatePercentage(covered, total)
    };
  }

  /**
   * 计算分支覆盖率指标
   */
  private calculateBranchMetric(branches: Record<string, number[]>): CoverageMetric {
    let total = 0;
    let covered = 0;

    for (const branchArray of Object.values(branches)) {
      total += branchArray.length;
      covered += branchArray.filter(count => count > 0).length;
    }

    return {
      total,
      covered,
      percentage: this.calculatePercentage(covered, total)
    };
  }

  /**
   * 计算行覆盖率指标
   */
  private calculateLineMetric(statements: Record<string, number>, statementMap: any): CoverageMetric {
    const lines = new Set<number>();
    const coveredLines = new Set<number>();

    for (const [stmtId, count] of Object.entries(statements)) {
      const stmt = statementMap[stmtId];
      if (stmt && stmt.start && stmt.start.line) {
        lines.add(stmt.start.line);
        if (count > 0) {
          coveredLines.add(stmt.start.line);
        }
      }
    }

    return {
      total: lines.size,
      covered: coveredLines.size,
      percentage: this.calculatePercentage(coveredLines.size, lines.size)
    };
  }

  /**
   * 找出未覆盖的行号
   */
  private findUncoveredLines(statements: Record<string, number>, statementMap: any): number[] {
    const uncoveredLines: number[] = [];

    for (const [stmtId, count] of Object.entries(statements)) {
      if (count === 0) {
        const stmt = statementMap[stmtId];
        if (stmt && stmt.start && stmt.start.line) {
          uncoveredLines.push(stmt.start.line);
        }
      }
    }

    return uncoveredLines.sort((a, b) => a - b);
  }

  /**
   * 计算百分比
   */
  private calculatePercentage(covered: number, total: number): number {
    return total > 0 ? Math.round((covered / total) * 100 * 100) / 100 : 0;
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(coverage: CoverageData): string[] {
    const recommendations: string[] = [];

    // 整体覆盖率建议
    if (coverage.statements.percentage < 80) {
      recommendations.push(`语句覆盖率为 ${coverage.statements.percentage}%，建议提高到 80% 以上`);
    }

    if (coverage.branches.percentage < 70) {
      recommendations.push(`分支覆盖率为 ${coverage.branches.percentage}%，建议增加条件分支测试`);
    }

    if (coverage.functions.percentage < 90) {
      recommendations.push(`函数覆盖率为 ${coverage.functions.percentage}%，建议为未测试函数添加测试用例`);
    }

    // 文件级别建议
    const lowCoverageFiles = coverage.files
      .filter(file => file.statements.percentage < 60)
      .sort((a, b) => a.statements.percentage - b.statements.percentage)
      .slice(0, 5);

    if (lowCoverageFiles.length > 0) {
      recommendations.push('以下文件覆盖率较低，建议优先改进：');
      lowCoverageFiles.forEach(file => {
        recommendations.push(`  - ${file.path}: ${file.statements.percentage}%`);
      });
    }

    // 复杂度建议
    const complexFiles = coverage.files
      .filter(file => file.branches.total > 20 && file.branches.percentage < 50)
      .sort((a, b) => b.branches.total - a.branches.total)
      .slice(0, 3);

    if (complexFiles.length > 0) {
      recommendations.push('以下文件分支较多但覆盖率低，建议重点关注：');
      complexFiles.forEach(file => {
        recommendations.push(`  - ${file.path}: ${file.branches.total} 个分支，覆盖率 ${file.branches.percentage}%`);
      });
    }

    if (recommendations.length === 0) {
      recommendations.push('🎉 覆盖率表现良好，继续保持！');
    }

    return recommendations;
  }

  /**
   * 加载覆盖率趋势数据
   */
  private async loadCoverageTrends(): Promise<CoverageTrend[]> {
    if (!fs.existsSync(this.historyFile)) {
      return [];
    }

    try {
      const historyData = JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
      return historyData.trends || [];
    } catch (error) {
      console.error('❌ 加载覆盖率历史数据失败:', error);
      return [];
    }
  }

  /**
   * 保存覆盖率趋势数据
   */
  async saveCoverageTrend(coverage: CoverageData): Promise<void> {
    const trend: CoverageTrend = {
      date: new Date().toISOString(),
      statements: coverage.statements.percentage,
      branches: coverage.branches.percentage,
      functions: coverage.functions.percentage,
      lines: coverage.lines.percentage
    };

    let trends: CoverageTrend[] = [];
    
    if (fs.existsSync(this.historyFile)) {
      try {
        const historyData = JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
        trends = historyData.trends || [];
      } catch (error) {
        console.error('❌ 读取历史数据失败:', error);
      }
    }

    trends.push(trend);
    
    // 只保留最近30天的数据
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    trends = trends.filter(t => new Date(t.date) > thirtyDaysAgo);

    const historyData = { trends };
    
    // 确保目录存在
    const dir = path.dirname(this.historyFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.historyFile, JSON.stringify(historyData, null, 2));
    console.log('📈 覆盖率趋势数据已保存');
  }

  /**
   * 获取默认覆盖率数据
   */
  private getDefaultCoverageData(): CoverageData {
    return {
      statements: { total: 0, covered: 0, percentage: 0 },
      branches: { total: 0, covered: 0, percentage: 0 },
      functions: { total: 0, covered: 0, percentage: 0 },
      lines: { total: 0, covered: 0, percentage: 0 },
      files: []
    };
  }

  /**
   * 生成覆盖率报告HTML
   */
  generateCoverageReportHTML(report: CoverageReport): string {
    return `
<div class="coverage-report">
  <div class="coverage-summary">
    <h3>📊 覆盖率概览</h3>
    <div class="coverage-metrics">
      <div class="metric">
        <div class="metric-label">语句覆盖率</div>
        <div class="metric-value ${this.getCoverageClass(report.summary.statements.percentage)}">
          ${report.summary.statements.percentage}%
        </div>
        <div class="metric-detail">${report.summary.statements.covered}/${report.summary.statements.total}</div>
      </div>
      <div class="metric">
        <div class="metric-label">分支覆盖率</div>
        <div class="metric-value ${this.getCoverageClass(report.summary.branches.percentage)}">
          ${report.summary.branches.percentage}%
        </div>
        <div class="metric-detail">${report.summary.branches.covered}/${report.summary.branches.total}</div>
      </div>
      <div class="metric">
        <div class="metric-label">函数覆盖率</div>
        <div class="metric-value ${this.getCoverageClass(report.summary.functions.percentage)}">
          ${report.summary.functions.percentage}%
        </div>
        <div class="metric-detail">${report.summary.functions.covered}/${report.summary.functions.total}</div>
      </div>
      <div class="metric">
        <div class="metric-label">行覆盖率</div>
        <div class="metric-value ${this.getCoverageClass(report.summary.lines.percentage)}">
          ${report.summary.lines.percentage}%
        </div>
        <div class="metric-detail">${report.summary.lines.covered}/${report.summary.lines.total}</div>
      </div>
    </div>
  </div>

  <div class="coverage-recommendations">
    <h4>💡 改进建议</h4>
    <ul>
      ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
  </div>

  <div class="coverage-files">
    <h4>📁 文件覆盖率详情</h4>
    <table class="coverage-table">
      <thead>
        <tr>
          <th>文件路径</th>
          <th>语句</th>
          <th>分支</th>
          <th>函数</th>
          <th>行数</th>
          <th>未覆盖行</th>
        </tr>
      </thead>
      <tbody>
        ${report.details.map(file => `
        <tr>
          <td class="file-path">${file.path}</td>
          <td class="coverage-cell ${this.getCoverageClass(file.statements.percentage)}">
            ${file.statements.percentage}%
          </td>
          <td class="coverage-cell ${this.getCoverageClass(file.branches.percentage)}">
            ${file.branches.percentage}%
          </td>
          <td class="coverage-cell ${this.getCoverageClass(file.functions.percentage)}">
            ${file.functions.percentage}%
          </td>
          <td class="coverage-cell ${this.getCoverageClass(file.lines.percentage)}">
            ${file.lines.percentage}%
          </td>
          <td class="uncovered-lines">
            ${file.uncoveredLines.length > 0 ? file.uncoveredLines.slice(0, 5).join(', ') + (file.uncoveredLines.length > 5 ? '...' : '') : '-'}
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</div>`;
  }

  /**
   * 获取覆盖率等级样式类
   */
  private getCoverageClass(percentage: number): string {
    if (percentage >= 80) return 'coverage-high';
    if (percentage >= 60) return 'coverage-medium';
    return 'coverage-low';
  }
}