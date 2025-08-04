import * as vscode from "vscode";
import { getI18nConfig, getRootPath } from "../utils";
import path from "path";
import fs from "fs-extra";

export class KeyCompletionProvider {
  private data: { [key: string]: string };
  private quoteKeys: string; // 新增：用于存储从配置获取的quoteKeys

  constructor(private context: vscode.ExtensionContext) {
    const { outDir, defaultLanguage, language = [], extname, quoteKeys } = getI18nConfig();
    this.quoteKeys = quoteKeys; // 从配置中获取并存储quoteKeys

    const rootPath = getRootPath();
    const defaultLanguageFileName = defaultLanguage + "." + extname;
    const jsonFilePath = path.resolve(rootPath, outDir, defaultLanguageFileName);
    const jsonData = fs.readFileSync(jsonFilePath, "utf8");
    const jsonObject = JSON.parse(jsonData);
    this.data = jsonObject;
  }

  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    const lineContent = document.lineAt(position).text;
    const fullLineRange = new vscode.Range(
      position.line,
      0,
      position.line,
      lineContent.length
    );
    const textUntilPosition = document.getText(fullLineRange);

    // 查找最近的 quoteKeys("")
    let regexPattern = new RegExp(`${this.escapeRegex(this.quoteKeys)}\\((['"])((?:(?!\\1|\\\\).|\\\\.)*)\\1`, 'g');
    let match = regexPattern.exec(textUntilPosition);

    if (match) {
      const startIndex = match.index + this.quoteKeys.length + 2; // 跳过quoteKeys("("
      const endIndex = match.index + match[0].length - 1; // 最后一个双引号的索引

      console.log(
        `Cursor at: ${position.character}, Match range: [${startIndex}, ${endIndex}]`
      );

      if (position.character >= startIndex && position.character <= endIndex) {
        let inputText = "";
        if (position.character === endIndex) {
          inputText = lineContent.slice(startIndex, endIndex);
        } else {
          inputText = lineContent.slice(startIndex, position.character);
        }

        console.log(`Input text: "${inputText}"`);

        const keys = Object.keys(this.data)
          .filter((item) => item.toLowerCase().startsWith(inputText.toLowerCase()))
          .map((item) => {
            const completionItem = new vscode.CompletionItem(
              { label: item, detail: ` ==> ${this.data[item]}` },
              vscode.CompletionItemKind.Value
            );
            return completionItem;
          });

        return keys;
      }
    }

    return [];
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 转义正则特殊字符
  }

  public registerCompletionProvider() {
    const languages = ["javascript", "typescript", "javascriptreact", "typescriptreact"];
    const completionProvider = {
      provideCompletionItems: this.provideCompletionItems.bind(this),
    };
    languages.forEach((language) => {
      const disposable = vscode.languages.registerCompletionItemProvider(
        language,
        completionProvider,
        '"', "'", ' '
      );
      this.context.subscriptions.push(disposable);
    });
  }
}