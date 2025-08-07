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

  // 1. 处理 template 块 - 使用更智能的方法处理嵌套标签
  let newSFC = '';
  let processedTemplate = false;
  
  // 使用更智能的方法匹配 template 块，处理嵌套情况
  const findTemplateBlock = (source: string) => {
    const templateStart = source.indexOf('<template');
    if (templateStart === -1) {return null;}
    
    let depth = 0;
    let pos = templateStart;
    
    // 找到开始的 template 标签
    const startTagMatch = source.slice(pos).match(/<template(?:\s+[^>]*)?>/);
    if (!startTagMatch) {return null;}
    
    const startTag = startTagMatch[0];
    pos += startTag.length;
    depth = 1;
    
    // 查找匹配的结束标签
    while (pos < source.length && depth > 0) {
      const nextOpen = source.indexOf('<template', pos);
      const nextClose = source.indexOf('</template>', pos);
      
      if (nextClose === -1) {break;} // 没有找到结束标签
      
      if (nextOpen !== -1 && nextOpen < nextClose) {
        // 找到了嵌套的 template 开始标签
        depth++;
        pos = nextOpen + 1;
      } else {
        // 找到了结束标签
        depth--;
        if (depth === 0) {
          // 找到了匹配的结束标签
          const endPos = nextClose + '</template>'.length;
          return {
            fullBlock: source.slice(templateStart, endPos),
            content: source.slice(templateStart + startTag.length, nextClose),
            startTag: startTag
          };
        }
        pos = nextClose + 1;
      }
    }
    
    return null;
  };
  
  const templateBlock = findTemplateBlock(sourceCode);
  if (templateBlock) {
    const { fullBlock, content, startTag } = templateBlock;
    let processedTemplateContent = content;
    
    // 处理 template 中的中文
    // 1. 先处理属性中的中文 label="中文"
    processedTemplateContent = processedTemplateContent.replace(/([\s])([a-zA-Z0-9_-]+)="([^"]*[\u4e00-\u9fa5]+[^"]*)"/g, (match, space, attr, chinese) => {
      // 检查是否已经包含 $t()，如果包含则跳过
      if (chinese.includes('$t(')) {
        return match;
      }
      const key = generateKey(keyPrefix, chinese);
      i18nMap[key] = chinese;
      return `${space}:${attr}="${quoteKeys}('${key}')"`;
    });
    
    // 2. 处理 {{ ... }} 中的中文
    processedTemplateContent = processedTemplateContent.replace(/{{([^}]*)}}/g, (match, expr) => {
      if (includeChinese(expr)) {
        return expr.replace(CHINESE_RE, (chinese: string) => {
          const key = generateKey(keyPrefix, chinese);
          i18nMap[key] = chinese;
          return `${quoteKeys}('${key}')`;
        });
      }
      return match;
    });
    
    // 3. 最后处理纯文本中的中文，但跳过已经处理过的内容
    processedTemplateContent = processedTemplateContent.replace(/[\u4e00-\u9fa5]+/g, (chinese: string) => {
      // 检查是否已经被处理过（在 {{ }} 中或属性中）
      const beforeMatch = processedTemplateContent.substring(0, processedTemplateContent.indexOf(chinese));
      const afterMatch = processedTemplateContent.substring(processedTemplateContent.indexOf(chinese) + chinese.length);
      
      // 如果前面有 {{ 且后面有 }}，说明已经在 {{ }} 中
      const inExpression = beforeMatch.lastIndexOf('{{') > beforeMatch.lastIndexOf('}}');
      
      // 如果前面有 :label= 等属性，说明已经在属性中
      const inAttribute = /:\w+="[^"]*$/.test(beforeMatch);
      
      if (inExpression || inAttribute) {
        return chinese; // 跳过，不处理
      }
      
      const key = generateKey(keyPrefix, chinese);
      i18nMap[key] = chinese;
      return `{{ ${quoteKeys}('${key}') }}`;
    });
    
    // 重新组装 template 块，确保完整保留
    const newTemplateBlock = startTag + processedTemplateContent + '</template>';
    newSFC += newTemplateBlock;
    processedTemplate = true;
  }

  // 用正则提取所有其他块，保持原有格式
  const blockRegex = /<(script(?:\s+setup)?|style)([^>]*)>([\s\S]*?)<\/\1>/g;
  let match;
  const processedBlocks = new Set();
  
  // 重新设置正则表达式的lastIndex，确保从头开始匹配
  blockRegex.lastIndex = 0;
  
  while ((match = blockRegex.exec(sourceCode)) !== null) {
    const tag = match[1];
    const fullBlock = match[0];
    
    // 跳过 template（已处理）
    if (tag === 'template') {continue;}
    
    // 避免重复处理
    if (processedBlocks.has(fullBlock)) {continue;}
    processedBlocks.add(fullBlock);
      
      // 处理 script 块中的中文
      if (tag === 'script' || tag === 'script setup') {
        const scriptContent = match[3];
        const scriptTagMatch = match[0].match(/^<script[^>]*>/);
        if (!scriptTagMatch) {continue;}
        const scriptTag = scriptTagMatch[0];
        
        try {
          // 使用 Babel 解析 script 内容，仅用于识别需要替换的字符串
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
          const chineseStrings: string[] = [];
          traverse(ast, {
            StringLiteral(path) {
              if (includeChinese(path.node.value)) {
                chineseStrings.push(path.node.value);
              }
            },
            JSXText(path) {
              const value = path.node.value.trim();
              if (includeChinese(value)) {
                chineseStrings.push(value);
              }
            },
          });

          // 使用正则表达式精确替换，保持原有格式
          let newScriptContent = scriptContent;
          
          // 去重并排序，避免重复替换
          const uniqueStrings = [...new Set(chineseStrings)];
          
          for (const chinese of uniqueStrings) {
            const key = generateKey(keyPrefix, chinese);
            i18nMap[key] = chinese;
            
            // 精确匹配字符串字面量，包括引号
            const escapedChinese = chinese.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // 匹配双引号字符串
            newScriptContent = newScriptContent.replace(
              new RegExp(`"${escapedChinese}"`, 'g'),
              `this.${quoteKeys}('${key}')`
            );
            
            // 匹配单引号字符串
            newScriptContent = newScriptContent.replace(
              new RegExp(`'${escapedChinese}'`, 'g'),
              `this.${quoteKeys}('${key}')`
            );
            
            // 匹配反引号字符串
            newScriptContent = newScriptContent.replace(
              new RegExp(`\`${escapedChinese}\``, 'g'),
              `this.${quoteKeys}('${key}')`
            );
          }

          const newScriptBlock = scriptTag + newScriptContent + '</script>';
          newSFC += newScriptBlock;
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
          newSFC += newScriptBlock;
        }
    } else {
      // 其他块（style、自定义块等）保持原样
      newSFC += fullBlock;
    }
  }

  // 保持原有格式：在template和script之间添加原有的换行
  if (processedTemplate && newSFC.includes('</template>') && newSFC.includes('<script')) {
    const templateEndIndex = newSFC.indexOf('</template>');
    const scriptStartIndex = newSFC.indexOf('<script');
    
    if (templateEndIndex !== -1 && scriptStartIndex !== -1 && scriptStartIndex > templateEndIndex) {
      const beforeScript = newSFC.substring(0, templateEndIndex + '</template>'.length);
      const afterScript = newSFC.substring(scriptStartIndex);
      const betweenContent = newSFC.substring(templateEndIndex + '</template>'.length, scriptStartIndex);
      
      // 检查原始文件中template和script之间的格式
      const originalTemplateEndIndex = sourceCode.indexOf('</template>');
      const originalScriptStartIndex = sourceCode.indexOf('<script');
      
      if (originalTemplateEndIndex !== -1 && originalScriptStartIndex !== -1 && originalScriptStartIndex > originalTemplateEndIndex) {
        const originalBetweenContent = sourceCode.substring(originalTemplateEndIndex + '</template>'.length, originalScriptStartIndex);
        
        // 使用原始格式，确保保持原有的换行
        if (originalBetweenContent.trim() === '' && !betweenContent.includes('\n')) {
          // 如果原始格式是空的，添加两个换行符（Vue标准格式）
          newSFC = beforeScript + '\n\n' + afterScript;
        } else if (originalBetweenContent.includes('\n')) {
          // 如果原始格式有换行，保持原有格式
          newSFC = beforeScript + originalBetweenContent + afterScript;
        }
      }
    }
  }

  // 保持原有格式：在所有相邻标签之间保持原有格式
  const fixAdjacentTags = (newContent: string, originalContent: string) => {
    let fixedContent = newContent;
    
    // 检查所有可能的相邻标签组合
    const tagPairs = [
      { endTag: '</template>', startTag: '<script' },
      { endTag: '</script>', startTag: '<style' },
      { endTag: '</template>', startTag: '<style' },
      { endTag: '</script>', startTag: '<template' }
    ];
    
    for (const pair of tagPairs) {
      const endTagIndex = fixedContent.indexOf(pair.endTag);
      const startTagIndex = fixedContent.indexOf(pair.startTag);
      
      if (endTagIndex !== -1 && startTagIndex !== -1 && startTagIndex > endTagIndex) {
        const beforeStartTag = fixedContent.substring(0, endTagIndex + pair.endTag.length);
        const afterStartTag = fixedContent.substring(startTagIndex);
        const betweenContent = fixedContent.substring(endTagIndex + pair.endTag.length, startTagIndex);
        
        // 检查原始文件中对应标签之间的格式
        const originalEndTagIndex = originalContent.indexOf(pair.endTag);
        const originalStartTagIndex = originalContent.indexOf(pair.startTag);
        
        if (originalEndTagIndex !== -1 && originalStartTagIndex !== -1 && originalStartTagIndex > originalEndTagIndex) {
          const originalBetweenContent = originalContent.substring(originalEndTagIndex + pair.endTag.length, originalStartTagIndex);
          
          // 使用原始格式，确保保持原有的换行
          if (originalBetweenContent.trim() === '' && !betweenContent.includes('\n')) {
            // 如果原始格式是空的，添加两个换行符（Vue标准格式）
            fixedContent = beforeStartTag + '\n\n' + afterStartTag;
          } else if (originalBetweenContent.includes('\n')) {
            // 如果原始格式有换行，保持原有格式
            fixedContent = beforeStartTag + originalBetweenContent + afterStartTag;
          } else {
            // 如果原始格式没有换行但当前也没有，添加标准换行符
            fixedContent = beforeStartTag + '\n\n' + afterStartTag;
          }
        } else {
          // 如果找不到原始格式，添加标准换行符
          if (!betweenContent.includes('\n')) {
            fixedContent = beforeStartTag + '\n\n' + afterStartTag;
          }
        }
      }
    }
    
    return fixedContent;
  };
  
  // 应用格式修复
  newSFC = fixAdjacentTags(newSFC, sourceCode);

  // 4. 保存 key 映射
  await saveLocaleFile(i18nMap, defaultLanguage, vscode.Uri.file(sourceFilePath));
  // 5. 直接修改源文件
  await fs.writeFile(sourceFilePath, newSFC, "utf8");
  return { 
    i18nMap, 
    hasChanges: Object.keys(i18nMap).length > 0  // 是否有提取到中文
  };
};

export default transformVue;
