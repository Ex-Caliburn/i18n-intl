#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== 测试打包修复 ===');

function checkExtensionInstallation() {
  console.log('\n1. 检查插件安装状态...');
  
  const vscodeExtensions = path.join(process.env.HOME, '.vscode/extensions');
  const cursorExtensions = path.join(process.env.HOME, '.cursor/extensions');
  
  const vscodePath = path.join(vscodeExtensions, 'jaylee.jaylee-i18n-11.0.7');
  const cursorPath = path.join(cursorExtensions, 'jaylee.jaylee-i18n-11.0.7');
  
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
  const nodeModules = path.join(extensionPath, 'node_modules');
  
  console.log('extension.js 存在:', fs.existsSync(extensionJs));
  console.log('package.json 存在:', fs.existsSync(packageJson));
  console.log('node_modules 存在:', fs.existsSync(nodeModules));
  
  if (fs.existsSync(extensionJs)) {
    const stats = fs.statSync(extensionJs);
    console.log('extension.js 大小:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
    
    // 检查是否包含所有必要的依赖
    const content = fs.readFileSync(extensionJs, 'utf8');
    const hasFsExtra = content.includes('fs-extra') || content.includes('fsExtra');
    const hasVm = content.includes('vm') && content.includes('createContext');
    const hasLodash = content.includes('lodash') || content.includes('merge');
    const hasExceljs = content.includes('exceljs') || content.includes('ExcelJS');
    
    console.log('包含 fs-extra:', hasFsExtra);
    console.log('包含 vm:', hasVm);
    console.log('包含 lodash:', hasLodash);
    console.log('包含 exceljs:', hasExceljs);
    
    return hasFsExtra && hasVm && hasLodash;
  }
  
  return false;
}

function checkPackageJson() {
  console.log('\n3. 检查 package.json 配置...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log('当前版本:', packageJson.version);
    console.log('package 脚本:', packageJson.scripts.package);
    
    const hasBundledDeps = packageJson.bundledDependencies && packageJson.bundledDependencies.length > 0;
    console.log('包含 bundledDependencies:', hasBundledDeps);
    
    if (hasBundledDeps) {
      console.log('打包的依赖:', packageJson.bundledDependencies);
    }
    
    return true;
  } catch (error) {
    console.log('❌ 读取 package.json 失败:', error.message);
    return false;
  }
}

function provideTestInstructions() {
  console.log('\n=== 测试说明 ===');
  console.log('1. 重启 Cursor/VSCode');
  console.log('2. 打开开发者工具 (Help > Toggle Developer Tools)');
  console.log('3. 检查控制台是否还有 "Cannot find module" 错误');
  console.log('4. 应该看到 "成功加载配置文件" 的消息');
  console.log('5. 测试在线翻译功能');
  console.log('6. 测试装饰器功能');
  console.log('7. 右键点击文件/文件夹，测试 "i18n" 菜单功能');
  console.log('8. 如果还有错误，请截图分享错误信息');
}

// 执行检查
const { vscodeExists, cursorExists, vscodePath, cursorPath } = checkExtensionInstallation();

if (vscodeExists) {
  checkExtensionFiles(vscodePath);
}

if (cursorExists) {
  checkExtensionFiles(cursorPath);
}

checkPackageJson();
provideTestInstructions();

console.log('\n=== 检查完成 ===');
console.log('✅ 如果包含所有依赖，说明打包修复成功');
console.log('🔧 请重启编辑器并测试功能');
console.log('📁 插件现在应该能够正确处理所有依赖'); 