#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== 测试配置文件加载修复 ===');

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
    const hasErrorHandling = content.includes('try') && content.includes('catch') && content.includes('配置文件不存在');
    console.log('包含错误处理:', hasErrorHandling);
    
    return hasErrorHandling;
  }
  
  return false;
}

function provideTestInstructions() {
  console.log('\n=== 测试说明 ===');
  console.log('1. 重启 Cursor/VSCode');
  console.log('2. 打开开发者工具 (Help > Toggle Developer Tools)');
  console.log('3. 检查控制台是否还有 "Cannot find module" 错误');
  console.log('4. 如果没有配置文件，应该看到 "配置文件不存在，使用默认配置" 的日志');
  console.log('5. 右键点击文件/文件夹，测试 "i18n" 菜单功能');
  console.log('6. 如果还有错误，请截图分享错误信息');
}

function createTestConfig() {
  console.log('\n3. 创建测试配置文件...');
  
  const testConfig = `module.exports = {
  // 引号内的键名标识符，默认为'$t'，例如 $t("key")。
  quoteKeys: "$t",
  // 入口文件 暂时没用。
  entry: ["src"],
  // 输出目录，翻译文件将被生成到此目录下。
  outDir: "src/locales",
  // json的格式 1 扁平化 2 嵌套的格式。
  outShow: 1,
  // 需要从扫描中排除的目录或文件模式。
  exclude: ["src/locales"],
  // 默认源语言
  defaultLanguage: "zh_cn",
  // 目标语言。
  language: [],
  // 语言文件的扩展名 目前只能json了。vscode 中 es6 动态import 不支持 导致 没有好的方式 获取通过 Es module 导出的js jsx语言文件。
  extname: "json",
  // 导入声明的路径，如需自定义导入语句可以设置此项 例如 import $t from @/utils/i18n。
  importDeclarationPath: null,
  // 火山翻译 密钥
  hsAccessKey: "",
  hsSecretKey: "",
};`;
  
  const configPath = path.join(process.cwd(), 'i18n.config.js');
  
  try {
    fs.writeFileSync(configPath, testConfig);
    console.log('✅ 测试配置文件已创建:', configPath);
    console.log('📝 你可以删除这个文件来测试无配置文件的情况');
  } catch (error) {
    console.log('❌ 创建测试配置文件失败:', error.message);
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

createTestConfig();
provideTestInstructions();

console.log('\n=== 检查完成 ===');
console.log('✅ 如果包含错误处理代码，说明修复成功');
console.log('🔧 请重启编辑器并测试功能');
console.log('📁 当前目录已创建测试配置文件，可以删除来测试无配置情况'); 