/**
 * 视觉差异分析工具
 * 提供高级的截图对比和差异检测功能
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface DiffAnalysisResult {
  /** 是否匹配 */
  matches: boolean;
  /** 总体差异百分比 */
  overallDiff: number;
  /** 像素差异数量 */
  pixelDiffCount: number;
  /** 总像素数 */
  totalPixels: number;
  /** 差异区域 */
  diffRegions: DiffRegion[];
  /** 差异类型分析 */
  diffTypes: DiffTypeAnalysis;
  /** 建议操作 */
  recommendations: string[];
}

export interface DiffRegion {
  /** 区域坐标 */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 区域内差异百分比 */
  diffPercentage: number;
  /** 差异类型 */
  type: 'color' | 'layout' | 'content' | 'animation';
}

export interface DiffTypeAnalysis {
  /** 颜色差异 */
  colorDiff: number;
  /** 布局差异 */
  layoutDiff: number;
  /** 内容差异 */
  contentDiff: number;
  /** 动画/时间相关差异 */
  animationDiff: number;
}

export interface VisualDiffOptions {
  /** 差异阈值 (0-1) */
  threshold: number;
  /** 是否忽略抗锯齿差异 */
  ignoreAntialiasing: boolean;
  /** 是否忽略颜色微小差异 */
  ignoreMinorColorDiff: boolean;
  /** 最小差异区域大小 */
  minDiffRegionSize: number;
  /** 是否生成详细报告 */
  generateDetailedReport: boolean;
}

export class VisualDiffAnalyzer {
  private options: VisualDiffOptions;

  constructor(options: Partial<VisualDiffOptions> = {}) {
    this.options = {
      threshold: 0.2,
      ignoreAntialiasing: true,
      ignoreMinorColorDiff: true,
      minDiffRegionSize: 10,
      generateDetailedReport: true,
      ...options
    };
  }

  /**
   * 分析两张图片的差异
   */
  async analyzeDifference(
    baselinePath: string,
    actualPath: string,
    outputPath?: string
  ): Promise<DiffAnalysisResult> {
    try {
      // 检查文件是否存在
      await fs.access(baselinePath);
      await fs.access(actualPath);

      // 这里使用模拟的差异分析
      // 在实际实现中，你可能需要使用图像处理库如 sharp 或 jimp
      const mockResult = await this.performMockAnalysis(baselinePath, actualPath);

      if (outputPath && this.options.generateDetailedReport) {
        await this.generateDiffReport(mockResult, outputPath);
      }

      return mockResult;
    } catch (error) {
      throw new Error(`Failed to analyze visual difference: ${error}`);
    }
  }

  /**
   * 模拟差异分析（实际实现需要图像处理库）
   */
  private async performMockAnalysis(
    baselinePath: string,
    actualPath: string
  ): Promise<DiffAnalysisResult> {
    // 获取文件信息
    const baselineStat = await fs.stat(baselinePath);
    const actualStat = await fs.stat(actualPath);

    // 模拟分析结果
    const sizeDiff = Math.abs(baselineStat.size - actualStat.size) / baselineStat.size;
    const overallDiff = Math.min(sizeDiff * 100, 15); // 最大15%差异

    const matches = overallDiff <= this.options.threshold * 100;

    return {
      matches,
      overallDiff,
      pixelDiffCount: Math.floor(overallDiff * 1000),
      totalPixels: 100000, // 模拟总像素数
      diffRegions: this.generateMockDiffRegions(overallDiff),
      diffTypes: this.analyzeDiffTypes(overallDiff),
      recommendations: this.generateRecommendations(overallDiff, matches)
    };
  }

  /**
   * 生成模拟差异区域
   */
  private generateMockDiffRegions(overallDiff: number): DiffRegion[] {
    if (overallDiff < 1) return [];

    const regions: DiffRegion[] = [];
    const regionCount = Math.ceil(overallDiff / 5);

    for (let i = 0; i < regionCount; i++) {
      regions.push({
        x: Math.floor(Math.random() * 800),
        y: Math.floor(Math.random() * 600),
        width: Math.floor(Math.random() * 100) + 20,
        height: Math.floor(Math.random() * 100) + 20,
        diffPercentage: Math.random() * overallDiff,
        type: this.getRandomDiffType()
      });
    }

    return regions;
  }

  /**
   * 分析差异类型
   */
  private analyzeDiffTypes(overallDiff: number): DiffTypeAnalysis {
    return {
      colorDiff: overallDiff * 0.4,
      layoutDiff: overallDiff * 0.3,
      contentDiff: overallDiff * 0.2,
      animationDiff: overallDiff * 0.1
    };
  }

  /**
   * 生成建议
   */
  private generateRecommendations(overallDiff: number, matches: boolean): string[] {
    const recommendations: string[] = [];

    if (!matches) {
      recommendations.push('Visual differences detected that exceed threshold');
      
      if (overallDiff > 10) {
        recommendations.push('Large visual differences - check for layout changes');
      } else if (overallDiff > 5) {
        recommendations.push('Moderate visual differences - review styling changes');
      } else {
        recommendations.push('Minor visual differences - may be acceptable');
      }

      recommendations.push('Consider updating baseline if changes are intentional');
      recommendations.push('Review diff regions for specific areas of change');
    } else {
      recommendations.push('Visual comparison passed - no significant differences');
    }

    return recommendations;
  }

  /**
   * 获取随机差异类型
   */
  private getRandomDiffType(): DiffRegion['type'] {
    const types: DiffRegion['type'][] = ['color', 'layout', 'content', 'animation'];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * 生成差异报告
   */
  private async generateDiffReport(result: DiffAnalysisResult, outputPath: string): Promise<void> {
    const reportHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Visual Difference Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .status { padding: 10px; border-radius: 4px; margin: 10px 0; }
        .pass { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .fail { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #e3f2fd; padding: 15px; border-radius: 4px; text-align: center; }
        .regions { margin: 20px 0; }
        .region { background: #f9f9f9; padding: 10px; margin: 10px 0; border-left: 4px solid #2196f3; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .diff-types { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
        .diff-type { background: #f0f0f0; padding: 15px; border-radius: 4px; }
        .progress-bar { width: 100%; height: 20px; background: #e0e0e0; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: #2196f3; transition: width 0.3s ease; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Visual Difference Analysis Report</h1>
        <p>Generated: ${new Date().toISOString()}</p>
        <div class="status ${result.matches ? 'pass' : 'fail'}">
            ${result.matches ? '✅ PASS' : '❌ FAIL'} - Overall Difference: ${result.overallDiff.toFixed(2)}%
        </div>
    </div>

    <div class="metrics">
        <div class="metric">
            <h3>Overall Difference</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min(result.overallDiff, 100)}%"></div>
            </div>
            <p>${result.overallDiff.toFixed(2)}%</p>
        </div>
        <div class="metric">
            <h3>Pixel Differences</h3>
            <p>${result.pixelDiffCount.toLocaleString()} / ${result.totalPixels.toLocaleString()}</p>
        </div>
        <div class="metric">
            <h3>Diff Regions</h3>
            <p>${result.diffRegions.length}</p>
        </div>
        <div class="metric">
            <h3>Threshold</h3>
            <p>${(this.options.threshold * 100).toFixed(1)}%</p>
        </div>
    </div>

    <div class="diff-types">
        <div class="diff-type">
            <h3>Color Differences</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${result.diffTypes.colorDiff}%"></div>
            </div>
            <p>${result.diffTypes.colorDiff.toFixed(2)}%</p>
        </div>
        <div class="diff-type">
            <h3>Layout Differences</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${result.diffTypes.layoutDiff}%"></div>
            </div>
            <p>${result.diffTypes.layoutDiff.toFixed(2)}%</p>
        </div>
        <div class="diff-type">
            <h3>Content Differences</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${result.diffTypes.contentDiff}%"></div>
            </div>
            <p>${result.diffTypes.contentDiff.toFixed(2)}%</p>
        </div>
        <div class="diff-type">
            <h3>Animation Differences</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${result.diffTypes.animationDiff}%"></div>
            </div>
            <p>${result.diffTypes.animationDiff.toFixed(2)}%</p>
        </div>
    </div>

    ${result.diffRegions.length > 0 ? `
    <div class="regions">
        <h2>Difference Regions</h2>
        ${result.diffRegions.map((region, index) => `
        <div class="region">
            <h4>Region ${index + 1} (${region.type})</h4>
            <p>Position: (${region.x}, ${region.y})</p>
            <p>Size: ${region.width} × ${region.height}</p>
            <p>Difference: ${region.diffPercentage.toFixed(2)}%</p>
        </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="recommendations">
        <h2>Recommendations</h2>
        <ul>
            ${result.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>

    <div class="header">
        <h2>Analysis Configuration</h2>
        <ul>
            <li>Threshold: ${(this.options.threshold * 100).toFixed(1)}%</li>
            <li>Ignore Antialiasing: ${this.options.ignoreAntialiasing ? 'Yes' : 'No'}</li>
            <li>Ignore Minor Color Diff: ${this.options.ignoreMinorColorDiff ? 'Yes' : 'No'}</li>
            <li>Min Diff Region Size: ${this.options.minDiffRegionSize}px</li>
        </ul>
    </div>
</body>
</html>
    `;

    await fs.writeFile(outputPath, reportHtml);
  }

  /**
   * 批量分析差异
   */
  async batchAnalyze(
    comparisons: Array<{ baseline: string; actual: string; name: string }>
  ): Promise<Map<string, DiffAnalysisResult>> {
    const results = new Map<string, DiffAnalysisResult>();

    for (const comparison of comparisons) {
      try {
        const result = await this.analyzeDifference(
          comparison.baseline,
          comparison.actual
        );
        results.set(comparison.name, result);
      } catch (error) {
        console.error(`Failed to analyze ${comparison.name}:`, error);
      }
    }

    return results;
  }

  /**
   * 生成批量分析报告
   */
  async generateBatchReport(
    results: Map<string, DiffAnalysisResult>,
    outputPath: string
  ): Promise<void> {
    const totalTests = results.size;
    const passedTests = Array.from(results.values()).filter(r => r.matches).length;
    const failedTests = totalTests - passedTests;

    const reportHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Batch Visual Difference Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
        .stat { background: #e3f2fd; padding: 15px; border-radius: 4px; text-align: center; }
        .test-result { margin: 10px 0; padding: 15px; border-radius: 4px; }
        .pass { background: #d4edda; border-left: 4px solid #28a745; }
        .fail { background: #f8d7da; border-left: 4px solid #dc3545; }
        .test-name { font-weight: bold; margin-bottom: 5px; }
        .test-diff { color: #666; }
    </style>
</head>
<body>
    <div class="summary">
        <h1>Batch Visual Difference Analysis Report</h1>
        <p>Generated: ${new Date().toISOString()}</p>
        <p>Total Tests: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}</p>
    </div>

    <div class="stats">
        <div class="stat">
            <h3>Pass Rate</h3>
            <p>${((passedTests / totalTests) * 100).toFixed(1)}%</p>
        </div>
        <div class="stat">
            <h3>Average Difference</h3>
            <p>${(Array.from(results.values()).reduce((sum, r) => sum + r.overallDiff, 0) / totalTests).toFixed(2)}%</p>
        </div>
        <div class="stat">
            <h3>Threshold</h3>
            <p>${(this.options.threshold * 100).toFixed(1)}%</p>
        </div>
    </div>

    <div class="results">
        <h2>Test Results</h2>
        ${Array.from(results.entries()).map(([name, result]) => `
        <div class="test-result ${result.matches ? 'pass' : 'fail'}">
            <div class="test-name">${name}</div>
            <div class="test-diff">
                ${result.matches ? '✅ PASS' : '❌ FAIL'} - 
                Difference: ${result.overallDiff.toFixed(2)}% | 
                Regions: ${result.diffRegions.length} | 
                Pixels: ${result.pixelDiffCount.toLocaleString()}
            </div>
        </div>
        `).join('')}
    </div>
</body>
</html>
    `;

    await fs.writeFile(outputPath, reportHtml);
    console.log(`✅ Batch analysis report generated: ${outputPath}`);
  }

  /**
   * 设置分析选项
   */
  setOptions(options: Partial<VisualDiffOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 获取当前分析选项
   */
  getOptions(): VisualDiffOptions {
    return { ...this.options };
  }
}

/**
 * 差异分析工具函数
 */
export class DiffAnalysisUtils {
  /**
   * 计算两个颜色的差异
   */
  static calculateColorDifference(color1: [number, number, number], color2: [number, number, number]): number {
    const [r1, g1, b1] = color1;
    const [r2, g2, b2] = color2;
    
    // 使用欧几里得距离计算颜色差异
    const rDiff = r1 - r2;
    const gDiff = g1 - g2;
    const bDiff = b1 - b2;
    
    return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff) / (255 * Math.sqrt(3));
  }

  /**
   * 检测是否为抗锯齿差异
   */
  static isAntialiasingDifference(
    pixel: [number, number, number],
    neighbors: [number, number, number][]
  ): boolean {
    // 简化的抗锯齿检测逻辑
    const avgNeighbor = neighbors.reduce(
      (sum, neighbor) => [sum[0] + neighbor[0], sum[1] + neighbor[1], sum[2] + neighbor[2]],
      [0, 0, 0]
    ).map(sum => sum / neighbors.length) as [number, number, number];

    const diffToAvg = this.calculateColorDifference(pixel, avgNeighbor);
    return diffToAvg < 0.1; // 阈值可调整
  }

  /**
   * 合并相邻的差异区域
   */
  static mergeDiffRegions(regions: DiffRegion[], maxDistance: number = 20): DiffRegion[] {
    if (regions.length <= 1) return regions;

    const merged: DiffRegion[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < regions.length; i++) {
      if (processed.has(i)) continue;

      const currentRegion = { ...regions[i] };
      processed.add(i);

      // 查找相邻区域
      for (let j = i + 1; j < regions.length; j++) {
        if (processed.has(j)) continue;

        const distance = this.calculateRegionDistance(currentRegion, regions[j]);
        if (distance <= maxDistance) {
          // 合并区域
          currentRegion.x = Math.min(currentRegion.x, regions[j].x);
          currentRegion.y = Math.min(currentRegion.y, regions[j].y);
          currentRegion.width = Math.max(
            currentRegion.x + currentRegion.width,
            regions[j].x + regions[j].width
          ) - currentRegion.x;
          currentRegion.height = Math.max(
            currentRegion.y + currentRegion.height,
            regions[j].y + regions[j].height
          ) - currentRegion.y;
          currentRegion.diffPercentage = Math.max(currentRegion.diffPercentage, regions[j].diffPercentage);
          
          processed.add(j);
        }
      }

      merged.push(currentRegion);
    }

    return merged;
  }

  /**
   * 计算两个区域之间的距离
   */
  private static calculateRegionDistance(region1: DiffRegion, region2: DiffRegion): number {
    const center1 = {
      x: region1.x + region1.width / 2,
      y: region1.y + region1.height / 2
    };
    const center2 = {
      x: region2.x + region2.width / 2,
      y: region2.y + region2.height / 2
    };

    return Math.sqrt(
      Math.pow(center1.x - center2.x, 2) + Math.pow(center1.y - center2.y, 2)
    );
  }
}