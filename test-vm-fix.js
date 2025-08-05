#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== 测试 vm 配置加载修复 ===');

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
    
    // 检查是否包含 vm 相关代码
    const content = fs.readFileSync(extensionJs, 'utf8');
    const hasVmCode = content.includes('vm') && content.includes('createContext') && content.includes('runInContext');
    const hasLoadConfig = content.includes('loadConfig') || content.includes('readFileSync');
    console.log('包含 vm 代码:', hasVmCode);
    console.log('包含 loadConfig:', hasLoadConfig);
    
    return hasVmCode || hasLoadConfig;
  }
  
  return false;
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

function testVmConfigLoading() {
  console.log('\n3. 测试 vm 配置加载...');
  
  const vm = require('vm');
  const testConfig = `module.exports = {
    quoteKeys: "$t",
    entry: ["src"],
    outDir: "src/locales",
    outShow: 1,
    exclude: ["src/locales"],
    defaultLanguage: "zh_cn",
    language: [],
    extname: "json",
    importDeclarationPath: null,
    hsAccessKey: "",
    hsSecretKey: "",
  };`;
  
  const testConfigPath = path.join(process.cwd(), 'test-config.js');
  
  try {
    // 写入测试配置文件
    fs.writeFileSync(testConfigPath, testConfig);
    console.log('✅ 测试配置文件已创建:', testConfigPath);
    
    // 测试 vm 加载
    const code = fs.readFileSync(testConfigPath, 'utf-8');
    const sandbox = { module: { exports: {} }, exports: {} };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox, { filename: testConfigPath });
    const config = sandbox.module.exports;
    
    console.log('✅ vm 配置加载成功:', JSON.stringify(config, null, 2));
    
    // 清理测试文件
    fs.unlinkSync(testConfigPath);
    console.log('✅ 测试文件已清理');
    
  } catch (error) {
    console.log('❌ vm 配置加载测试失败:', error.message);
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

testVmConfigLoading();
provideTestInstructions();

console.log('\n=== 检查完成 ===');
console.log('✅ 如果包含 vm 代码，说明修复成功');
console.log('🔧 请重启编辑器并测试功能');
console.log('📁 插件现在应该能够正确加载 JS 配置文件'); 