#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== 测试根路径获取修复 ===');

function checkExtensionInstallation() {
  console.log('\n1. 检查插件安装状态...');
  
  const vscodeExtensions = path.join(process.env.HOME, '.vscode/extensions');
  const cursorExtensions = path.join(process.env.HOME, '.cursor/extensions');
  
  const vscodePath = path.join(vscodeExtensions, 'jaylee.jaylee-i18n-11.0.5');
  const cursorPath = path.join(cursorExtensions, 'jaylee.jaylee-i18n-11.0.5');
  
  console.log('VSCode 插件路径:', vscodePath);
  console.log('Cursor 插件路径:', cursorPath);
  
  const vscodeExists = fs.existsSync(vscodePath);
  const cursorExists = fs.existsSync(cursorPath);
  
  console.log('VSCode 插件存在:', vscodeExists);
  console.log('Cursor 插件存在:', cursorExists);
  
  return { vscodeExists, cursorExists, vscodePath, cursorPath };
}

function checkExtensionFiles(extensionPath) {
  console.log(`\n2. 检查插件文件: ${extensionPath}`);
  
  if (!fs.existsSync(extensionPath)) {
    console.log('❌ 插件路径不存在');
    return false;
  }
  
  const extensionJs = path.join(extensionPath, 'out/extension.js');
  const packageJson = path.join(extensionPath, 'package.json');
  
  console.log('extension.js 存在:', fs.existsSync(extensionJs));
  console.log('package.json 存在:', fs.existsSync(packageJson));
  
  if (fs.existsSync(extensionJs)) {
    const stats = fs.statSync(extensionJs);
    console.log('extension.js 大小:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
    
    // 检查是否包含错误处理代码
    const content = fs.readFileSync(extensionJs, 'utf8');
    const hasErrorHandling = content.includes('try') && content.includes('catch') && content.includes('workspaceFolders');
    const hasHelperErrorHandling = content.includes('getKeyPositions') && content.includes('获取key位置时出错');
    console.log('包含根路径错误处理:', hasErrorHandling);
    console.log('包含装饰器错误处理:', hasHelperErrorHandling);
    
    return hasErrorHandling && hasHelperErrorHandling;
  }
  
  return false;
}

function provideTestInstructions() {
  console.log('\n=== 测试说明 ===');
  console.log('1. 重启 Cursor/VSCode');
  console.log('2. 打开开发者工具 (Help > Toggle Developer Tools)');
  console.log('3. 检查控制台是否还有 "Cannot find module" 错误');
  console.log('4. 应该看到 "配置文件不存在，使用默认配置" 或 "成功加载配置文件" 的日志');
  console.log('5. 装饰器功能应该正常工作，即使没有配置文件');
  console.log('6. 右键点击文件/文件夹，测试 "i18n" 菜单功能');
  console.log('7. 如果还有错误，请截图分享错误信息');
}

function checkCurrentProject() {
  console.log('\n3. 检查当前项目...');
  
  const currentDir = process.cwd();
  console.log('当前目录:', currentDir);
  
  const configPath = path.join(currentDir, 'i18n.config.js');
  const configExists = fs.existsSync(configPath);
  console.log('i18n.config.js 存在:', configExists);
  
  if (configExists) {
    try {
      const config = require(configPath);
      console.log('配置文件内容:', JSON.stringify(config, null, 2));
    } catch (error) {
      console.log('❌ 读取配置文件失败:', error.message);
    }
  }
  
  // 检查是否有其他可能的项目根目录
  const possibleRoots = [
    path.join(currentDir, '..', 'EC-Admin'),
    path.join(currentDir, '..', '..', 'EC-Admin'),
    path.join(currentDir, '..', '..', '..', 'EC-Admin')
  ];
  
  for (const root of possibleRoots) {
    if (fs.existsSync(root)) {
      console.log('发现可能的项目根目录:', root);
      const rootConfig = path.join(root, 'i18n.config.js');
      if (fs.existsSync(rootConfig)) {
        console.log('✅ 找到配置文件:', rootConfig);
      }
    }
  }
}

// 执行检查
const { vscodeExists, cursorExists, vscodePath, cursorPath } = checkExtensionInstallation();

if (vscodeExists) {
  checkExtensionFiles(vscodePath);
}

if (cursorExists) {
  checkExtensionFiles(cursorPath);
}

checkCurrentProject();
provideTestInstructions();

console.log('\n=== 检查完成 ===');
console.log('✅ 如果包含错误处理代码，说明修复成功');
console.log('🔧 请重启编辑器并测试功能');
console.log('📁 插件现在应该能够正确处理各种项目结构'); 