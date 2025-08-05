#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== 测试发布版本打包内容 ===');

function checkExtensionFiles() {
  console.log('\n1. 检查编译后的文件...');
  
  const extensionJs = path.join(process.cwd(), 'out/extension.js');
  
  if (!fs.existsSync(extensionJs)) {
    console.log('❌ extension.js 不存在');
    return false;
  }
  
  const stats = fs.statSync(extensionJs);
  console.log('extension.js 大小:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
  
  // 检查是否包含所有必要的依赖
  const content = fs.readFileSync(extensionJs, 'utf8');
  
  const checks = {
    'fs-extra': content.includes('fs-extra') || content.includes('fsExtra'),
    'vm': content.includes('vm') && content.includes('createContext'),
    'lodash': content.includes('lodash') || content.includes('merge'),
    'exceljs': content.includes('exceljs') || content.includes('ExcelJS'),
    'node-fetch': content.includes('node-fetch') || content.includes('fetch'),
    'bcryptjs': content.includes('bcryptjs') || content.includes('bcrypt'),
    'ejs': content.includes('ejs'),
    'htmlparser2': content.includes('htmlparser2'),
    'jscodeshift': content.includes('jscodeshift'),
    'prettier': content.includes('prettier'),
    'serialize-javascript': content.includes('serialize-javascript'),
    '@babel/core': content.includes('@babel/core'),
    '@babel/traverse': content.includes('@babel/traverse'),
    '@volcengine/openapi': content.includes('@volcengine/openapi'),
    '@vue/compiler-sfc': content.includes('@vue/compiler-sfc')
  };
  
  console.log('\n依赖检查结果:');
  let allPassed = true;
  for (const [dep, included] of Object.entries(checks)) {
    const status = included ? '✅' : '❌';
    console.log(`${status} ${dep}: ${included}`);
    if (!included) {allPassed = false;}
  }
  
  return allPassed;
}

function checkPackageJson() {
  console.log('\n2. 检查 package.json 配置...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log('当前版本:', packageJson.version);
    
    const deps = packageJson.dependencies || {};
    const bundledDeps = packageJson.bundledDependencies || [];
    
    console.log('dependencies 数量:', Object.keys(deps).length);
    console.log('bundledDependencies 数量:', bundledDeps.length);
    
    // 检查关键依赖是否在 dependencies 中
    const criticalDeps = ['fs-extra', 'lodash', 'exceljs', 'node-fetch'];
    for (const dep of criticalDeps) {
      const inDeps = dep in deps;
      const inBundled = bundledDeps.includes(dep);
      console.log(`${dep}: dependencies=${inDeps}, bundled=${inBundled}`);
    }
    
    return true;
  } catch (error) {
    console.log('❌ 读取 package.json 失败:', error.message);
    return false;
  }
}

function providePublishInstructions() {
  console.log('\n=== 发布说明 ===');
  console.log('1. 确保所有依赖都在 dependencies 中');
  console.log('2. 确保 bundledDependencies 包含关键依赖');
  console.log('3. 使用 webpack 打包所有依赖到 extension.js');
  console.log('4. 发布前测试本地安装的插件');
  console.log('5. 使用 yarn publish:patch 发布');
  console.log('6. 发布后验证应用商店版本');
}

// 执行检查
const filesOk = checkExtensionFiles();
const configOk = checkPackageJson();

providePublishInstructions();

console.log('\n=== 检查完成 ===');
if (filesOk && configOk) {
  console.log('✅ 打包配置正确，可以发布');
  console.log('📦 建议先测试本地安装，再发布到应用商店');
} else {
  console.log('❌ 打包配置有问题，需要修复');
} 