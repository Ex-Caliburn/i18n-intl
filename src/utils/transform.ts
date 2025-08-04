import path from 'path';
import transformJs from './transformJs';
import * as vscode from "vscode";
function transform(
  uri: vscode.Uri
) {
  const sourceFilePath = uri.path;
  console.log("sourceFilePath", sourceFilePath);
  // 获取文件拓展名
  const ext = path.extname(sourceFilePath).replace(".", "") as FileExtension;
  switch (ext) {
    case "js":
    case "jsx":
      console.log("匹配到jsx");
      transformJs(uri);
      break;
    case "ts":
    case "tsx":
        console.log("匹配到ts tsx");
        transformJs(uri);
        break;
    case "vue":
      console.log(`匹配到vue`);
      vscode.window.showInformationMessage("暂不支持vue 开发中");
      break;
    default:
      vscode.window.showWarningMessage(`不支持对.${ext}后缀的文件进行提取`);
  }
}

export default transform;
