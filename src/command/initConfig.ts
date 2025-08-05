import * as vscode from "vscode";
import * as fs from "fs-extra";
import * as path from "path";
import { serializeCode } from "../utils/serializeCode";
import { CONFIG_FILE_NAME, configTemplate} from "../constants";

export default async (context: vscode.ExtensionContext) => {
  vscode.commands.registerCommand("jaylee-i18n.initConfig", async (data) => {
    console.log('=== 开始初始化项目配置 ===');
    console.log('data:', data);
    
    let rootPath = "";
    
    // 尝试从命令参数获取根路径
    if (data && data.resourceUri) {
      console.log('从命令参数获取根路径');
      const selectedWorkspaceFolder = vscode.workspace.getWorkspaceFolder(data.resourceUri);
      if (selectedWorkspaceFolder) {
        rootPath = selectedWorkspaceFolder.uri.fsPath;
        console.log('从命令参数获取到根路径:', rootPath);
      } else {
        console.log('无法从命令参数获取工作区文件夹');
      }
    }
    
    // 如果从参数获取失败，尝试从活动编辑器获取
    if (!rootPath) {
      console.log('尝试从活动编辑器获取根路径');
      let editor = vscode.window.activeTextEditor;
      if (editor) {
        const currentDocumentUri = editor.document.uri;
        console.log('当前文档URI:', currentDocumentUri);
        const selectedWorkspaceFolder = vscode.workspace.getWorkspaceFolder(currentDocumentUri);
        if (selectedWorkspaceFolder) {
          rootPath = selectedWorkspaceFolder.uri.fsPath;
          console.log('从活动编辑器获取到根路径:', rootPath);
        } else {
          console.log('无法从活动编辑器获取工作区文件夹');
        }
      } else {
        console.log('没有活动的文本编辑器');
      }
    }
    
    // 如果还是获取不到，尝试从工作区文件夹获取
    if (!rootPath) {
      console.log('尝试从工作区文件夹获取根路径');
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        rootPath = workspaceFolders[0].uri.fsPath;
        console.log('从工作区文件夹获取到根路径:', rootPath);
      } else {
        console.log('没有找到工作区文件夹');
      }
    }
    
    if (!rootPath) {
      console.error('无法获取项目根路径');
      vscode.window.showErrorMessage(`❌ 无法获取项目根路径\n\n请确保:\n1. 在 VSCode 中打开了项目文件夹\n2. 项目文件夹包含 package.json 或其他项目文件\n3. 插件已正确安装和激活\n\n操作步骤:\n1. 在 VSCode 中打开项目文件夹\n2. 右键点击项目根目录\n3. 选择 'i18n' -> '项目设置'`);
      return;
    }
    
    console.log('最终确定的根路径:', rootPath);
    
    // 检查根路径是否存在
    if (!fs.existsSync(rootPath)) {
      vscode.window.showErrorMessage(`❌ 项目根路径不存在: ${rootPath}`);
      return;
    }
    
    // 检查根路径权限
    try {
      await fs.access(rootPath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) {
      vscode.window.showErrorMessage(`❌ 项目根路径权限不足: ${rootPath}\n\n请检查文件夹读写权限`);
      return;
    }
    
    const configPath = path.join(rootPath, CONFIG_FILE_NAME);
    console.log('配置文件路径:', configPath);
    
    // 检查配置文件是否已存在
    if (fs.existsSync(configPath)) {
      const overwrite = await vscode.window.showWarningMessage(
        `配置文件已存在: ${configPath}\n\n是否要覆盖现有配置文件？`,
        '是', '否'
      );
      
      if (overwrite !== '是') {
        console.log('用户取消覆盖配置文件');
        return;
      }
    }
    
    try {
      console.log('开始写入配置文件');
      fs.writeFileSync(configPath, configTemplate);
      console.log('配置文件写入成功');
      
      vscode.window.showInformationMessage(`✅ 配置文件已创建: ${configPath}\n\n配置文件包含以下设置:\n1. 入口目录配置\n2. 输出目录配置\n3. 语言配置\n4. 翻译API配置\n\n请根据项目需求修改配置`);
      
      // 打开配置文件
      const configUri = vscode.Uri.file(configPath);
      const document = await vscode.workspace.openTextDocument(configUri);
      await vscode.window.showTextDocument(document);
      
      console.log('配置文件已打开');
    } catch (error) {
      console.error('创建配置文件失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`❌ 创建配置文件失败: ${errorMessage}\n\n文件路径: ${configPath}\n\n可能的原因:\n1. 文件权限不足\n2. 磁盘空间不足\n3. 路径包含特殊字符\n\n请检查:\n1. 文件夹权限\n2. 磁盘空间\n3. 路径是否正确`);
    }
  });
};
