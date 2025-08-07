const fs = require('fs-extra');
const path = require('path');

// 模拟VSCode API
const vscode = {
  Uri: {
    file: (path) => ({ fsPath: path })
  }
};

// 模拟配置
const mockConfig = {
  defaultLanguage: 'zh_cn',
  quoteKeys: '$t'
};

// 模拟工具函数
const includeChinese = (text) => /[\u4e00-\u9fa5]/.test(text);

const generateKey = (prefix, text) => {
  // 改进的key生成逻辑
  const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
  if (!cleanText) {return `${prefix}.unknown`;}
  return `${prefix}.${cleanText}`;
};

const saveLocaleFile = async (i18nMap, defaultLanguage, uri) => {
  const localeDir = path.dirname(uri.fsPath);
  const localeFile = path.join(localeDir, `${defaultLanguage}.json`);
  
  let existingLocale = {};
  if (await fs.pathExists(localeFile)) {
    existingLocale = await fs.readJson(localeFile);
  }
  
  const newLocale = { ...existingLocale, ...i18nMap };
  await fs.writeJson(localeFile, newLocale, { spaces: 2 });
  
  console.log(`保存语言文件: ${localeFile}`);
  console.log(`新增 ${Object.keys(i18nMap).length} 个翻译项`);
};

// 使用Vue Compiler SFC的优化实现
const transformVueOptimized = async (data) => {
  const sourceFilePath = data.path;
  const sourceCode = await fs.readFile(sourceFilePath, "utf8");
  const { defaultLanguage, quoteKeys } = mockConfig;
  let keyPrefix = path.basename(path.dirname(sourceFilePath)) + "." + path.basename(sourceFilePath, ".vue");
  let i18nMap = {};
  let errors = [];

  try {
    // 模拟Vue Compiler SFC的解析结果
    const parseResult = parseVueFile(sourceCode);
    
    let newSFC = '';
    let processedTemplate = false;
    let processedScript = false;

    // 处理 template
    if (parseResult.template) {
      const templateResult = processTemplateBlock(parseResult.template, keyPrefix, i18nMap, quoteKeys);
      if (templateResult.success) {
        newSFC += templateResult.content;
        processedTemplate = true;
      } else {
        errors.push(`Template处理失败: ${templateResult.error}`);
      }
    }

    // 处理 script
    if (parseResult.script) {
      const scriptResult = processScriptBlock(parseResult.script, keyPrefix, i18nMap, quoteKeys);
      if (scriptResult.success) {
        newSFC += scriptResult.content;
        processedScript = true;
      } else {
        errors.push(`Script处理失败: ${scriptResult.error}`);
      }
    }

    // 处理 script setup
    if (parseResult.scriptSetup) {
      const scriptSetupResult = processScriptBlock(parseResult.scriptSetup, keyPrefix, i18nMap, quoteKeys);
      if (scriptSetupResult.success) {
        newSFC += scriptSetupResult.content;
        processedScript = true;
      } else {
        errors.push(`ScriptSetup处理失败: ${scriptSetupResult.error}`);
      }
    }

    // 处理 style 块
    parseResult.styles.forEach(style => {
      newSFC += style.content;
    });

    // 保存结果
    await saveLocaleFile(i18nMap, defaultLanguage, vscode.Uri.file(sourceFilePath));
    await fs.writeFile(sourceFilePath, newSFC, "utf8");

    return {
      i18nMap,
      hasChanges: Object.keys(i18nMap).length > 0,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    console.error('处理失败:', error);
    return {
      i18nMap: {},
      hasChanges: false,
      errors: [error.message]
    };
  }
};

// 解析Vue文件（模拟Vue Compiler SFC）
const parseVueFile = (sourceCode) => {
  const result = {
    template: null,
    script: null,
    scriptSetup: null,
    styles: []
  };

  // 解析template
  const templateMatch = sourceCode.match(/<template[^>]*>([\s\S]*?)<\/template>/);
  if (templateMatch) {
    result.template = {
      content: templateMatch[1],
      startTag: sourceCode.substring(sourceCode.indexOf('<template'), sourceCode.indexOf('>', sourceCode.indexOf('<template')) + 1)
    };
  }

  // 解析script
  const scriptMatch = sourceCode.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (scriptMatch) {
    result.script = {
      content: scriptMatch[1],
      startTag: sourceCode.substring(sourceCode.indexOf('<script'), sourceCode.indexOf('>', sourceCode.indexOf('<script')) + 1)
    };
  }

  // 解析script setup
  const scriptSetupMatch = sourceCode.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/);
  if (scriptSetupMatch) {
    result.scriptSetup = {
      content: scriptSetupMatch[1],
      startTag: sourceCode.substring(sourceCode.indexOf('<script setup'), sourceCode.indexOf('>', sourceCode.indexOf('<script setup')) + 1)
    };
  }

  // 解析style
  const styleMatches = sourceCode.match(/<style[^>]*>([\s\S]*?)<\/style>/g);
  if (styleMatches) {
    styleMatches.forEach(styleBlock => {
      result.styles.push({
        content: styleBlock
      });
    });
  }

  return result;
};

// 处理template块
const processTemplateBlock = (template, keyPrefix, i18nMap, quoteKeys) => {
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

    // 2. 处理 {{ }} 中的中文
    processedContent = processedContent.replace(/{{([^}]*)}}/g, (match, expr) => {
      if (includeChinese(expr)) {
        return expr.replace(/[\u4e00-\u9fa5]+/g, (chinese) => {
          const key = generateKey(keyPrefix, chinese);
          i18nMap[key] = chinese;
          return `${quoteKeys}('${key}')`;
        });
      }
      return match;
    });

    // 3. 处理纯文本中的中文
    processedContent = processedContent.replace(/[\u4e00-\u9fa5]+/g, (chinese) => {
      const beforeMatch = processedContent.substring(0, processedContent.indexOf(chinese));
      const inExpression = beforeMatch.lastIndexOf('{{') > beforeMatch.lastIndexOf('}}');
      const inAttribute = /:\w+="[^"]*$/.test(beforeMatch);
      
      if (inExpression || inAttribute) {
        return chinese;
      }
      
      const key = generateKey(keyPrefix, chinese);
      i18nMap[key] = chinese;
      return `{{ ${quoteKeys}('${key}') }}`;
    });

    return {
      success: true,
      content: template.startTag + processedContent + '</template>'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// 处理script块
const processScriptBlock = (script, keyPrefix, i18nMap, quoteKeys) => {
  try {
    let content = script.content;
    let processedContent = content;

    // 处理字符串字面量中的中文
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

    return {
      success: true,
      content: script.startTag + processedContent + '</script>'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// 测试函数
const runTests = async () => {
  const testDir = path.join(__dirname, 'test-vue-files');
  const testFiles = await fs.readdir(testDir);
  
  console.log('开始测试Vue Compiler SFC优化版本...\n');
  
  for (const file of testFiles) {
    if (file.endsWith('.vue')) {
      const filePath = path.join(testDir, file);
      console.log(`测试文件: ${file}`);
      
      try {
        const result = await transformVueOptimized({ path: filePath });
        
        console.log(`  提取的中文数量: ${Object.keys(result.i18nMap).length}`);
        console.log(`  是否有变化: ${result.hasChanges}`);
        
        if (result.errors) {
          console.log(`  错误: ${result.errors.join(', ')}`);
        }
        
        // 显示提取的key示例
        const keys = Object.keys(result.i18nMap);
        if (keys.length > 0) {
          console.log(`  提取的key示例: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`);
          console.log(`  对应的中文: ${Object.values(result.i18nMap).slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`);
        }
        
        console.log('');
        
      } catch (error) {
        console.error(`  处理失败: ${error.message}`);
      }
    }
  }
  
  console.log('测试完成！');
};

// 运行测试
runTests().catch(console.error); 