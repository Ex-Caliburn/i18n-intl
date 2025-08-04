import * as vscode from "vscode";
import * as fs from "fs-extra";
import * as path from "path";
import { serializeCode } from "../utils/serializeCode";
import { CONFIG_FILE_NAME, configTemplate} from "../constants";
export default async (context: vscode.ExtensionContext) => {
  vscode.commands.registerCommand("i18n.initConfig", async (data) => {
    let rootPath = "";
    
    // 尝试从命令参数获取根路径
    if (data && data.resourceUri) {
      const selectedWorkspaceFolder = vscode.workspace.getWorkspaceFolder(data.resourceUri);
      if (selectedWorkspaceFolder) {
        rootPath = selectedWorkspaceFolder.uri.fsPath;
      }
    }
    
    // 如果从参数获取失败，尝试从活动编辑器获取
    if (!rootPath) {
      let editor = vscode.window.activeTextEditor;
      if (editor) {
        const currentDocumentUri = editor.document.uri;
        const selectedWorkspaceFolder = vscode.workspace.getWorkspaceFolder(currentDocumentUri);
        if (selectedWorkspaceFolder) {
          rootPath = selectedWorkspaceFolder.uri.fsPath;
        }
      }
    }
    
    if (!rootPath) {
      vscode.window.showErrorMessage("无法获取项目根路径，请确保在项目文件夹中执行此命令");
      return;
    }
    
    const configPath = path.join(rootPath, CONFIG_FILE_NAME);
    try {
      fs.writeFileSync(configPath, configTemplate);
      vscode.window.showInformationMessage(`配置文件已创建: ${configPath}`);
      
      // 打开配置文件
      const configUri = vscode.Uri.file(configPath);
      const document = await vscode.workspace.openTextDocument(configUri);
      await vscode.window.showTextDocument(document);
    } catch (error) {
      vscode.window.showErrorMessage(`创建配置文件失败: ${error}`);
      console.error(error);
    }
  });
};
