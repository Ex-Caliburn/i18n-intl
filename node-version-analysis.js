#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== Node.js 版本对插件的影响分析 ===');

// 当前 Node.js 版本信息
function analyzeCurrentNodeVersion() {
  console.log('\n=== 当前环境信息 ===');
  console.log('Node.js 版本:', process.version);
  console.log('平台:', process.platform);
  console.log('架构:', process.arch);
  console.log('V8 版本:', process.versions.v8);
  
  const major = parseInt(process.version.slice(1).split('.')[0]);
  const minor = parseInt(process.version.slice(1).split('.')[1]);
  
  console.log('\n=== 版本兼容性分析 ===');
  
  if (major < 14) {
    console.log('❌ Node.js 版本过低 (< 14)');
    console.log('   - 可能导致 Buffer 弃用警告');
    console.log('   - 某些 ES6+ 特性不可用');
    console.log('   - 建议升级到 Node.js 16+');
  } else if (major === 14) {
    console.log('⚠️ Node.js 14.x (当前版本)');
    console.log('   - 基本功能可用');
    console.log('   - 会有 Buffer 弃用警告');
    console.log('   - 建议升级到 Node.js 16+');
  } else if (major === 16) {
    console.log('✅ Node.js 16.x (推荐)');
    console.log('   - 功能完整');
    console.log('   - 性能更好');
    console.log('   - 减少弃用警告');
  } else if (major >= 18) {
    console.log('✅ Node.js 18+ (最佳)');
    console.log('   - 最新特性支持');
    console.log('   - 最佳性能');
    console.log('   - 长期支持版本');
  }
}

// 检查依赖包兼容性
function checkDependencyCompatibility() {
  console.log('\n=== 依赖包兼容性检查 ===');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // 检查关键依赖的版本要求
  const criticalDeps = {
    'fs-extra': '^11.2.0',
    'exceljs': '^4.4.0',
    'htmlparser2': '^9.1.0',
    'bcryptjs': '^2.4.3',
    'node-fetch': '^2.6.7'
  };
  
  Object.keys(criticalDeps).forEach(dep => {
    if (dependencies[dep]) {
      console.log(`✅ ${dep}: ${dependencies[dep]}`);
      
      // 检查版本兼容性
      const version = dependencies[dep];
      if (version.includes('^11') || version.includes('^4') || version.includes('^9')) {
        console.log(`   - 需要 Node.js 14+ 支持`);
      }
    } else {
      console.log(`❌ ${dep}: 缺失`);
    }
  });
}

// 检查 VSCode 引擎要求
function checkVSCodeEngine() {
  console.log('\n=== VSCode 引擎要求 ===');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const engines = packageJson.engines;
  
  if (engines && engines.vscode) {
    console.log('VSCode 引擎要求:', engines.vscode);
    
    // 解析版本要求
    const version = engines.vscode;
    if (version.includes('^1.87')) {
      console.log('✅ 支持最新的 VSCode 版本');
      console.log('   - 需要 Node.js 16+ 运行时');
    }
  }
}

// 分析 Buffer 弃用问题
function analyzeBufferDeprecation() {
  console.log('\n=== Buffer 弃用问题分析 ===');
  
  const major = parseInt(process.version.slice(1).split('.')[0]);
  
  if (major < 16) {
    console.log('⚠️ 当前 Node.js 版本会有 Buffer 弃用警告');
    console.log('原因:');
    console.log('  - Buffer() 构造函数在 Node.js 10+ 中被弃用');
    console.log('  - 依赖包可能仍在使用旧的 Buffer 构造函数');
    console.log('  - Node.js 14 仍然显示这些警告');
    
    console.log('\n解决方案:');
    console.log('1. 升级到 Node.js 16+:');
    console.log('   nvm install 16');
    console.log('   nvm use 16');
    
    console.log('\n2. 设置环境变量忽略警告:');
    console.log('   export NODE_OPTIONS="--no-deprecation"');
    
    console.log('\n3. 更新依赖包:');
    console.log('   yarn upgrade');
  } else {
    console.log('✅ Node.js 16+ 版本，Buffer 弃用警告较少');
  }
}

// 检查 TypeScript 编译兼容性
function checkTypeScriptCompatibility() {
  console.log('\n=== TypeScript 编译兼容性 ===');
  
  const tsConfigPath = 'tsconfig.json';
  if (fs.existsSync(tsConfigPath)) {
    try {
      const content = fs.readFileSync(tsConfigPath, 'utf8');
      // 移除注释以避免 JSON 解析错误
      const cleanContent = content.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/gm, '');
      const tsConfig = JSON.parse(cleanContent);
      
      console.log('TypeScript 配置:');
      console.log('  target:', tsConfig.compilerOptions?.target || '未设置');
      console.log('  module:', tsConfig.compilerOptions?.module || '未设置');
      console.log('  lib:', tsConfig.compilerOptions?.lib || '未设置');
      
      const target = tsConfig.compilerOptions?.target;
      if (target === 'ES2020' || target === 'ES2021' || target === 'ES2022') {
        console.log('✅ 使用现代 ES 目标，需要 Node.js 14+');
      } else if (target === 'ES2018' || target === 'ES2019') {
        console.log('⚠️ 使用较旧的 ES 目标，兼容性较好');
      }
    } catch (error) {
      console.log('❌ 解析 tsconfig.json 失败:', error.message);
    }
  }
}

// 提供升级建议
function provideUpgradeSuggestions() {
  console.log('\n=== 升级建议 ===');
  
  const major = parseInt(process.version.slice(1).split('.')[0]);
  
  if (major < 16) {
    console.log('🚀 强烈建议升级 Node.js 版本:');
    console.log('\n1. 使用 nvm 管理 Node.js 版本:');
    console.log('   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash');
    console.log('   nvm install 18');
    console.log('   nvm use 18');
    
    console.log('\n2. 或者使用 Homebrew:');
    console.log('   brew install node@18');
    console.log('   brew link node@18');
    
    console.log('\n3. 升级后重新安装依赖:');
    console.log('   rm -rf node_modules');
    console.log('   yarn install');
    console.log('   yarn compile');
    
    console.log('\n4. 验证升级:');
    console.log('   node --version');
    console.log('   yarn --version');
  } else {
    console.log('✅ 当前 Node.js 版本符合要求');
    console.log('建议保持当前版本以获得最佳稳定性');
  }
}

// 检查性能影响
function analyzePerformanceImpact() {
  console.log('\n=== 性能影响分析 ===');
  
  const major = parseInt(process.version.slice(1).split('.')[0]);
  
  if (major < 16) {
    console.log('⚠️ Node.js 14 的性能影响:');
    console.log('  - 启动时间可能较长');
    console.log('  - 内存使用可能较高');
    console.log('  - 某些现代特性不可用');
  } else {
    console.log('✅ Node.js 16+ 的性能优势:');
    console.log('  - 更快的启动时间');
    console.log('  - 更好的内存管理');
    console.log('  - 支持现代 JavaScript 特性');
  }
}

// 运行所有分析
analyzeCurrentNodeVersion();
checkDependencyCompatibility();
checkVSCodeEngine();
analyzeBufferDeprecation();
checkTypeScriptCompatibility();
provideUpgradeSuggestions();
analyzePerformanceImpact();

console.log('\n=== 分析完成 ===');
console.log('\n📝 总结:');
console.log('- Node.js 版本确实会影响插件功能和性能');
console.log('- 建议使用 Node.js 16+ 版本');
console.log('- 当前版本 (14.21.0) 基本可用但会有警告');
console.log('- 升级 Node.js 版本可以解决大部分兼容性问题'); 