import * as vscode from "vscode";
import { parse } from "@vue/compiler-sfc";
import type { SFCDescriptor } from "@vue/compiler-sfc";
import fs from "fs-extra";
import path from "path";
import { parse as babelParse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import generator from "@babel/generator";
import * as t from "@babel/types";
import { includeChinese } from "./includeChinese";
import generateKey from "./generateKey";
import { getI18nConfig } from ".";
import { saveLocaleFile } from "./saveLocaleFile";

const CHINESE_RE = /[\u4e00-\u9fa5]+/g;

const transformVue = async (data: { path: string }) => {
  const sourceFilePath = data.path;
  const sourceCode = await fs.readFile(sourceFilePath, "utf8");
  const { defaultLanguage, quoteKeys } = getI18nConfig();
  let keyPrefix = path.basename(path.dirname(sourceFilePath)) + "." + path.basename(sourceFilePath, ".vue");
  let i18nMap: Record<string, string> = {};

  // 1. 用正则提取完整的 template 块，避免内容截断
  const templateMatch = sourceCode.match(/<template(?:\s+[^>]*)?>([\s\S]*?)<\/template>/);
  let templateContent = '';
  
  if (templateMatch) {
    templateContent = templateMatch[1];
    
    // 2. 处理 template 中的中文
    // 属性中的中文 label="中文"
    templateContent = templateContent.replace(/([\s])([a-zA-Z0-9_-]+)="([^"]*[\u4e00-\u9fa5]+[^"]*)"/g, (match, space, attr, chinese) => {
      // 检查是否已经包含 $t()，如果包含则跳过
      if (chinese.includes('$t(')) {
        return match;
      }
      const key = generateKey(keyPrefix, chinese);
      i18nMap[key] = chinese;
      return `${space}:${attr}="${quoteKeys}('${key}')"`;
    });
    // {{ ... }}
    templateContent = templateContent.replace(/{{([^}]*)}}/g, (match, expr) => {
      if (includeChinese(expr)) {
        return expr.replace(CHINESE_RE, (chinese: string) => {
          const key = generateKey(keyPrefix, chinese);
          i18nMap[key] = chinese;
          return `${quoteKeys}('${key}')`;
        });
      }
      return match;
    });
    // 纯文本 - 添加 {{ }} 包裹
    templateContent = templateContent.replace(CHINESE_RE, (chinese: string) => {
      const key = generateKey(keyPrefix, chinese);
      i18nMap[key] = chinese;
      return `{{ ${quoteKeys}('${key}') }}`;
    });
  }

  // 3. 重新组装 SFC 内容
  let newSFC = '';
  
  // 添加处理后的 template
  if (templateMatch) {
    const templateTagMatch = templateMatch[0].match(/^<template[^>]*>/);
    if (!templateTagMatch) {
      newSFC += `<template>\n${templateContent}\n</template>\n\n`;
    } else {
      const templateTag = templateTagMatch[0];
      newSFC += templateTag + templateContent + '</template>\n\n';
    }
  }
  
  // 用正则提取所有其他块，保持原有格式
  const blockRegex = /<(script(?:\s+setup)?|style|[a-zA-Z0-9-]+)([^>]*)>([\s\S]*?)<\/\1>/g;
  let match;
  const processedBlocks = new Set();
  
  while ((match = blockRegex.exec(sourceCode)) !== null) {
    const tag = match[1];
    const fullBlock = match[0];
    
    // 跳过 template（已处理）
    if (tag === 'template') continue;
    
    // 避免重复处理
    if (processedBlocks.has(fullBlock)) continue;
    processedBlocks.add(fullBlock);
    
    // 处理 script 块中的中文
    if (tag === 'script' || tag === 'script setup') {
      const scriptContent = match[3];
      const scriptTagMatch = match[0].match(/^<script[^>]*>/);
      if (!scriptTagMatch) continue;
      
      const scriptTag = scriptTagMatch[0];
      
      try {
        // 使用 Babel 解析 script 内容
        const ast = babelParse(scriptContent, {
          sourceType: "module",
          plugins: [
            "jsx", 
            "typescript", 
            "decorators-legacy",
            "classProperties",
            "objectRestSpread",
            "asyncGenerators",
            "functionBind",
            "exportDefaultFrom",
            "exportNamespaceFrom",
            "dynamicImport",
            "nullishCoalescingOperator",
            "optionalChaining"
          ],
          errorRecovery: true,
          allowImportExportEverywhere: true,
          allowReturnOutsideFunction: true,
          allowSuperOutsideMethod: true,
          allowUndeclaredExports: true,
        });

        // 遍历 AST，处理字符串字面量中的中文
        traverse(ast, {
          StringLiteral(path: NodePath<t.StringLiteral>) {
            if (includeChinese(path.node.value)) {
              const key = generateKey(keyPrefix, path.node.value);
              i18nMap[key] = path.node.value;
              const thisIdentifier = t.identifier('this');
              const functionIdentifier = t.identifier(quoteKeys.split(".")[0]);
              const callExpression = t.callExpression(functionIdentifier, [
                t.stringLiteral(key),
              ]);
              const memberExpression = t.memberExpression(thisIdentifier, callExpression);
              path.replaceWith(memberExpression);
            }
          },
          JSXText(path: NodePath<t.JSXText>) {
            const value = path.node.value.trim();
            if (includeChinese(value)) {
              const key = generateKey(keyPrefix, value);
              i18nMap[key] = value;
              const thisIdentifier = t.identifier('this');
              const functionIdentifier = t.identifier(quoteKeys.split(".")[0]);
              const callExpression = t.callExpression(functionIdentifier, [
                t.stringLiteral(key),
              ]);
              const memberExpression = t.memberExpression(thisIdentifier, callExpression);
              path.replaceWith(t.jsxExpressionContainer(memberExpression));
            }
          },
        });

        // 生成新的 script 内容
        const newScriptContent = generator(ast).code;
        const newScriptBlock = scriptTag + newScriptContent + '</script>';
        newSFC += newScriptBlock + '\n\n';
      } catch (error) {
        console.error('处理script内容时出错:', error);
        // 如果 Babel 解析失败，尝试用正则处理
        let newScriptContent = scriptContent;
        newScriptContent = newScriptContent.replace(/"([^"]*[\u4e00-\u9fa5]+[^"]*)"/g, (match, content) => {
          if (includeChinese(content)) {
            const key = generateKey(keyPrefix, content);
            i18nMap[key] = content;
            return `this.${quoteKeys}('${key}')`;
          }
          return match;
        });
        newScriptContent = newScriptContent.replace(/'([^']*[\u4e00-\u9fa5]+[^']*)'/g, (match, content) => {
          if (includeChinese(content)) {
            const key = generateKey(keyPrefix, content);
            i18nMap[key] = content;
            return `this.${quoteKeys}('${key}')`;
          }
          return match;
        });
        
        const newScriptBlock = scriptTag + newScriptContent + '</script>';
        newSFC += newScriptBlock + '\n\n';
      }
    } else {
      // 其他块（style、自定义块等）保持原样
      newSFC += fullBlock + '\n\n';
    }
  }

  // 4. 保存 key 映射
  await saveLocaleFile(i18nMap, defaultLanguage, vscode.Uri.file(sourceFilePath));
  // 5. 覆盖原文件内容
  await fs.writeFile(sourceFilePath, newSFC, "utf8");
  return { code: newSFC, i18nMap };
};

export default transformVue;
