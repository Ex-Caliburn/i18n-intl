import { Position, Range, TextEditor } from "vscode";
import * as vscode from "vscode";
import { getI18nConfig, getSourceValue } from "../utils";
import { KeyInfo } from './types';

// 从编辑器中获取key对应的位置信息
export const getKeyPositions = (editor: TextEditor): KeyInfo[] => {
  const { quoteKeys } = getI18nConfig(); // 从配置获取模板函数标识符
  const escapedQuoteKeys = quoteKeys.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 转义特殊字符
  
  const keyInfos: KeyInfo[] = [];
  const content = editor.document.getText();

  // 动态构建正则表达式，匹配如 `${quoteKeys}('key')` 的模式
  const regex = new RegExp(`${escapedQuoteKeys}\\(['"]([^'"]+)['"]\\)`, 'g');
  const matches = content.matchAll(regex);

  for (const match of matches) {
    if (match && match.length > 1) {
        console.log('match', match);
      const key = match[1];
      console.log('key', key);
      // 计算起始和结束位置时，考虑模板函数标识符的实际长度
      const startIndex = match.index + quoteKeys.length + 2; // 加上标识符和括号的长度
      const endIndex = match.index + match[0].length - 2; // 减去最后一个字符的长度
      
      const start = editor.document.positionAt(startIndex);
      const end = editor.document.positionAt(endIndex);

      const translation = getSourceValue(key);
      keyInfos.push({
        key: key,
        range: new vscode.Range(start, end),
        translation
      });
    }
  }

  return keyInfos;
};