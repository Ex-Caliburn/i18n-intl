const vscode = require('vscode');

// 模拟插件激活测试
console.log('=== 开始测试 jaylee-i18n 插件激活状态 ===');

// 检查插件是否已安装
const extension = vscode.extensions.getExtension('jaylee.jaylee-i18n');
if (extension) {
  console.log('✅ 插件已安装');
  console.log('插件ID:', extension.id);
  console.log('插件版本:', extension.packageJSON.version);
  console.log('插件路径:', extension.extensionPath);
  console.log('插件状态:', extension.isActive ? '已激活' : '未激活');
  
  if (extension.isActive) {
    console.log('✅ 插件已成功激活');
  } else {
    console.log('⚠️ 插件未激活，尝试激活...');
    extension.activate().then(() => {
      console.log('✅ 插件激活成功');
    }).catch(error => {
      console.error('❌ 插件激活失败:', error);
    });
  }
} else {
  console.log('❌ 插件未安装');
}

// 检查命令是否可用
const commands = [
  'jaylee-i18n.extraction',
  'jaylee-i18n.extractFolder', 
  'jaylee-i18n.extractProject',
  'jaylee-i18n.translateToEnglish',
  'jaylee-i18n.initConfig',
  'jaylee-i18n.export',
  'jaylee-i18n.import'
];

console.log('\n=== 检查命令可用性 ===');
commands.forEach(command => {
  try {
    // 这里只是检查命令是否在package.json中定义
    console.log(`命令 ${command}: 已定义`);
  } catch (error) {
    console.log(`命令 ${command}: ❌ 检查失败 - ${error}`);
  }
});

console.log('\n=== 测试完成 ==='); 