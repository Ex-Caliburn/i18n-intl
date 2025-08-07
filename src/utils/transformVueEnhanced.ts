import * as vscode from "vscode";
import { parse } from "@vue/compiler-sfc";
import type { SFCDescriptor, SFCTemplateBlock, SFCScriptBlock } from "@vue/compiler-sfc";
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

interface TransformResult {
  i18nMap: Record<string, string>;
  hasChanges: boolean;
  errors?: string[];
}

const transformVueEnhanced = async (data: { path: string }): Promise<TransformResult> => {
  const sourceFilePath = data.path;
  const sourceCode = await fs.readFile(sourceFilePath, "utf8");
  const { defaultLanguage, quoteKeys } = getI18nConfig();
  let keyPrefix = path.basename(path.dirname(sourceFilePath)) + "." + path.basename(sourceFilePath, ".vue");
  let i18nMap: Record<string, string> = {};
  let errors: string[] = [];

  try {
    // 使用 Vue Compiler SFC 解析文件
    const { descriptor } = parse(sourceCode, {
      sourceMap: false,
      pad: false
    });

    let newSFC = '';
    let processedTemplate = false;
    let processedScript = false;

    // 1. 处理 template 块
    if (descriptor.template) {
      const templateResult = processTemplateBlockEnhanced(descriptor.template, keyPrefix, i18nMap, quoteKeys, sourceCode);
      if (templateResult.success) {
        newSFC += templateResult.content;
        processedTemplate = true;
      } else {
        errors.push(`Template处理失败: ${templateResult.error || '未知错误'}`);
      }
    }

    // 2. 处理 script 块
    if (descriptor.script) {
      const scriptResult = processScriptBlockEnhanced(descriptor.script, keyPrefix, i18nMap, quoteKeys, sourceCode);
      if (scriptResult.success) {
        newSFC += scriptResult.content;
        processedScript = true;
      } else {
        errors.push(`Script处理失败: ${scriptResult.error || '未知错误'}`);
      }
    }

    // 3. 处理 script setup 块
    if (descriptor.scriptSetup) {
      const scriptSetupResult = processScriptBlockEnhanced(descriptor.scriptSetup, keyPrefix, i18nMap, quoteKeys, sourceCode);
      if (scriptSetupResult.success) {
        newSFC += scriptSetupResult.content;
        processedScript = true;
      } else {
        errors.push(`ScriptSetup处理失败: ${scriptSetupResult.error}`);
      }
    }

    // 4. 处理 style 块和其他自定义块
    descriptor.styles.forEach(style => {
      newSFC += sourceCode.substring(style.loc.start.offset, style.loc.end.offset);
    });

    descriptor.customBlocks.forEach(block => {
      newSFC += sourceCode.substring(block.loc.start.offset, block.loc.end.offset);
    });

    // 5. 保持原有格式
    newSFC = preserveOriginalFormatEnhanced(newSFC, sourceCode, descriptor);

    // 6. 保存 key 映射
    await saveLocaleFile(i18nMap, defaultLanguage, vscode.Uri.file(sourceFilePath));
    
    // 7. 直接修改源文件
    await fs.writeFile(sourceFilePath, newSFC, "utf8");
    
    return { 
      i18nMap, 
      hasChanges: Object.keys(i18nMap).length > 0,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    console.error('Vue Compiler SFC 解析失败:', error);
    errors.push(`Vue文件解析失败: ${error instanceof Error ? error.message : String(error)}`);
    
    // 降级到增强的正则表达式方法
    return fallbackToEnhancedRegex(sourceCode, sourceFilePath, keyPrefix, defaultLanguage, quoteKeys);
  }
};

// 增强的 template 块处理
const processTemplateBlockEnhanced = (
  template: SFCTemplateBlock, 
  keyPrefix: string, 
  i18nMap: Record<string, string>, 
  quoteKeys: string,
  sourceCode: string
) => {
  try {
    let content = template.content;
    let processedContent = content;

    // 1. 处理属性中的中文
    processedContent = processedContent.replace(
      /([\s])([a-zA-Z0-9_-]+)="([^"]*[\u4e00-\u9fa5]+[^"]*)"/g, 
      (match, space, attr, chinese) => {
        if (chinese.includes('$t(') || chinese.includes(quoteKeys)) {
          return match;
        }
        const key = generateKey(keyPrefix, chinese);
        i18nMap[key] = chinese;
        return `${space}:${attr}="${quoteKeys}('${key}')"`;
      }
    );

    // 2. 处理 {{ }} 中的中文 - 增强版本
    processedContent = processedContent.replace(/{{([^}]*)}}/g, (match, expr) => {
      if (includeChinese(expr)) {
        // 更精确地处理表达式中的中文
        return expr.replace(CHINESE_RE, (chinese: string) => {
          const key = generateKey(keyPrefix, chinese);
          i18nMap[key] = chinese;
          return `${quoteKeys}('${key}')`;
        });
      }
      return match;
    });

    // 3. 处理纯文本中的中文 - 增强版本
    processedContent = processedContent.replace(/[\u4e00-\u9fa5]+/g, (chinese: string) => {
      const beforeMatch = processedContent.substring(0, processedContent.indexOf(chinese));
      const inExpression = beforeMatch.lastIndexOf('{{') > beforeMatch.lastIndexOf('}}');
      const inAttribute = /:\w+="[^"]*$/.test(beforeMatch);
      const inComment = /<!--[\s\S]*?-->/.test(beforeMatch);
      
      if (inExpression || inAttribute || inComment) {
        return chinese;
      }
      
      const key = generateKey(keyPrefix, chinese);
      i18nMap[key] = chinese;
      return `{{ ${quoteKeys}('${key}') }}`;
    });

    const startTag = sourceCode.substring(template.loc.start.offset, template.loc.start.offset + 10);
    const endTag = '</template>';
    
    return {
      success: true,
      content: startTag + processedContent + endTag
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// 增强的 script 块处理 - 使用真正的AST解析
const processScriptBlockEnhanced = (
  script: SFCScriptBlock, 
  keyPrefix: string, 
  i18nMap: Record<string, string>, 
  quoteKeys: string,
  sourceCode: string
) => {
  try {
    const scriptContent = script.content;
    
    // 使用 Babel AST 解析
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

    // 收集需要替换的中文字符串
    const chineseStrings: Array<{value: string, path: NodePath, type: string}> = [];
    
    traverse(ast, {
      // 处理字符串字面量
      StringLiteral(path) {
        if (includeChinese(path.node.value)) {
          chineseStrings.push({ 
            value: path.node.value, 
            path, 
            type: 'StringLiteral' 
          });
        }
      },
      
      // 处理模板字符串
      TemplateLiteral(path) {
        path.node.quasis.forEach(quasi => {
          if (includeChinese(quasi.value.raw)) {
            chineseStrings.push({ 
              value: quasi.value.raw, 
              path: path as any, 
              type: 'TemplateLiteral' 
            });
          }
        });
      },
      
      // 处理JSX文本
      JSXText(path) {
        const value = path.node.value.trim();
        if (includeChinese(value)) {
          chineseStrings.push({ 
            value, 
            path, 
            type: 'JSXText' 
          });
        }
      },
      
      // 处理对象属性中的中文
      ObjectProperty(path) {
        if (t.isStringLiteral(path.node.key) && includeChinese(path.node.key.value)) {
          chineseStrings.push({ 
            value: path.node.key.value, 
            path: path.get('key') as NodePath, 
            type: 'ObjectPropertyKey' 
          });
        }
        if (t.isStringLiteral(path.node.value) && includeChinese(path.node.value.value)) {
          chineseStrings.push({ 
            value: path.node.value.value, 
            path: path.get('value') as NodePath, 
            type: 'ObjectPropertyValue' 
          });
        }
      },
      
      // 处理数组元素中的中文
      ArrayExpression(path) {
        path.node.elements.forEach((element, index) => {
          if (t.isStringLiteral(element) && includeChinese(element.value)) {
            chineseStrings.push({ 
              value: element.value, 
              path: path.get(`elements.${index}`) as NodePath, 
              type: 'ArrayElement' 
            });
          }
        });
      }
    });

    // 去重并排序
    const uniqueStrings = [...new Set(chineseStrings.map(item => item.value))];
    
    // 使用 AST 进行精确替换
    for (const chinese of uniqueStrings) {
      const key = generateKey(keyPrefix, chinese);
      i18nMap[key] = chinese;
      
      // 找到所有匹配的路径并替换
      chineseStrings
        .filter(item => item.value === chinese)
        .forEach(item => {
          if (item.type === 'StringLiteral' || item.type === 'ObjectPropertyValue' || item.type === 'ArrayElement') {
            item.path.replaceWith(
              t.memberExpression(
                t.thisExpression(),
                t.callExpression(
                  t.identifier(quoteKeys),
                  [t.stringLiteral(key)]
                )
              )
            );
          } else if (item.type === 'ObjectPropertyKey') {
            // 对于对象属性键，需要特殊处理
            const newKey = t.identifier(key);
            item.path.replaceWith(newKey);
          }
        });
    }

    // 生成新的代码
    const { code: newScriptContent } = generator(ast, {
      retainLines: true,
      retainFunctionParens: true,
      compact: false
    });

    const startTag = sourceCode.substring(script.loc.start.offset, script.loc.start.offset + 10);
    const endTag = '</script>';
    
    return {
      success: true,
      content: startTag + newScriptContent + endTag
    };

  } catch (error) {
    console.error('AST解析失败，使用降级处理:', error);
    return processScriptBlockFallback(script, keyPrefix, i18nMap, quoteKeys, sourceCode);
  }
};

// 降级处理脚本块
const processScriptBlockFallback = (
  script: SFCScriptBlock, 
  keyPrefix: string, 
  i18nMap: Record<string, string>, 
  quoteKeys: string,
  sourceCode: string
) => {
  try {
    let content = script.content;
    let processedContent = content;

    // 使用更精确的正则表达式处理
    processedContent = processedContent.replace(/"([^"]*[\u4e00-\u9fa5]+[^"]*)"/g, (match, chinese) => {
      if (includeChinese(chinese)) {
        const key = generateKey(keyPrefix, chinese);
        i18nMap[key] = chinese;
        return `this.${quoteKeys}('${key}')`;
      }
      return match;
    });

    processedContent = processedContent.replace(/'([^']*[\u4e00-\u9fa5]+[^']*)'/g, (match, chinese) => {
      if (includeChinese(chinese)) {
        const key = generateKey(keyPrefix, chinese);
        i18nMap[key] = chinese;
        return `this.${quoteKeys}('${key}')`;
      }
      return match;
    });

    const startTag = sourceCode.substring(script.loc.start.offset, script.loc.start.offset + 10);
    const endTag = '</script>';
    
    return {
      success: true,
      content: startTag + processedContent + endTag
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// 增强的格式保持
const preserveOriginalFormatEnhanced = (
  newSFC: string, 
  originalContent: string, 
  descriptor: SFCDescriptor
) => {
  let formattedSFC = '';
  let lastEndOffset = 0;

  // 按顺序重建文件，保持原有格式
  const blocks = [
    { type: 'template', block: descriptor.template },
    { type: 'script', block: descriptor.script },
    { type: 'scriptSetup', block: descriptor.scriptSetup },
    ...descriptor.styles.map(style => ({ type: 'style', block: style })),
    ...descriptor.customBlocks.map(block => ({ type: 'custom', block }))
  ].filter(item => item.block);

  blocks.forEach((item, index) => {
    const block = item.block!;
    
    // 添加块之间的原始格式
    if (block.loc.start.offset > lastEndOffset) {
      const betweenContent = originalContent.substring(lastEndOffset, block.loc.start.offset);
      formattedSFC += betweenContent;
    }
    
    // 添加处理后的块内容
    const blockContent = newSFC.substring(
      newSFC.indexOf(`<${item.type}`),
      newSFC.indexOf(`</${item.type}>`) + `</${item.type}>`.length
    );
    formattedSFC += blockContent;
    
    lastEndOffset = block.loc.end.offset;
  });

  // 添加文件末尾的内容
  if (lastEndOffset < originalContent.length) {
    formattedSFC += originalContent.substring(lastEndOffset);
  }

  return formattedSFC;
};

// 增强的降级处理
const fallbackToEnhancedRegex = async (
  sourceCode: string,
  sourceFilePath: string,
  keyPrefix: string,
  defaultLanguage: string,
  quoteKeys: string
): Promise<TransformResult> => {
  console.log('使用增强的正则表达式降级处理');
  
  let i18nMap: Record<string, string> = {};
  
  // 增强的正则处理
  sourceCode = sourceCode.replace(/"([^"]*[\u4e00-\u9fa5]+[^"]*)"/g, (match, content) => {
    if (includeChinese(content)) {
      const key = generateKey(keyPrefix, content);
      i18nMap[key] = content;
      return `this.${quoteKeys}('${key}')`;
    }
    return match;
  });
  
  sourceCode = sourceCode.replace(/'([^']*[\u4e00-\u9fa5]+[^']*)'/g, (match, content) => {
    if (includeChinese(content)) {
      const key = generateKey(keyPrefix, content);
      i18nMap[key] = content;
      return `this.${quoteKeys}('${key}')`;
    }
    return match;
  });
  
  await fs.writeFile(sourceFilePath, sourceCode, "utf8");
  
  return {
    i18nMap,
    hasChanges: Object.keys(i18nMap).length > 0,
    errors: ['使用了增强的降级处理方法']
  };
};

export default transformVueEnhanced; 