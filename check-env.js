const fs = require('fs');
const path = require('path');

console.log('=== 环境检查 ===');

// 检查 Node.js 版本
const nodeVersion = process.version;
console.log(`Node.js 版本: ${nodeVersion}`);

// 检查必要的模块
const requiredModules = ['crypto', 'querystring', 'node-fetch'];
const missingModules = [];

for (const module of requiredModules) {
  try {
    require(module);
    console.log(`✅ ${module} 模块可用`);
  } catch (error) {
    console.log(`❌ ${module} 模块缺失`);
    missingModules.push(module);
  }
}

// 检查测试文件
const testFiles = ['test-simple.js', 'test-advanced.js'];
for (const file of testFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} 文件存在`);
  } else {
    console.log(`❌ ${file} 文件缺失`);
  }
}

// 检查 package.json
if (fs.existsSync('package.json')) {
  console.log('✅ package.json 文件存在');
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (packageJson.dependencies && packageJson.dependencies['node-fetch']) {
      console.log('✅ node-fetch 依赖已安装');
    } else {
      console.log('❌ node-fetch 依赖未安装');
    }
  } catch (error) {
    console.log('❌ package.json 解析失败');
  }
} else {
  console.log('❌ package.json 文件缺失');
}

console.log('\n=== 检查结果 ===');

if (missingModules.length > 0) {
  console.log('❌ 缺少必要的模块，请运行以下命令安装：');
  console.log('npm install node-fetch');
} else {
  console.log('✅ 环境检查通过');
  console.log('');
  console.log('下一步：');
  console.log('1. 获取火山翻译API密钥');
  console.log('2. 修改测试文件中的密钥');
  console.log('3. 运行测试: node test-simple.js');
}

console.log('=================='); 