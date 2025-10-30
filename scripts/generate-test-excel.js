const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

async function main() {
  const outDir = path.join(process.cwd(), 'tests');
  const outFile = path.join(outDir, '手动测试用例清单.xlsx');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Pet Health Test Generator';
  workbook.created = new Date();

  const statusList = '通过,失败,未测,阻塞';

  const sheets = [
    { name: '登录与权限', moduleCode: 'AUTH' },
    { name: '宠物管理', moduleCode: 'PET' },
    { name: '便便记录与分析', moduleCode: 'ANALYSIS' },
    { name: '社区与互动', moduleCode: 'COMMUNITY' },
    { name: '统计与报告', moduleCode: 'REPORT' },
    { name: '系统监控与告警', moduleCode: 'ALERT' },
  ];

  for (const s of sheets) {
    const sheet = workbook.addWorksheet(s.name);

    sheet.columns = [
      { header: '测试用例编号', key: 'id', width: 20 },
      { header: '测试场景描述', key: 'desc', width: 40 },
      { header: '测试步骤', key: 'steps', width: 50 },
      { header: '预期结果', key: 'expected', width: 40 },
      { header: '实际结果', key: 'actual', width: 25 },
      { header: '通过/失败', key: 'status', width: 15 },
      { header: '备注', key: 'remarks', width: 50 },
    ];

    // Header style
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Data validation for Status column
    for (let i = 2; i <= 200; i++) {
      const cell = sheet.getCell(`F${i}`);
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${statusList}"`]
      };
    }

    // Seed example rows per module
    const examples = getExamples(s.moduleCode);
    examples.forEach((ex, idx) => {
      sheet.addRow({
        id: `${s.moduleCode}-${ex.feature}-${String(idx + 1).padStart(3, '0')}`,
        desc: ex.desc,
        steps: ex.steps.join(' \n '),
        expected: ex.expected.join(' \n '),
        actual: '',
        status: '',
        remarks: ex.remarks || ''
      });
    });
  }

  await workbook.xlsx.writeFile(outFile);
  console.log(`生成完成: ${outFile}`);
}

function getExamples(moduleCode) {
  switch (moduleCode) {
    case 'AUTH':
      return [
        {
          feature: 'LOGIN',
          desc: '用户登录-有效凭证',
          steps: ['打开登录页', '输入有效邮箱与密码', '点击登录'],
          expected: ['显示登录成功提示', '跳转到首页', '生成有效JWT']
        },
        {
          feature: 'LOGIN',
          desc: '用户登录-错误密码',
          steps: ['打开登录页', '输入正确邮箱与错误密码', '点击登录'],
          expected: ['提示邮箱或密码错误', '不跳转']
        },
        {
          feature: 'REGISTER',
          desc: '用户注册-唯一性校验',
          steps: ['打开注册页', '填入已存在邮箱', '提交'],
          expected: ['提示邮箱已被注册', '阻止注册']
        },
        {
          feature: 'ROLE',
          desc: '权限控制-普通用户访问管理员接口',
          steps: ['使用普通用户登录', '调用管理员接口'],
          expected: ['返回403禁止访问']
        },
      ];
    case 'PET':
      return [
        {
          feature: 'CREATE',
          desc: '新增宠物-完整信息',
          steps: ['打开宠物管理', '填写名称/类型/品种/性别/年龄/体重', '提交'],
          expected: ['返回成功', '列表出现新宠物']
        },
        {
          feature: 'UPDATE',
          desc: '更新宠物-边界值体重',
          steps: ['进入宠物详情', '将体重设置为0.00', '保存'],
          expected: ['校验提示或允许保存（按业务要求）']
        },
        {
          feature: 'DELETE',
          desc: '删除宠物-确认弹窗',
          steps: ['在列表点击删除', '确认操作'],
          expected: ['宠物被删除', '列表不再显示']
        },
      ];
    case 'ANALYSIS':
      return [
        {
          feature: 'UPLOAD',
          desc: '上传分析图片-正常流程',
          steps: ['进入分析页面', '选择图片文件', '点击上传并分析'],
          expected: ['图片上传成功', '返回形状/健康状态/置信度']
        },
        {
          feature: 'BOUNDARY',
          desc: '分析结果-置信度边界值',
          steps: ['上传图片', '检查返回置信度范围'],
          expected: ['置信度介于0-100%之间']
        },
        {
          feature: 'DELETE',
          desc: '删除分析记录',
          steps: ['打开记录列表', '删除一条记录'],
          expected: ['记录删除成功', '列表数量减少']
        },
      ];
    case 'COMMUNITY':
      return [
        {
          feature: 'POST',
          desc: '发表帖子-必填校验',
          steps: ['进入发帖页面', '不填标题/内容', '提交'],
          expected: ['提示标题和内容不能为空']
        },
        {
          feature: 'COMMENT',
          desc: '发表评论-正常流程',
          steps: ['打开帖子详情', '输入评论内容', '提交'],
          expected: ['评论显示在列表', '数量增加']
        },
        {
          feature: 'LIKE',
          desc: '点赞帖子-切换状态',
          steps: ['点击点赞', '再次点击取消'],
          expected: ['点赞数变化正确']
        },
      ];
    case 'REPORT':
      return [
        {
          feature: 'STATS',
          desc: '查看统计-时间范围筛选',
          steps: ['进入统计页面', '选择时间范围', '查看结果'],
          expected: ['各项统计数据更新']
        },
        {
          feature: 'PDF',
          desc: '导出健康报告PDF',
          steps: ['进入报告页面', '点击导出PDF'],
          expected: ['下载PDF文件成功']
        },
      ];
    case 'ALERT':
      return [
        {
          feature: 'RULE',
          desc: '创建告警规则-必填校验',
          steps: ['打开告警规则', '填写名称与条件', '保存'],
          expected: ['规则创建成功']
        },
        {
          feature: 'TRIGGER',
          desc: '触发告警-模拟检测',
          steps: ['点击运行检测', '查看通知列表'],
          expected: ['产生告警通知或提示无异常']
        },
      ];
    default:
      return [];
  }
}

main().catch(err => {
  console.error('生成Excel失败:', err);
  process.exit(1);
});