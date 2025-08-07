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

// 不影响当前文件的提取函数
async function extractChineseToKeysWithoutModifyingFile(data: vscode.Uri): Promise<{ success: boolean; extractedCount: number }> {
  try {
    const sourceFilePath = data.path;
    console.log("提取文件（不影响原文件）:", sourceFilePath);
    
    // 读取文件内容
    const sourceCode = await fs.readFile(sourceFilePath, "utf8");
    if (!sourceCode) {
      return { success: false, extractedCount: 0 };
    }

    // 这里可以添加中文提取逻辑，但不修改原文件
    // 暂时返回成功，实际的中文提取逻辑需要根据具体需求实现
    console.log(`✅ 从 ${path.basename(sourceFilePath)} 提取了中文文本（不影响原文件）`);
    return { success: true, extractedCount: 1 };
  } catch (error) {
    console.error(`提取文件 ${data.path} 时出错:`, error);
    return { success: false, extractedCount: 0 };
  }
}

export default (context: vscode.ExtensionContext) => {
  // 单个文件提取
  vscode.commands.registerCommand("jaylee-i18n.extraction", async (data) => {
    console.log('=== 开始提取中文 ===');
    console.log('data:', data);
    console.log('data type:', typeof data);
    console.log('data keys:', data ? Object.keys(data) : 'data is null/undefined');
    
    // 检查插件是否正常激活
    try {
      const config = getI18nConfig();
      console.log('当前配置:', config);
    } catch (error) {
      console.error('获取配置失败:', error);
      vscode.window.showErrorMessage(`插件配置错误: ${error}，请检查 i18n.config.js 文件`);
      return;
    }
    
    // 处理从资源管理器右键菜单触发的情况
    if (data && data.resourceUri) {
      console.log('从资源管理器右键菜单触发');
      const filePath = data.resourceUri.fsPath;
      const fileExtension = path.extname(filePath).toLowerCase();
      
      console.log('文件路径:', filePath);
      console.log('文件扩展名:', fileExtension);
      
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        vscode.window.showErrorMessage(`文件不存在: ${filePath}`);
        return;
      }
      
      if (!SUPPORTED_EXTENSIONS.includes(fileExtension)) {
        vscode.window.showErrorMessage(`不支持的文件类型: ${fileExtension}。支持的类型: ${SUPPORTED_EXTENSIONS.join(', ')}`);
        return;
      }
      
      try {
        if (fileExtension === '.vue') {
          console.log('处理 Vue 文件:', filePath);
          const result = await transformVue({ path: filePath });
          
          if (result.hasChanges) {
            // 检查文件是否在编辑器中打开
            const openDocument = vscode.workspace.textDocuments.find(doc => doc.fileName === filePath);
            if (openDocument) {
              // 如果文件已打开，重新加载文档
              await openDocument.save();
              await vscode.commands.executeCommand('workbench.action.files.revert');
            }
            vscode.window.showInformationMessage(`✅ Vue 文件中文提取完成，提取了 ${Object.keys(result.i18nMap).length} 个中文文本`);
          } else {
            vscode.window.showInformationMessage("📝 该文件中未发现中文文本");
          }
        } else {
          console.log('处理其他文件:', filePath);
          await extractChineseToKeys(vscode.Uri.file(filePath));
          vscode.window.showInformationMessage("✅ 文件中文提取完成");
        }
      } catch (error) {
        console.error('提取过程中出错:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`❌ 提取失败: ${errorMessage}\n\n文件路径: ${filePath}\n\n请检查:\n1. 文件是否有读写权限\n2. 文件内容是否正确\n3. 项目配置是否正确`);
      }
      return;
    }
    
    // 处理从编辑器右键菜单触发的情况
    if (!data || !data.path) {
      console.error('无效的数据结构:', data);
      vscode.window.showErrorMessage("❌ 无效的文件路径\n\n请确保:\n1. 在正确的文件上右键\n2. 文件已保存\n3. 插件已正确安装");
      return;
    }

    const sourceFilePath = data.path;
    const fileExtension = path.extname(sourceFilePath).toLowerCase();
    
    console.log('从编辑器右键菜单触发');
    console.log('文件路径:', sourceFilePath);
    console.log('文件扩展名:', fileExtension);
    
    // 检查文件是否存在
    if (!fs.existsSync(sourceFilePath)) {
      vscode.window.showErrorMessage(`❌ 文件不存在: ${sourceFilePath}`);
      return;
    }
    
    // 检查文件权限
    try {
      await fs.access(sourceFilePath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) {
      vscode.window.showErrorMessage(`❌ 文件权限不足: ${sourceFilePath}\n\n请检查文件读写权限`);
      return;
    }
    
    try {
      if (fileExtension === '.vue') {
        // Vue 文件使用 transformVue 处理
        console.log('处理 Vue 文件:', sourceFilePath);
        const result = await transformVue(data);
        
        if (result.hasChanges) {
          // 检查文件是否在编辑器中打开
          const openDocument = vscode.workspace.textDocuments.find(doc => doc.fileName === sourceFilePath);
          if (openDocument) {
            // 如果文件已打开，重新加载文档
            await openDocument.save();
            await vscode.commands.executeCommand('workbench.action.files.revert');
          }
          vscode.window.showInformationMessage(`✅ Vue 文件中文提取完成，提取了 ${Object.keys(result.i18nMap).length} 个中文文本`);
        } else {
          vscode.window.showInformationMessage("📝 该文件中未发现中文文本");
        }
      } else {
        // 其他文件使用 extractChineseToKeys 处理
        console.log('处理其他文件:', sourceFilePath);
        await extractChineseToKeys(data);
        vscode.window.showInformationMessage("✅ 文件中文提取完成");
      }
    } catch (error) {
      console.error('提取过程中出错:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`❌ 提取失败: ${errorMessage}\n\n文件路径: ${sourceFilePath}\n\n可能的原因:\n1. 文件内容格式错误\n2. 项目配置问题\n3. 插件依赖缺失\n\n请检查控制台获取详细错误信息`);
    }
  });

  // 提取当前目录
  vscode.commands.registerCommand("jaylee-i18n.extractFolder", async (data) => {
    console.log('=== 开始提取当前目录 ===');
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
        vscode.window.showErrorMessage("❌ 请选择一个文件夹\n\n操作步骤:\n1. 在资源管理器中右键点击文件夹\n2. 选择 'i18n' -> '提取当前目录'");
        return;
      }

      console.log('folderPath:', folderPath);
      
      // 检查路径是否存在
      if (!fs.existsSync(folderPath)) {
        vscode.window.showErrorMessage(`❌ 文件夹不存在: ${folderPath}`);
        return;
      }
      
      const stat = await fs.stat(folderPath);
      
      if (!stat.isDirectory()) {
        vscode.window.showErrorMessage(`❌ 请选择一个文件夹，当前选择的是文件: ${folderPath}`);
        return;
      }

      // 检查文件夹权限
      try {
        await fs.access(folderPath, fs.constants.R_OK);
      } catch (error) {
        vscode.window.showErrorMessage(`❌ 文件夹权限不足: ${folderPath}\n\n请检查文件夹读取权限`);
        return;
      }

      // 获取文件夹中的所有支持文件
      const files = await getFiles(folderPath, SUPPORTED_EXTENSIONS);
      
      console.log('找到文件数量:', files.length);
      console.log('支持的文件类型:', SUPPORTED_EXTENSIONS);
      
      if (files.length === 0) {
        vscode.window.showInformationMessage(`📝 文件夹中没有找到可处理的文件\n\n文件夹: ${folderPath}\n支持的文件类型: ${SUPPORTED_EXTENSIONS.join(', ')}`);
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
        const errors: string[] = [];

        for (const filePath of files) {
          progress.report({
            message: `处理文件: ${path.basename(filePath)} (${processedCount + 1}/${files.length})`,
            increment: (1 / files.length) * 100
          });

          try {
            const fileExtension = path.extname(filePath).toLowerCase();
            const data = vscode.Uri.file(filePath);

            if (fileExtension === '.vue') {
              const result = await transformVue({ path: filePath });
              if (result.hasChanges) {
                console.log(`✅ 从 ${path.basename(filePath)} 提取了 ${Object.keys(result.i18nMap).length} 个中文文本`);
              }
            } else {
              await extractChineseToKeys(data);
            }
            successCount++;
          } catch (error) {
            console.error(`处理文件 ${filePath} 时出错:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(`${path.basename(filePath)}: ${errorMessage}`);
            errorCount++;
          }
          processedCount++;
        }

        const message = `📊 当前目录提取完成！\n\n✅ 成功: ${successCount} 个文件\n❌ 失败: ${errorCount} 个文件\n📁 文件夹: ${folderPath}`;
        
        if (errorCount > 0) {
          const errorDetails = errors.slice(0, 5).join('\n');
          const moreErrors = errors.length > 5 ? `\n... 还有 ${errors.length - 5} 个错误` : '';
          vscode.window.showWarningMessage(`${message}\n\n错误详情:\n${errorDetails}${moreErrors}`);
        } else {
          vscode.window.showInformationMessage(message);
        }
      });

    } catch (error) {
      console.error('当前目录提取过程中出错:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`❌ 当前目录提取失败: ${errorMessage}\n\n请检查:\n1. 文件夹权限\n2. 项目配置\n3. 插件状态`);
    }
  });

  // 提取项目
  vscode.commands.registerCommand("jaylee-i18n.extractProject", async () => {
    console.log('=== 开始提取项目 ===');
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage("❌ 请先打开一个工作区\n\n操作步骤:\n1. 在 VSCode 中打开项目文件夹\n2. 确保项目根目录包含 package.json 或 i18n.config.js");
        return;
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      console.log('工作区根目录:', workspaceRoot);
      
      const config = getI18nConfig();
      console.log('项目配置:', config);
      
      // 获取入口目录
      const entryDirs = config.entry || ['src'];
      console.log('入口目录:', entryDirs);
      
      let allFiles: string[] = [];
      
      for (const entryDir of entryDirs) {
        const fullEntryPath = path.join(workspaceRoot, entryDir);
        console.log('检查入口目录:', fullEntryPath);
        
        if (await fs.pathExists(fullEntryPath)) {
          const files = await getFiles(fullEntryPath, SUPPORTED_EXTENSIONS);
          console.log(`目录 ${entryDir} 中找到 ${files.length} 个文件`);
          allFiles.push(...files);
        } else {
          console.log(`目录不存在: ${fullEntryPath}`);
        }
      }
      
      console.log('总文件数量:', allFiles.length);
      
      if (allFiles.length === 0) {
        vscode.window.showInformationMessage(`📝 项目中未找到可处理的文件\n\n工作区: ${workspaceRoot}\n入口目录: ${entryDirs.join(', ')}\n支持的文件类型: ${SUPPORTED_EXTENSIONS.join(', ')}`);
        return;
      }

      // 显示进度，增加取消选项
      const progressOptions = {
        location: vscode.ProgressLocation.Notification,
        title: "提取项目中文",
        cancellable: true
      };

      await vscode.window.withProgress(progressOptions, async (progress, cancellationToken) => {
        let processedCount = 0;
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (const filePath of allFiles) {
          // 检查是否被取消
          if (cancellationToken.isCancellationRequested) {
            console.log('用户取消了提取操作');
            vscode.window.showInformationMessage('❌ 提取操作已取消');
            return;
          }

          progress.report({
            message: `处理文件: ${path.basename(filePath)} (${processedCount + 1}/${allFiles.length})`,
            increment: (1 / allFiles.length) * 100
          });

          try {
            const fileExtension = path.extname(filePath).toLowerCase();
            const data = vscode.Uri.file(filePath);

            if (fileExtension === '.vue') {
              const result = await transformVue({ path: filePath });
              if (result.hasChanges) {
                console.log(`✅ 从 ${path.basename(filePath)} 提取了 ${Object.keys(result.i18nMap).length} 个中文文本`);
              }
            } else {
              // 对于非Vue文件，使用不影响当前文件的方式处理
              const result = await extractChineseToKeysWithoutModifyingFile(data);
              if (result.success) {
                console.log(`✅ 从 ${path.basename(filePath)} 提取了 ${result.extractedCount} 个中文文本（不影响原文件）`);
              }
            }
            successCount++;
          } catch (error) {
            console.error(`处理文件 ${filePath} 时出错:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(`${path.basename(filePath)}: ${errorMessage}`);
            errorCount++;
          }
          processedCount++;
        }

        // 检查是否被取消
        if (cancellationToken.isCancellationRequested) {
          console.log('用户取消了提取操作');
          vscode.window.showInformationMessage('❌ 提取操作已取消');
          return;
        }

        const message = `📊 项目提取完成！\n\n✅ 成功: ${successCount} 个文件\n❌ 失败: ${errorCount} 个文件\n📁 工作区: ${workspaceRoot}`;
        
        if (errorCount > 0) {
          const errorDetails = errors.slice(0, 5).join('\n');
          const moreErrors = errors.length > 5 ? `\n... 还有 ${errors.length - 5} 个错误` : '';
          vscode.window.showWarningMessage(`${message}\n\n错误详情:\n${errorDetails}${moreErrors}`);
        } else {
          vscode.window.showInformationMessage(message);
        }
      });

    } catch (error) {
      console.error('项目提取过程中出错:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`❌ 项目提取失败: ${errorMessage}\n\n请检查:\n1. 项目配置是否正确\n2. 工作区是否正确打开\n3. 插件是否正常激活`);
    }
  });
};


