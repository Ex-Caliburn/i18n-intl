import * as vscode from "vscode";
const _ = require("lodash");
import { getKeyPositions } from "./helper";
import { KeyInfo, DecorationType, DecorationOptionsWithType } from "./types";
class Annotator {
  // 各种类型对应的装饰器
  private i18nDecorationTypeMap: Record<
    DecorationType,
    vscode.TextEditorDecorationType
  > = {
    none: vscode.window.createTextEditorDecorationType({}),
    missing: vscode.window.createTextEditorDecorationType({
      textDecoration: "underline wavy yellow",
    }),
    keyShowSourceText: vscode.window.createTextEditorDecorationType({
      textDecoration: "none; display: none;", // 隐藏key显示 原文案(例如中文)
    }),
  };
  private _currentUsages: KeyInfo[] = [];
  private _outputChannel: vscode.OutputChannel;

  constructor(private readonly context: vscode.ExtensionContext) {
    this._outputChannel =
      vscode.window.createOutputChannel("I18n Translations");
    this._registerEvents();
  }

  private _registerEvents() {
    const onDidChangeTextEditorSelection =
      vscode.window.onDidChangeTextEditorSelection(this.update.bind(this));
    const onDidChangeActiveTextEditor =
      vscode.window.onDidChangeActiveTextEditor(this.update.bind(this));

    this.context.subscriptions.push(
      onDidChangeTextEditorSelection,
      onDidChangeActiveTextEditor
    );
  }
  private async update() {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }

    this._currentUsages = getKeyPositions(activeEditor);
    // 处理光标所在行的key
    const currentLineKeys = this.getFocusLineKeys(activeEditor);
    // 获取未知的key
    const missKeys = this._currentUsages.filter(
      (usage) => usage.translation === undefined
    );
    // 获取需要替换为原文案的key
    const inReplaceKeys = _.differenceWith(
      this._currentUsages,
      _.concat(currentLineKeys, missKeys),
      _.isEqual
    );
    console.log("inReplaceKeys", inReplaceKeys);
    // 处理对应的 key 显示装饰器的逻辑
    this.setDecorations(DecorationType.Miss, missKeys);
    this.setDecorations(DecorationType.None, currentLineKeys);
    this.setDecorations(DecorationType.keyShowSourceText, inReplaceKeys);
  }
  /**
   * 获得焦点时 当前行的keys
   */
  getFocusLineKeys(activeEditor: vscode.TextEditor) {
    // 获取当前光标所在行号
    const cursorPosition = activeEditor.selection.active.line;
    // 过滤获取当前行的 keysInfo
    const currentLineKeyUsages = this._currentUsages.filter(
      (usage) => usage.range.start.line === cursorPosition
    );
    return currentLineKeyUsages;
  }
  /**
   * 设置装饰器
   * @param DecorationType
   * @param keys
   */
  setDecorations(decorationType: DecorationType, keys: KeyInfo[]) {
    const descriptorOptions = keys.map((item) =>
      this.createDecorationOption(item, decorationType)
    );
    vscode.window.activeTextEditor?.setDecorations(
      this.i18nDecorationTypeMap[decorationType],
      descriptorOptions
    );
  }

  private createDecorationOption(
    usage: KeyInfo,
    type: DecorationType
  ): vscode.DecorationOptions {
    let range = usage.range;
    const rangeWithQuotes = new vscode.Range(
      range.start.with(undefined, range.start.character),
      range.end.with(undefined, range.end.character)
    );
    const baseDecorationOptions = {
      range: rangeWithQuotes,
    };
    if (type === DecorationType.None) {
      return baseDecorationOptions;
    }
    if (type === DecorationType.Miss) {
      return {
        ...baseDecorationOptions,
        hoverMessage: new vscode.MarkdownString("i18n-miss: 未知的key"),
      };
    }
    if (type === DecorationType.keyShowSourceText) {
      return {
        ...baseDecorationOptions,
        renderOptions: {
          after: {
            contentText: `${usage.translation}`, // 显示翻译内容
            color: "#7e7e7e",
            fontStyle: "normal",
            border: "0.5px solid rgba(153, 153, 153, .8);",
          },
        },
      };
    }
    return baseDecorationOptions;
  }

  public dispose() {
    this._outputChannel.dispose();
    this.i18nDecorationTypeMap.keyShowSourceText.dispose();
  }
}

export default Annotator;
