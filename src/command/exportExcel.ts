import * as vscode from "vscode";
import fs from "fs-extra";
import { getI18nConfig, getRootPath, flatJson } from "../utils";
import path from "path";
import Excel from "exceljs";
import readLanguageFile from "../utils/readLanguageFile";

export default (context: vscode.ExtensionContext) => {
  vscode.commands.registerCommand("jaylee-i18n.export", async (data) => {
    console.log('=== 开始导出Excel ===');
    console.log("data:", data);
    
    try {
      // 获取项目根路径
      const rootPath = getRootPath();
      console.log('项目根路径:', rootPath);
      
      if (!rootPath) {
        vscode.window.showErrorMessage(`❌ 无法获取项目根路径\n\n请确保:\n1. 在 VSCode 中打开了项目文件夹\n2. 项目包含 i18n.config.js 配置文件`);
        return;
      }
      
      // 获取配置
      const config = getI18nConfig();
      console.log('项目配置:', config);
      
      const { outDir, defaultLanguage, language = [], extname } = config;
      
      if (!outDir) {
        vscode.window.showErrorMessage(`❌ 配置文件中缺少 outDir 配置\n\n请在 i18n.config.js 中设置输出目录`);
        return;
      }
      
      if (!defaultLanguage) {
        vscode.window.showErrorMessage(`❌ 配置文件中缺少 defaultLanguage 配置\n\n请在 i18n.config.js 中设置默认语言`);
        return;
      }
      
      if (!language || language.length === 0) {
        vscode.window.showErrorMessage(`❌ 配置文件中缺少 language 配置\n\n请在 i18n.config.js 中设置语言列表`);
        return;
      }
      
      // 检查输出目录是否存在
      const outDirPath = path.resolve(rootPath, outDir);
      console.log('输出目录路径:', outDirPath);
      
      if (!fs.existsSync(outDirPath)) {
        vscode.window.showErrorMessage(`❌ 输出目录不存在: ${outDirPath}\n\n请先运行提取命令生成语言文件`);
        return;
      }
      
      // 读取 JSON 文件
      const defaultLanguageFileName = defaultLanguage + "." + extname;
      console.log("默认语言文件名:", defaultLanguageFileName);
      
      const jsonFilePath = path.resolve(rootPath, outDir, defaultLanguageFileName);
      console.log("默认语言文件路径:", jsonFilePath);
      
      // 检查默认语言文件是否存在
      if (!fs.existsSync(jsonFilePath)) {
        vscode.window.showErrorMessage(`❌ 默认语言文件不存在: ${jsonFilePath}\n\n请先运行提取命令生成语言文件`);
        return;
      }
      
      // 预先读取所有语言文件的内容
      const langDataMap: { [lang: string]: { [key: string]: string } } = {};
      const missingFiles: string[] = [];
      
      for (const lang of language) {
        const langFilePath = path.resolve(rootPath, outDir, lang + "." + extname);
        console.log(`检查语言文件: ${langFilePath}`);
        
        if (fs.existsSync(langFilePath)) {
          const langData = readLanguageFile(langFilePath);
          // 确保转换为扁平格式
          langDataMap[lang] = flatJson(langData as any);
          console.log(`语言 ${lang} 文件读取成功，包含 ${Object.keys(langDataMap[lang]).length} 个键值对`);
        } else {
          console.log(`语言文件不存在: ${langFilePath}`);
          missingFiles.push(lang);
          langDataMap[lang] = {};
        }
      }
      
      if (missingFiles.length > 0) {
        console.log('缺失的语言文件:', missingFiles);
        vscode.window.showWarningMessage(`⚠️ 以下语言文件不存在，将使用空值: ${missingFiles.join(', ')}`);
      }
      
      const jsonObject = readLanguageFile(jsonFilePath);
      console.log('默认语言文件读取成功，包含键值对数量:', Object.keys(jsonObject).length);
      
      // 确保转换为扁平格式
      const flatJsonObject = flatJson(jsonObject as any);
      console.log('扁平化后的键值对数量:', Object.keys(flatJsonObject).length);
      
      if (Object.keys(flatJsonObject).length === 0) {
        vscode.window.showWarningMessage(`⚠️ 默认语言文件中没有找到任何键值对\n\n文件路径: ${jsonFilePath}`);
      }
      
      async function createAndExportExcel() {
        try {
          console.log('开始创建Excel文件');
          
          // 创建 Excel 工作簿和工作表
          const workbook = new Excel.Workbook();
          const worksheet = workbook.addWorksheet("Sheet1");

          // 获取 JSON 对象的所有键，用于设置表头
          // 设置表头为 JSON 对象的键（key）
          const languageList = language.filter((item) => item !== defaultLanguage);
          console.log("语言列表（除默认语言）:", languageList);
          
          const header = languageList.map((item) => {
            return { header: item, key: item, width: 30 };
          });
          
          worksheet.columns = [
            { header: "key", key: "key", width: 50 },
            { header: defaultLanguage, key: defaultLanguage, width: 50 },
            ...header,
          ];

          // 设置第一列的每个单元格为锁定状态
          worksheet.eachRow(
            { includeEmpty: true },
            function (row: { getCell: (arg0: number) => any }, rowNumber: any) {
              const cell = row.getCell(1); // 获取第一列的单元格
              if (cell) {
                cell.protection = { locked: true }; // 设置单元格为锁定状态
              }
            }
          );
          
          // 写入 JSON 数据的值到中文列，英文列留空
          const startRow = 2; // 从第一行开始写入数据（不包括表头）
          let currentRow = startRow;
          let processedKeys = 0;
          
          console.log("开始写入Excel数据");
          for (const key in jsonObject) {
            worksheet.getCell(`A${currentRow}`).value = key;

            // 写入默认语言和其他语言的值
            const rowData: string[] = [flatJsonObject[key] || ""]; // 默认语言的值放在第一位
            language.forEach((lang, index) => {
              rowData.push(langDataMap[lang][key] || ""); // 添加当前语言的值，若不存在则留空
            });

            // 将当前行的所有语言值写入Excel
            rowData.forEach((value, colIndex) => {
              const cellRef = `${String.fromCharCode(65 + colIndex + 1)}${currentRow}`; // 考虑到A列为key，从B列开始
              worksheet.getCell(cellRef).value = value;
            });

            currentRow++; // 处理完一行后行数递增
            processedKeys++;
          }
          
          console.log(`处理完成，共写入 ${processedKeys} 个键值对`);
          
          // 写入 Excel 文件
          const excelFilePath = path.resolve(rootPath, "excelFile.xlsx");
          console.log('Excel文件路径:', excelFilePath);
          
          await workbook.xlsx.writeFile(excelFilePath);
          console.log(`Excel文件已创建: ${excelFilePath}`);
          
          vscode.window.showInformationMessage(`✅ i18n成功导出Excel\n\n文件路径: ${excelFilePath}\n处理键值对: ${processedKeys} 个\n语言数量: ${language.length} 个\n\n请查看项目根目录下的 excelFile.xlsx 文件`);
          
        } catch (error) {
          console.error("创建Excel文件时出错:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`❌ 导出Excel失败: ${errorMessage}\n\n可能的原因:\n1. 文件权限不足\n2. 磁盘空间不足\n3. Excel文件被其他程序占用\n\n请检查:\n1. 文件权限\n2. 磁盘空间\n3. 关闭可能占用Excel文件的程序`);
        }
      }
      
      // 运行函数
      await createAndExportExcel();
      
    } catch (error) {
      console.error('导出Excel过程中出错:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`❌ 导出Excel失败: ${errorMessage}\n\n请检查:\n1. 项目配置是否正确\n2. 语言文件是否存在\n3. 插件是否正常激活`);
    }
  });
};
