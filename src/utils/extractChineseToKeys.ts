import * as vscode from "vscode";
import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import generator from "@babel/generator";
import * as t from "@babel/types";
import generateKey from "./generateKey";
import { includeChinese } from "./includeChinese";
import path from "path";
import fs from "fs-extra";
import { getI18nConfig } from ".";
import { saveLocaleFile } from "./saveLocaleFile";
import { hasImport, myImportDeclaration } from "./hasImportI18n";

export default async (data: vscode.Uri) => {
  const sourceFilePath = data.path;
  console.log("sourceFilePath", sourceFilePath);
  const sourceCode = await fs.readFile(sourceFilePath, "utf8");

  const { defaultLanguage, quoteKeys } = getI18nConfig();
  
  // 提取文件名（不包含扩展名）
  let fileNameWithoutExtension = path.basename(
    sourceFilePath,
    path.extname(sourceFilePath)
  );

  // 获取上一级目录
  let parentDirectory = path.dirname(sourceFilePath);

  // 如果需要上一级目录的名字而不是完整路径，可以这样获取
  let parentDirectoryName = path.basename(parentDirectory);

  // 生成key的前缀，这里简单地连接文件名（无扩展名）和上一级目录名，实际可以根据需求调整格式
  let keyPrefix = `${parentDirectoryName}.${fileNameWithoutExtension}`;

  const i18nMap: Record<string, string> = {};

  if (!sourceCode) return;

  let ast;
  try {
    ast = parse(sourceCode, {
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
  } catch (error) {
    console.error("解析文件时出错:", error);
    vscode.window.showErrorMessage(`解析文件 ${sourceFilePath} 时出错: ${error}`);
    return;
  }

  if (!hasImport(ast)) {
    const importDeclaration = myImportDeclaration();
    importDeclaration && ast.program.body.unshift(importDeclaration);
  }

  try {
    traverse(ast, {
      JSXAttribute(path) {
        const { name, value } = path.node;
        if (
          t.isJSXIdentifier(name) &&
          t.isStringLiteral(value) &&
          includeChinese(value.value)
        ) {
          const key = generateKey(keyPrefix, value.value);
          i18nMap[key] = value.value;
          const functionIdentifier = t.identifier(quoteKeys.split(".")[0]);
          const callExpression = t.callExpression(functionIdentifier, [
            t.stringLiteral(key),
          ]);
          path.replaceWith(
            t.jSXAttribute(name, t.jSXExpressionContainer(callExpression))
          );
        }
      },
      StringLiteral(path: NodePath<t.StringLiteral>) {
        if (includeChinese(path.node.value)) {
          const key = generateKey(keyPrefix, path.node.value);
          i18nMap[key] = path.node.value;
          const functionIdentifier = t.identifier(quoteKeys.split(".")[0]);
          const callExpression = t.callExpression(functionIdentifier, [
            t.stringLiteral(key),
          ]);
          path.replaceWith(callExpression);
        }
      },
      JSXText(path: NodePath<t.JSXText>) {
        const value = path.node.value.trim();
        if (includeChinese(value)) {
          const key = generateKey(keyPrefix, value);
          i18nMap[key] = value;
          const functionIdentifier = t.identifier(quoteKeys.split(".")[0]);
          const callExpression = t.callExpression(functionIdentifier, [
            t.stringLiteral(key),
          ]);
          path.replaceWith(t.jsxExpressionContainer(callExpression));
        }
      },
    });
  } catch (error) {
    console.error("遍历AST时出错:", error);
    vscode.window.showErrorMessage(`处理文件 ${sourceFilePath} 时出错: ${error}`);
    return;
  }

  try {
    const newCode = generator(ast).code;
    await saveLocaleFile(i18nMap, defaultLanguage, data);

    const document = await vscode.workspace.openTextDocument(sourceFilePath);
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      await editor.edit((editBuilder) => {
        editBuilder.replace(
          new vscode.Range(0, 0, document.lineCount, 0),
          newCode
        );
      });
    }
  } catch (error) {
    console.error("生成代码时出错:", error);
    vscode.window.showErrorMessage(`生成代码时出错: ${error}`);
  }
};
