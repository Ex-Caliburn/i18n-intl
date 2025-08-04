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

export function activate(context: vscode.ExtensionContext) {
  // 项目配置
  initConfig(context);
  // 提取
  extraction(context);
  // 导出
  exportExcel(context);
  // 导入功能
  importExcel(context);
  // 在线翻译功能
  translateToEnglish(context);
  // i18n key 装饰器 提示功能
  const annotator = new Annotator(context);
  context.subscriptions.push(annotator);
  // i8n key code 补全
  const keyCompletionProvider = new KeyCompletionProvider(context);
  keyCompletionProvider.registerCompletionProvider();
}

export function deactivate() {}
