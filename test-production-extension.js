#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== 生产环境插件测试 ===');

// 检查插件安装状态
function checkExtensionInstallation() {
  console.log('\n=== 检查插件安装状态 ===');
  
  // 检查 VSCode 插件目录
  const vscodeExtensionsDir = path.join(process.env.HOME, '.vscode', 'extensions');
  const cursorExtensionsDir = path.join(process.env.HOME, '.cursor', 'extensions');
  
  const extensionDirs = [vscodeExtensionsDir, cursorExtensionsDir];
  
  extensionDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`检查目录: ${dir}`);
      const items = fs.readdirSync(dir);
      const jayleeExtensions = items.filter(item => item.includes('jaylee'));
      
      if (jayleeExtensions.length > 0) {
        console.log(`✅ 找到插件: ${jayleeExtensions.join(', ')}`);
        
        // 检查每个插件版本
        jayleeExtensions.forEach(ext => {
          const extPath = path.join(dir, ext);
          const packageJsonPath = path.join(extPath, 'package.json');
          
          if (fs.existsSync(packageJsonPath)) {
            try {
              const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
              console.log(`  - ${ext}: v${packageJson.version}`);
              
              // 检查是否有 out 目录
              const outDir = path.join(extPath, 'out');
              if (fs.existsSync(outDir)) {
                console.log(`    ✅ 包含编译文件`);
                
                // 检查关键文件
                const keyFiles = ['extension.js', 'command/index.js', 'utils/index.js'];
                keyFiles.forEach(file => {
                  const filePath = path.join(outDir, file);
                  if (fs.existsSync(filePath)) {
                    console.log(`    ✅ ${file} 存在`);
                  } else {
                    console.log(`    ❌ ${file} 缺失`);
                  }
                });
              } else {
                console.log(`    ❌ 缺少编译文件`);
              }
            } catch (error) {
              console.log(`    ❌ 解析 package.json 失败: ${error.message}`);
            }
          }
        });
      } else {
        console.log('❌ 未找到 jaylee 插件');
      }
    } else {
      console.log(`目录不存在: ${dir}`);
    }
  });
}

// 检查插件功能
function checkExtensionFunctionality() {
  console.log('\n=== 检查插件功能 ===');
  
  // 检查命令定义
  const packageJsonPath = 'package.json';
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const commands = packageJson.contributes?.commands || [];
    
    console.log(`定义的命令数量: ${commands.length}`);
    
    const expectedCommands = [
      'jaylee-i18n.extraction',
      'jaylee-i18n.extractFolder',
      'jaylee-i18n.extractProject',
      'jaylee-i18n.translateToEnglish',
      'jaylee-i18n.initConfig',
      'jaylee-i18n.export',
      'jaylee-i18n.import'
    ];
    
    expectedCommands.forEach(cmd => {
      const found = commands.find(c => c.command === cmd);
      if (found) {
        console.log(`✅ ${cmd}: ${found.title}`);
      } else {
        console.log(`❌ ${cmd}: 未找到`);
      }
    });
  }
}

// 检查编译输出
function checkCompiledOutput() {
  console.log('\n=== 检查编译输出 ===');
  
  const outDir = 'out';
  if (!fs.existsSync(outDir)) {
    console.log('❌ out 目录不存在');
    return;
  }
  
  const keyFiles = [
    'extension.js',
    'command/index.js',
    'command/initConfig.js',
    'command/extraction.js',
    'utils/index.js'
  ];
  
  keyFiles.forEach(file => {
    const filePath = path.join(outDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file}: 存在`);
      
      // 检查文件大小
      const stats = fs.statSync(filePath);
      console.log(`   大小: ${(stats.size / 1024).toFixed(2)} KB`);
      
      // 检查是否包含关键引用
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('fs-extra')) {
        console.log(`   ✅ 包含 fs-extra 引用`);
      } else {
        console.log(`   ❌ 不包含 fs-extra 引用`);
      }
    } else {
      console.log(`❌ ${file}: 不存在`);
    }
  });
}

// 检查打包文件
function checkPackageFile() {
  console.log('\n=== 检查打包文件 ===');
  
  const vsixFiles = fs.readdirSync('.').filter(file => file.endsWith('.vsix'));
  
  if (vsixFiles.length > 0) {
    console.log(`找到打包文件: ${vsixFiles.join(', ')}`);
    
    vsixFiles.forEach(file => {
      const stats = fs.statSync(file);
      console.log(`  ${file}: ${(stats.size / 1024).toFixed(2)} KB`);
    });
  } else {
    console.log('❌ 未找到打包文件');
  }
}

// 提供测试建议
function provideTestSuggestions() {
  console.log('\n=== 测试建议 ===');
  
  console.log('1. 重启 Cursor/VSCode:');
  console.log('   - 完全关闭编辑器');
  console.log('   - 重新打开编辑器');
  
  console.log('\n2. 检查插件激活:');
  console.log('   - 打开开发者工具 (Cmd+Shift+P → Developer: Toggle Developer Tools)');
  console.log('   - 查看 Console 标签页');
  console.log('   - 观察是否有激活错误');
  
  console.log('\n3. 测试插件功能:');
  console.log('   - 右键点击文件/文件夹');
  console.log('   - 选择 "i18n" 菜单');
  console.log('   - 测试各个命令');
  
  console.log('\n4. 如果仍有问题:');
  console.log('   - 卸载插件: code --uninstall-extension jaylee.jaylee-i18n');
  console.log('   - 重新安装: code --install-extension jaylee-i18n-11.0.5.vsix');
  console.log('   - 清除缓存: 删除 ~/.cursor/extensions 中的旧版本');
}

// 运行所有检查
checkExtensionInstallation();
checkExtensionFunctionality();
checkCompiledOutput();
checkPackageFile();
provideTestSuggestions();

console.log('\n=== 测试完成 ===');
console.log('\n📝 下一步:');
console.log('1. 重启 Cursor/VSCode');
console.log('2. 测试插件功能');
console.log('3. 检查是否还有 fs-extra 错误');
console.log('4. 如果正常，说明生产环境问题已解决'); 