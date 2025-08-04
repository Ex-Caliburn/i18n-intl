import * as vscode from "vscode";
import fs from 'fs-extra';
import { getI18nConfig } from "../utils";
import { saveLocaleFile } from "../utils/saveLocaleFile";
import path from 'path';
import transform from '../utils/transform';
import extractChineseToKeys from "../utils/extractChineseToKeys";
import transformVue from "../utils/transformVue";

// 获取支持的文件扩展名
const SUPPORTED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.vue'];

// 递归获取文件列表
async function getFiles(dir: string, extensions: string[]): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        // 跳过 node_modules 和 .git 等目录
        if (!item.startsWith('.') && item !== 'node_modules') {
          files.push(...await getFiles(fullPath, extensions));
        }
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`读取目录 ${dir} 时出错:`, error);
  }
  
  return files;
}

export default (context: vscode.ExtensionContext) => {
  // 单个文件提取
  vscode.commands.registerCommand("i18n.extraction", async (data) => {
    console.log('data', data);
    
    // 处理从资源管理器右键菜单触发的情况
    if (data && data.resourceUri) {
      // 从资源管理器右键菜单触发
      const filePath = data.resourceUri.fsPath;
      const fileExtension = path.extname(filePath).toLowerCase();
      
      if (!SUPPORTED_EXTENSIONS.includes(fileExtension)) {
        vscode.window.showErrorMessage(`不支持的文件类型: ${fileExtension}`);
        return;
      }
      
      try {
        if (fileExtension === '.vue') {
          console.log('处理 Vue 文件:', filePath);
          await transformVue({ path: filePath });
          vscode.window.showInformationMessage("Vue 文件中文提取完成");
        } else {
          console.log('处理其他文件:', filePath);
          await extractChineseToKeys(vscode.Uri.file(filePath));
          vscode.window.showInformationMessage("文件中文提取完成");
        }
      } catch (error) {
        console.error('提取过程中出错:', error);
        vscode.window.showErrorMessage(`提取失败: ${error}`);
      }
      return;
    }
    
    // 处理从编辑器右键菜单触发的情况
    if (!data || !data.path) {
      vscode.window.showErrorMessage("无效的文件路径");
      return;
    }

    const sourceFilePath = data.path;
    const fileExtension = path.extname(sourceFilePath).toLowerCase();
    
    try {
      if (fileExtension === '.vue') {
        // Vue 文件使用 transformVue 处理
        console.log('处理 Vue 文件:', sourceFilePath);
        await transformVue(data);
        vscode.window.showInformationMessage("Vue 文件中文提取完成");
      } else {
        // 其他文件使用 extractChineseToKeys 处理
        console.log('处理其他文件:', sourceFilePath);
        await extractChineseToKeys(data);
        vscode.window.showInformationMessage("文件中文提取完成");
      }
    } catch (error) {
      console.error('提取过程中出错:', error);
      vscode.window.showErrorMessage(`提取失败: ${error}`);
    }
  });

  // 提取当前目录
  vscode.commands.registerCommand("i18n.extractFolder", async (data) => {
    try {
      console.log('extractFolder data:', data);
      console.log('data type:', typeof data);
      console.log('data keys:', data ? Object.keys(data) : 'data is null/undefined');
      
      let folderPath: string;
      
      // 处理不同的数据传递方式
      if (data && data.resourceUri) {
        // 从资源管理器右键菜单触发的情况
        console.log('resourceUri found:', data.resourceUri);
        folderPath = data.resourceUri.fsPath;
      } else if (data && data.fsPath) {
        // 直接传递 Uri 对象的情况
        console.log('Uri with fsPath found:', data);
        folderPath = data.fsPath;
      } else if (data && typeof data === 'object' && 'scheme' in data) {
        // 直接传递 Uri 对象的情况
        console.log('Uri object found:', data);
        folderPath = data.fsPath;
      } else {
        console.log('No valid data structure found');
        vscode.window.showErrorMessage("请选择一个文件夹");
        return;
      }

      console.log('folderPath:', folderPath);
      const stat = await fs.stat(folderPath);
      
      if (!stat.isDirectory()) {
        vscode.window.showErrorMessage("请选择一个文件夹");
        return;
      }

      // 获取文件夹中的所有支持文件
      const files = await getFiles(folderPath, SUPPORTED_EXTENSIONS);
      
      if (files.length === 0) {
        vscode.window.showInformationMessage("文件夹中没有找到可处理的文件");
        return;
      }

      // 显示进度
      const progressOptions = {
        location: vscode.ProgressLocation.Notification,
        title: "提取当前目录中文",
        cancellable: false
      };

      await vscode.window.withProgress(progressOptions, async (progress) => {
        let processedCount = 0;
        let successCount = 0;
        let errorCount = 0;

        for (const filePath of files) {
          progress.report({
            message: `处理文件: ${path.basename(filePath)} (${processedCount + 1}/${files.length})`,
            increment: (1 / files.length) * 100
          });

          try {
            const fileExtension = path.extname(filePath).toLowerCase();
            const data = vscode.Uri.file(filePath);

            if (fileExtension === '.vue') {
              await transformVue({ path: filePath });
            } else {
              await extractChineseToKeys(data);
            }
            successCount++;
          } catch (error) {
            console.error(`处理文件 ${filePath} 时出错:`, error);
            errorCount++;
          }
          processedCount++;
        }

        const message = `当前目录提取完成！成功: ${successCount} 个文件，失败: ${errorCount} 个文件`;
        vscode.window.showInformationMessage(message);
      });

    } catch (error) {
      console.error('当前目录提取过程中出错:', error);
      vscode.window.showErrorMessage(`当前目录提取失败: ${error}`);
    }
  });

  // 提取项目
  vscode.commands.registerCommand("i18n.extractProject", async () => {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage("请先打开一个工作区");
        return;
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const config = getI18nConfig();
      
      // 获取入口目录
      const entryDirs = config.entry || ['src'];
      let allFiles: string[] = [];
      
      for (const entryDir of entryDirs) {
        const fullEntryPath = path.join(workspaceRoot, entryDir);
        if (await fs.pathExists(fullEntryPath)) {
          const files = await getFiles(fullEntryPath, SUPPORTED_EXTENSIONS);
          allFiles.push(...files);
        }
      }
      
      if (allFiles.length === 0) {
        vscode.window.showInformationMessage("项目中未找到可处理的文件");
        return;
      }

      // 显示进度
      const progressOptions = {
        location: vscode.ProgressLocation.Notification,
        title: "提取项目中文",
        cancellable: false
      };

      await vscode.window.withProgress(progressOptions, async (progress) => {
        let processedCount = 0;
        let successCount = 0;
        let errorCount = 0;

        for (const filePath of allFiles) {
          progress.report({
            message: `处理文件: ${path.basename(filePath)} (${processedCount + 1}/${allFiles.length})`,
            increment: (1 / allFiles.length) * 100
          });

          try {
            const fileExtension = path.extname(filePath).toLowerCase();
            const data = vscode.Uri.file(filePath);

            if (fileExtension === '.vue') {
              await transformVue({ path: filePath });
            } else {
              await extractChineseToKeys(data);
            }
            successCount++;
          } catch (error) {
            console.error(`处理文件 ${filePath} 时出错:`, error);
            errorCount++;
          }
          processedCount++;
        }

        const message = `项目提取完成！成功: ${successCount} 个文件，失败: ${errorCount} 个文件`;
        vscode.window.showInformationMessage(message);
      });

    } catch (error) {
      console.error('项目提取过程中出错:', error);
      vscode.window.showErrorMessage(`项目提取失败: ${error}`);
    }
  });
};


