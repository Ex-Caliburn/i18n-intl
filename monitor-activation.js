#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== jaylee-i18n 插件激活状态监控 ===');

// 检查编译后的激活日志
function checkActivationLogs() {
  const extensionJsPath = path.join(__dirname, 'out', 'extension.js');
  
  if (!fs.existsSync(extensionJsPath)) {
    console.log('❌ 编译文件不存在，请先运行 yarn compile');
    return;
  }
  
  const content = fs.readFileSync(extensionJsPath, 'utf8');
  
  // 检查关键激活日志
  const activationChecks = [
    { key: 'jaylee-i18n 插件开始激活', name: '激活开始日志' },
    { key: '插件ID:', name: '插件信息日志' },
    { key: '工作区文件夹数量:', name: '工作区检查' },
    { key: '开始注册项目配置命令', name: '命令注册日志' },
    { key: '✅ 项目配置命令注册成功', name: '配置命令注册' },
    { key: '✅ 提取命令注册成功', name: '提取命令注册' },
    { key: '✅ 导出命令注册成功', name: '导出命令注册' },
    { key: '✅ 导入命令注册成功', name: '导入命令注册' },
    { key: '✅ 在线翻译命令注册成功', name: '翻译命令注册' },
    { key: '✅ 装饰器功能注册成功', name: '装饰器注册' },
    { key: '✅ 代码补全功能注册成功', name: '补全功能注册' },
    { key: '检查文件系统权限', name: '权限检查' },
    { key: '检查网络连接', name: '网络检查' },
    { key: '🎉 插件激活流程全部完成', name: '激活完成标志' }
  ];
  
  console.log('\n=== 激活日志检查 ===');
  let passedChecks = 0;
  
  activationChecks.forEach(check => {
    if (content.includes(check.key)) {
      console.log(`✅ ${check.name}: 已包含`);
      passedChecks++;
    } else {
      console.log(`❌ ${check.name}: 未找到`);
    }
  });
  
  console.log(`\n激活日志检查结果: ${passedChecks}/${activationChecks.length} 通过`);
  
  if (passedChecks === activationChecks.length) {
    console.log('🎉 所有激活日志检查通过！');
  } else {
    console.log('⚠️ 部分激活日志缺失，请检查代码');
  }
}

// 检查命令定义
function checkCommandDefinitions() {
  const packageJsonPath = path.join(__dirname, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log('❌ package.json 不存在');
    return;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const commands = packageJson.contributes?.commands || [];
  const activationEvents = packageJson.activationEvents || [];
  
  console.log('\n=== 命令定义检查 ===');
  console.log(`定义的命令数量: ${commands.length}`);
  console.log(`激活事件数量: ${activationEvents.length}`);
  
  const expectedCommands = [
    'jaylee-i18n.extraction',
    'jaylee-i18n.extractFolder',
    'jaylee-i18n.extractProject',
    'jaylee-i18n.translateToEnglish',
    'jaylee-i18n.initConfig',
    'jaylee-i18n.export',
    'jaylee-i18n.import'
  ];
  
  let commandChecks = 0;
  expectedCommands.forEach(cmd => {
    const found = commands.find(c => c.command === cmd);
    if (found) {
      console.log(`✅ ${cmd}: ${found.title}`);
      commandChecks++;
    } else {
      console.log(`❌ ${cmd}: 未找到`);
    }
  });
  
  console.log(`\n命令定义检查结果: ${commandChecks}/${expectedCommands.length} 通过`);
}

// 检查错误处理
function checkErrorHandling() {
  const extensionJsPath = path.join(__dirname, 'out', 'extension.js');
  const content = fs.readFileSync(extensionJsPath, 'utf8');
  
  console.log('\n=== 错误处理检查 ===');
  
  const errorChecks = [
    { key: 'try {', name: 'Try 块' },
    { key: '} catch (error)', name: 'Catch 块' },
    { key: 'console.error', name: '错误日志' },
    { key: 'vscode.window.showErrorMessage', name: '错误提示' }
  ];
  
  errorChecks.forEach(check => {
    if (content.includes(check.key)) {
      console.log(`✅ ${check.name}: 已包含`);
    } else {
      console.log(`❌ ${check.name}: 未找到`);
    }
  });
}

// 运行所有检查
checkActivationLogs();
checkCommandDefinitions();
checkErrorHandling();

console.log('\n=== 监控完成 ===');
console.log('\n📋 查看激活日志的步骤:');
console.log('1. 在 VSCode 中按 Cmd+Shift+P 打开命令面板');
console.log('2. 输入 "Developer: Toggle Developer Tools" 打开开发者工具');
console.log('3. 在开发者工具中点击 "Console" 标签页');
console.log('4. 按 Cmd+Shift+P 输入 "Developer: Reload Window" 重新加载窗口');
console.log('5. 观察控制台输出的激活日志');
console.log('\n🔍 如果看不到激活日志，请检查:');
console.log('- 插件是否正确安装');
console.log('- 是否有语法错误');
console.log('- 开发者工具是否正确打开'); 