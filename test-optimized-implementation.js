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
  return `${prefix}.${text.replace(/[^\w]/g, '-').toLowerCase()}`;
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

// 简化的优化版本实现
const transformVueOptimized = async (data) => {
  const sourceFilePath = data.path;
  const sourceCode = await fs.readFile(sourceFilePath, "utf8");
  const { defaultLanguage, quoteKeys } = mockConfig;
  let keyPrefix = path.basename(path.dirname(sourceFilePath)) + "." + path.basename(sourceFilePath, ".vue");
  let i18nMap = {};
  let errors = [];

  try {
    // 使用正则表达式模拟Vue Compiler SFC的解析
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

// 测试函数
const runTests = async () => {
  const testDir = path.join(__dirname, 'test-vue-files');
  const testFiles = await fs.readdir(testDir);
  
  console.log('开始测试优化后的Vue转换工具...\n');
  
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