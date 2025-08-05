import * as vscode from "vscode";
import {
  extraction,
  initConfig,
  exportExcel,
  importExcel,
  translateToEnglish,
} from "./command/index";
import Annotator from "./editor/annotator";
import { KeyCompletionProvider } from "./editor/keyCompletion";

export async function activate(context: vscode.ExtensionContext) {
  console.log('=== jaylee-i18n 插件开始激活 ===');
  console.log('激活时间:', new Date().toISOString());
  console.log('插件ID:', context.extension.id);
  console.log('插件版本:', context.extension.packageJSON.version);
  console.log('插件路径:', context.extension.extensionPath);
  console.log('全局存储路径:', context.globalStorageUri.fsPath);
  console.log('工作区存储路径:', context.workspaceState);
  
  try {
    // 检查工作区状态
    const workspaceFolders = vscode.workspace.workspaceFolders;
    console.log('工作区文件夹数量:', workspaceFolders?.length || 0);
    if (workspaceFolders && workspaceFolders.length > 0) {
      console.log('当前工作区路径:', workspaceFolders[0].uri.fsPath);
    }
    
    // 检查插件配置
    const config = vscode.workspace.getConfiguration('jaylee-i18n');
    console.log('插件配置:', config);
    
    // 项目配置
    console.log('开始注册项目配置命令...');
    initConfig(context);
    console.log('✅ 项目配置命令注册成功');
    
    // 提取
    console.log('开始注册提取命令...');
    extraction(context);
    console.log('✅ 提取命令注册成功');
    
    // 导出
    console.log('开始注册导出命令...');
    exportExcel(context);
    console.log('✅ 导出命令注册成功');
    
    // 导入功能
    console.log('开始注册导入命令...');
    importExcel(context);
    console.log('✅ 导入命令注册成功');
    
    // 在线翻译功能
    console.log('开始注册在线翻译命令...');
    translateToEnglish(context);
    console.log('✅ 在线翻译命令注册成功');
    
    // i18n key 装饰器 提示功能
    console.log('开始注册装饰器功能...');
    const annotator = new Annotator(context);
    context.subscriptions.push(annotator);
    console.log('✅ 装饰器功能注册成功');
    
    // i8n key code 补全
    console.log('开始注册代码补全功能...');
    const keyCompletionProvider = new KeyCompletionProvider(context);
    keyCompletionProvider.registerCompletionProvider();
    console.log('✅ 代码补全功能注册成功');
    
    // 测试命令是否可用
    console.log('开始测试命令可用性...');
    const commands = [
      'jaylee-i18n.extraction',
      'jaylee-i18n.extractFolder', 
      'jaylee-i18n.extractProject',
      'jaylee-i18n.translateToEnglish',
      'jaylee-i18n.initConfig',
      'jaylee-i18n.export',
      'jaylee-i18n.import'
    ];
    
    for (const command of commands) {
      try {
        const commandExists = vscode.commands.getCommands().then(cmds => cmds.includes(command));
        console.log(`命令 ${command}: 已注册`);
      } catch (error) {
        console.log(`命令 ${command}: ❌ 检查失败 - ${error}`);
      }
    }
    
    console.log('=== jaylee-i18n 插件激活完成 ===');
    console.log('注册的命令数量:', context.subscriptions.length);
    
    // 显示激活成功消息
    vscode.window.showInformationMessage('✅ jaylee-i18n 插件已成功激活！');
    
  } catch (error) {
    console.error('❌ 插件激活过程中出错:', error);
    vscode.window.showErrorMessage(`❌ 插件激活失败: ${error}`);
  }
}

export function deactivate() {
  console.log('=== jaylee-i18n 插件开始停用 ===');
  console.log('停用时间:', new Date().toISOString());
  console.log('=== jaylee-i18n 插件停用完成 ===');
}
