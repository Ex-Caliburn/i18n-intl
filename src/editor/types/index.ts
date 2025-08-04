import { DecorationOptions, Range } from "vscode";

export interface KeyInfo {
  key: string;
  range: Range; // 对应编辑器中的Range类型
  translation?: string | undefined; // 对应的原文案
}

export enum DecorationType {
  None = "none", // 不装饰
  Miss = "missing", // 表示未知的，使用波浪线图标
  keyShowSourceText = 'keyShowSourceText' // 将key显示为原语言文案
}
// 重新定义 DecorationOptions类型
export type DecorationOptionsWithType = DecorationOptions & {
  type: DecorationType;
};

