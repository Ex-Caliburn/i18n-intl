#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== 测试 webpack 打包修复 ===');

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
    
    // 检查是否包含 fs-extra
    const content = fs.readFileSync(extensionJs, 'utf8');
    const hasFsExtra = content.includes('fs-extra') || content.includes('fsExtra');
    console.log('包含 fs-extra:', hasFsExtra);
    
    return hasFsExtra;
  }
  
  return false;
}

function checkPackageJson(extensionPath) {
  console.log(`\n3. 检查 package.json: ${extensionPath}`);
  
  const packageJsonPath = path.join(extensionPath, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log('❌ package.json 不存在');
    return false;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log('插件版本:', packageJson.version);
    console.log('主文件:', packageJson.main);
    
    return true;
  } catch (error) {
    console.log('❌ 解析 package.json 失败:', error.message);
    return false;
  }
}

function provideTestInstructions() {
  console.log('\n=== 测试说明 ===');
  console.log('1. 重启 Cursor/VSCode');
  console.log('2. 打开开发者工具 (Help > Toggle Developer Tools)');
  console.log('3. 检查控制台是否还有 "Cannot find module \'fs-extra\'" 错误');
  console.log('4. 右键点击文件/文件夹，测试 "i18n" 菜单功能');
  console.log('5. 如果还有错误，请截图分享错误信息');
}

// 执行检查
const { vscodeExists, cursorExists, vscodePath, cursorPath } = checkExtensionInstallation();

if (vscodeExists) {
  checkExtensionFiles(vscodePath);
  checkPackageJson(vscodePath);
}

if (cursorExists) {
  checkExtensionFiles(cursorPath);
  checkPackageJson(cursorPath);
}

provideTestInstructions();

console.log('\n=== 检查完成 ===');
console.log('✅ 如果 extension.js 大小超过 1MB 且包含 fs-extra，说明修复成功');
console.log('🔧 请重启编辑器并测试功能'); 