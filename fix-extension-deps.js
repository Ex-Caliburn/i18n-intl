#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== 修复插件依赖问题 ===');

// 检查当前插件安装状态
function checkExtensionInstallation() {
  console.log('\n=== 检查插件安装状态 ===');
  
  // 检查是否有已安装的插件
  const extensionDirs = [
    path.join(process.env.HOME, '.vscode', 'extensions'),
    path.join(process.env.HOME, '.cursor', 'extensions'),
    '/Applications/Cursor.app/Contents/Resources/app/extensions'
  ];
  
  extensionDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`检查目录: ${dir}`);
      const items = fs.readdirSync(dir);
      const jayleeExtensions = items.filter(item => item.includes('jaylee'));
      if (jayleeExtensions.length > 0) {
        console.log(`找到插件: ${jayleeExtensions.join(', ')}`);
      } else {
        console.log('未找到 jaylee 插件');
      }
    } else {
      console.log(`目录不存在: ${dir}`);
    }
  });
}

// 检查 package.json 中的依赖
function checkDependencies() {
  console.log('\n=== 检查依赖配置 ===');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = packageJson.dependencies || {};
  
  console.log('当前依赖:');
  Object.keys(dependencies).forEach(dep => {
    console.log(`  ${dep}: ${dependencies[dep]}`);
  });
  
  // 检查关键依赖
  const criticalDeps = ['fs-extra', 'vscode'];
  criticalDeps.forEach(dep => {
    if (dependencies[dep]) {
      console.log(`✅ ${dep}: ${dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep}: 缺失`);
    }
  });
}

// 检查编译输出
function checkCompiledOutput() {
  console.log('\n=== 检查编译输出 ===');
  
  const outDir = 'out';
  if (!fs.existsSync(outDir)) {
    console.log('❌ out 目录不存在，请先运行 yarn compile');
    return;
  }
  
  const files = [
    'extension.js',
    'command/index.js',
    'command/initConfig.js',
    'utils/index.js'
  ];
  
  files.forEach(file => {
    const filePath = path.join(outDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file}: 存在`);
      
      // 检查是否包含 fs-extra 引用
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('fs-extra')) {
        console.log(`  ✅ 包含 fs-extra 引用`);
      } else {
        console.log(`  ❌ 不包含 fs-extra 引用`);
      }
    } else {
      console.log(`❌ ${file}: 不存在`);
    }
  });
}

// 提供解决方案
function provideSolutions() {
  console.log('\n=== 解决方案 ===');
  
  console.log('1. 重新编译项目:');
  console.log('   yarn compile');
  
  console.log('\n2. 重新安装依赖:');
  console.log('   yarn install');
  
  console.log('\n3. 卸载并重新安装插件:');
  console.log('   code --uninstall-extension jaylee.jaylee-i18n');
  console.log('   code --install-extension jaylee-i18n-11.0.3.vsix');
  
  console.log('\n4. 使用开发模式测试:');
  console.log('   code --extensionDevelopmentPath=/Users/relx/workspace/relx-i18n-vscode');
  
  console.log('\n5. 检查 Node.js 版本:');
  console.log('   当前版本:', process.version);
  console.log('   建议使用 Node.js 16+ 版本');
  
  console.log('\n6. 如果仍有问题，可以尝试:');
  console.log('   - 清除 VSCode/Cursor 缓存');
  console.log('   - 重启编辑器');
  console.log('   - 检查防火墙设置');
}

// 检查 Buffer 弃用警告
function checkBufferDeprecation() {
  console.log('\n=== Buffer 弃用警告解决方案 ===');
  
  console.log('1. 设置环境变量忽略警告:');
  console.log('   export NODE_OPTIONS="--no-deprecation"');
  console.log('   code .');
  
  console.log('\n2. 或者在启动时设置:');
  console.log('   NODE_OPTIONS="--no-deprecation" code .');
  
  console.log('\n3. 更新依赖包:');
  console.log('   yarn upgrade');
  
  console.log('\n4. 检查是否有使用旧 Buffer 构造函数的地方:');
  console.log('   node fix-buffer-deprecation.js');
}

// 运行所有检查
checkExtensionInstallation();
checkDependencies();
checkCompiledOutput();
provideSolutions();
checkBufferDeprecation();

console.log('\n=== 修复建议完成 ===');
console.log('\n📝 优先级:');
console.log('1. 首先解决 fs-extra 模块缺失问题');
console.log('2. 然后处理 Buffer 弃用警告');
console.log('3. 最后测试插件功能'); 