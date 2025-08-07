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

// 优化的Vue转换实现
const transformVueOptimized = async (data) => {
  const sourceFilePath = data.path;
  const sourceCode = await fs.readFile(sourceFilePath, "utf8");
  const { defaultLanguage, quoteKeys } = mockConfig;
  let keyPrefix = path.basename(path.dirname(sourceFilePath)) + "." + path.basename(sourceFilePath, ".vue");
  let i18nMap = {};
  let errors = [];

  try {
    // 使用更精确的正则表达式解析Vue文件
    const templateMatch = sourceCode.match(/<template[^>]*>([\s\S]*?)<\/template>/);
    const scriptMatch = sourceCode.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    const scriptSetupMatch = sourceCode.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/);

    let newSFC = '';
    let processedTemplate = false;
    let processedScript = false;

    // 处理 template
    if (templateMatch) {
      let templateContent = templateMatch[1];
      let processedTemplateContent = templateContent;

      // 1. 处理属性中的中文
      processedTemplateContent = processedTemplateContent.replace(
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
      processedTemplateContent = processedTemplateContent.replace(/{{([^}]*)}}/g, (match, expr) => {
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
      processedTemplateContent = processedTemplateContent.replace(/[\u4e00-\u9fa5]+/g, (chinese) => {
        const beforeMatch = processedTemplateContent.substring(0, processedTemplateContent.indexOf(chinese));
        const inExpression = beforeMatch.lastIndexOf('{{') > beforeMatch.lastIndexOf('}}');
        const inAttribute = /:\w+="[^"]*$/.test(beforeMatch);
        
        if (inExpression || inAttribute) {
          return chinese;
        }
        
        const key = generateKey(keyPrefix, chinese);
        i18nMap[key] = chinese;
        return `{{ ${quoteKeys}('${key}') }}`;
      });

      const templateStart = sourceCode.indexOf('<template');
      const templateEnd = sourceCode.indexOf('</template>') + '</template>'.length;
      const templateTag = sourceCode.substring(templateStart, sourceCode.indexOf('>', templateStart) + 1);
      
      newSFC += templateTag + processedTemplateContent + '</template>';
      processedTemplate = true;
    }

    // 处理 script
    const scriptContent = scriptMatch ? scriptMatch[1] : (scriptSetupMatch ? scriptSetupMatch[1] : '');
    if (scriptContent) {
      let newScriptContent = scriptContent;

      // 处理字符串字面量中的中文
      newScriptContent = newScriptContent.replace(/"([^"]*[\u4e00-\u9fa5]+[^"]*)"/g, (match, chinese) => {
        if (includeChinese(chinese)) {
          const key = generateKey(keyPrefix, chinese);
          i18nMap[key] = chinese;
          return `this.${quoteKeys}('${key}')`;
        }
        return match;
      });

      newScriptContent = newScriptContent.replace(/'([^']*[\u4e00-\u9fa5]+[^']*)'/g, (match, chinese) => {
        if (includeChinese(chinese)) {
          const key = generateKey(keyPrefix, chinese);
          i18nMap[key] = chinese;
          return `this.${quoteKeys}('${key}')`;
        }
        return match;
      });

      const scriptStart = sourceCode.indexOf('<script');
      const scriptEnd = sourceCode.indexOf('</script>') + '</script>'.length;
      const scriptTag = sourceCode.substring(scriptStart, sourceCode.indexOf('>', scriptStart) + 1);
      
      newSFC += scriptTag + newScriptContent + '</script>';
      processedScript = true;
    }

    // 处理 style 和其他块
    const styleMatch = sourceCode.match(/<style[^>]*>([\s\S]*?)<\/style>/g);
    if (styleMatch) {
      styleMatch.forEach(styleBlock => {
        newSFC += styleBlock;
      });
    }

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

// 测试复杂文件
const testComplexFile = async () => {
  const testDir = path.join(__dirname, 'test-vue-files');
  const complexFilePath = path.join(testDir, 'complex.vue');
  
  console.log('开始测试复杂文件 complex.vue...\n');
  
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
    const result = await transformVueOptimized({ path: complexFilePath });
    
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
    console.log(convertedContent.substring(0, 300) + '...\n');
    
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
testComplexFile().catch(console.error); 