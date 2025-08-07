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

// 最终改进的Vue转换实现
const transformVueFinal = async (data) => {
  const sourceFilePath = data.path;
  const sourceCode = await fs.readFile(sourceFilePath, "utf8");
  const { defaultLanguage, quoteKeys } = mockConfig;
  let keyPrefix = path.basename(path.dirname(sourceFilePath)) + "." + path.basename(sourceFilePath, ".vue");
  let i18nMap = {};
  let errors = [];

  try {
    // 使用更精确的解析方法
    const parseResult = parseVueFileFinal(sourceCode);
    
    let newSFC = '';
    let processedTemplate = false;
    let processedScript = false;

    // 处理 template
    if (parseResult.template) {
      const templateResult = processTemplateBlockFinal(parseResult.template, keyPrefix, i18nMap, quoteKeys);
      if (templateResult.success) {
        newSFC += templateResult.content;
        processedTemplate = true;
      } else {
        errors.push(`Template处理失败: ${templateResult.error || '未知错误'}`);
      }
    }

    // 处理 script
    if (parseResult.script) {
      const scriptResult = processScriptBlockFinal(parseResult.script, keyPrefix, i18nMap, quoteKeys);
      if (scriptResult.success) {
        newSFC += scriptResult.content;
        processedScript = true;
      } else {
        errors.push(`Script处理失败: ${scriptResult.error || '未知错误'}`);
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

// 最终改进的Vue文件解析
const parseVueFileFinal = (sourceCode) => {
  const result = {
    template: null,
    script: null,
    scriptSetup: null,
    styles: []
  };

  // 更精确的template解析
  const templateMatch = sourceCode.match(/<template[^>]*>([\s\S]*?)<\/template>/);
  if (templateMatch) {
    const templateStart = sourceCode.indexOf('<template');
    const templateEnd = sourceCode.indexOf('</template>') + '</template>'.length;
    const startTag = sourceCode.substring(templateStart, sourceCode.indexOf('>', templateStart) + 1);
    
    result.template = {
      content: templateMatch[1],
      startTag: startTag,
      fullContent: sourceCode.substring(templateStart, templateEnd)
    };
  }

  // 更精确的script解析
  const scriptMatch = sourceCode.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (scriptMatch) {
    const scriptStart = sourceCode.indexOf('<script');
    const scriptEnd = sourceCode.indexOf('</script>') + '</script>'.length;
    const startTag = sourceCode.substring(scriptStart, sourceCode.indexOf('>', scriptStart) + 1);
    
    result.script = {
      content: scriptMatch[1],
      startTag: startTag,
      fullContent: sourceCode.substring(scriptStart, scriptEnd)
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

// 最终改进的template处理
const processTemplateBlockFinal = (template, keyPrefix, i18nMap, quoteKeys) => {
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

    // 2. 处理 {{ }} 中的中文 - 最终版本
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

    // 3. 处理纯文本中的中文 - 最终版本
    processedContent = processedContent.replace(/[\u4e00-\u9fa5]+/g, (chinese) => {
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

    return {
      success: true,
      content: template.startTag + processedContent + '</template>'
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// 最终改进的script处理 - 使用智能解析
const processScriptBlockFinal = (script, keyPrefix, i18nMap, quoteKeys) => {
  try {
    let content = script.content;
    let processedContent = content;

    // 智能字符串处理 - 避免误匹配TypeScript接口
    const lines = content.split('\n');
    const processedLines = lines.map(line => {
      // 跳过TypeScript接口定义行
      if (line.trim().startsWith('interface') || line.trim().startsWith('type')) {
        return line;
      }
      
      // 跳过import语句
      if (line.trim().startsWith('import')) {
        return line;
      }
      
      // 处理字符串字面量
      let processedLine = line;
      
      // 处理双引号字符串
      processedLine = processedLine.replace(/"([^"]*[\u4e00-\u9fa5]+[^"]*)"/g, (match, chinese) => {
        // 检查是否在注释中
        const beforeMatch = processedLine.substring(0, processedLine.indexOf(match));
        const inComment = /\/\*[\s\S]*?\*\/|\/\/.*$/.test(beforeMatch);
        
        if (inComment) {
          return match;
        }
        
        if (includeChinese(chinese)) {
          const key = generateKey(keyPrefix, chinese);
          i18nMap[key] = chinese;
          return `this.${quoteKeys}('${key}')`;
        }
        return match;
      });

      // 处理单引号字符串
      processedLine = processedLine.replace(/'([^']*[\u4e00-\u9fa5]+[^']*)'/g, (match, chinese) => {
        // 检查是否在注释中
        const beforeMatch = processedLine.substring(0, processedLine.indexOf(match));
        const inComment = /\/\*[\s\S]*?\*\/|\/\/.*$/.test(beforeMatch);
        
        if (inComment) {
          return match;
        }
        
        if (includeChinese(chinese)) {
          const key = generateKey(keyPrefix, chinese);
          i18nMap[key] = chinese;
          return `this.${quoteKeys}('${key}')`;
        }
        return match;
      });
      
      return processedLine;
    });

    processedContent = processedLines.join('\n');

    return {
      success: true,
      content: script.startTag + processedContent + '</script>'
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// 测试最终改进版本
const testFinalVersion = async () => {
  const testDir = path.join(__dirname, 'test-vue-files');
  const complexFilePath = path.join(testDir, 'complex.vue');
  
  console.log('开始测试最终改进版本的Vue转换工具...\n');
  
  try {
    // 先检查文件是否存在
    if (!await fs.pathExists(complexFilePath)) {
      console.error('复杂测试文件不存在，请先创建');
      return;
    }
    
    // 读取原始文件内容
    const originalContent = await fs.readFile(complexFilePath, 'utf8');
    console.log('原始文件内容预览:');
    console.log(originalContent.substring(0, 200) + '...\n');
    
    // 执行转换
    const result = await transformVueFinal({ path: complexFilePath });
    
    console.log('转换结果:');
    console.log(`  提取的中文数量: ${Object.keys(result.i18nMap).length}`);
    console.log(`  是否有变化: ${result.hasChanges}`);
    
    if (result.errors) {
      console.log(`  错误: ${result.errors.join(', ')}`);
    }
    
    // 显示提取的key和对应的中文
    const keys = Object.keys(result.i18nMap);
    if (keys.length > 0) {
      console.log('\n提取的翻译项:');
      keys.forEach((key, index) => {
        console.log(`  ${index + 1}. ${key}: "${result.i18nMap[key]}"`);
      });
    }
    
    // 读取转换后的文件内容
    const convertedContent = await fs.readFile(complexFilePath, 'utf8');
    console.log('\n转换后文件内容预览:');
    console.log(convertedContent.substring(0, 600) + '...\n');
    
    // 检查语言文件
    const localeFile = path.join(testDir, 'zh_cn.json');
    if (await fs.pathExists(localeFile)) {
      const localeContent = await fs.readJson(localeFile);
      console.log('语言文件内容:');
      console.log(JSON.stringify(localeContent, null, 2));
    }
    
  } catch (error) {
    console.error(`测试失败: ${error.message}`);
  }
  
  console.log('\n测试完成！');
};

// 运行测试
testFinalVersion().catch(console.error); 