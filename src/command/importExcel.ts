import * as vscode from "vscode";
import fs from "fs-extra";
import path from "path";
import Excel from "exceljs";
import { getI18nConfig, getRootPath } from "../utils";

export default (context: vscode.ExtensionContext) => {
  vscode.commands.registerCommand("jaylee-i18n.import", async () => {
    console.log('=== 开始导入Excel ===');
    
    try {
      // 检查项目配置
      const rootPath = getRootPath();
      console.log('项目根路径:', rootPath);
      
      if (!rootPath) {
        vscode.window.showErrorMessage(`❌ 无法获取项目根路径\n\n请确保:\n1. 在 VSCode 中打开了项目文件夹\n2. 项目包含 i18n.config.js 配置文件`);
        return;
      }
      
      const config = getI18nConfig();
      console.log('项目配置:', config);
      
      const { outDir, extname } = config;
      
      if (!outDir) {
        vscode.window.showErrorMessage(`❌ 配置文件中缺少 outDir 配置\n\n请在 i18n.config.js 中设置输出目录`);
        return;
      }
      
      // 检查输出目录是否存在
      const outDirPath = path.resolve(rootPath, outDir);
      console.log('输出目录路径:', outDirPath);
      
      if (!fs.existsSync(outDirPath)) {
        const createDir = await vscode.window.showWarningMessage(
          `输出目录不存在: ${outDirPath}\n\n是否要创建输出目录？`,
          '是', '否'
        );
        
        if (createDir === '是') {
          try {
            await fs.ensureDir(outDirPath);
            console.log('输出目录创建成功');
          } catch (error) {
            vscode.window.showErrorMessage(`❌ 创建输出目录失败: ${error}`);
            return;
          }
        } else {
          return;
        }
      }
      
      // 选择Excel文件
      const excelFilePath = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: {
          "Excel Files": ["xlsx"],
        },
        title: "选择要导入的Excel文件"
      });

      if (!excelFilePath || !excelFilePath[0]) {
        console.log('用户取消选择Excel文件');
        vscode.window.showInformationMessage("❌ 未选择Excel文件\n\n请选择一个有效的Excel文件（.xlsx格式）");
        return;
      }

      const excelFile = excelFilePath[0].fsPath;
      console.log('选择的Excel文件:', excelFile);
      
      // 检查Excel文件是否存在
      if (!fs.existsSync(excelFile)) {
        vscode.window.showErrorMessage(`❌ Excel文件不存在: ${excelFile}`);
        return;
      }
      
      // 检查Excel文件权限
      try {
        await fs.access(excelFile, fs.constants.R_OK);
      } catch (error) {
        vscode.window.showErrorMessage(`❌ Excel文件权限不足: ${excelFile}\n\n请检查文件读取权限`);
        return;
      }
      
      console.log('开始读取Excel文件');
      const workbook = new Excel.Workbook();
      
      try {
        await workbook.xlsx.readFile(excelFile);
        console.log('Excel文件读取成功');
      } catch (error) {
        console.error('读取Excel文件失败:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`❌ 读取Excel文件失败: ${errorMessage}\n\n请确保:\n1. 文件是有效的Excel格式\n2. 文件没有被其他程序占用\n3. 文件没有损坏`);
        return;
      }

      const sheet = workbook.worksheets[0];
      if (!sheet) {
        vscode.window.showErrorMessage(`❌ Excel文件中没有找到工作表\n\n请确保Excel文件包含至少一个工作表`);
        return;
      }
      
      console.log('工作表名称:', sheet.name);
      console.log('工作表行数:', sheet.actualRowCount);
      console.log('工作表列数:', sheet.actualColumnCount);

      const headers = sheet.getRow(1).values as Excel.CellValue[];
      console.log('表头:', headers);

      if (!headers || (headers?.length as number) < 3) {
        vscode.window.showErrorMessage(
          `❌ Excel文件格式错误\n\n至少需要包含:\n1. key列（第一列）\n2. 默认语言列（第二列）\n3. 其他语言列（第三列及以后）\n\n当前列数: ${headers?.length || 0}`
        );
        return;
      }
      
      const langHeaders = headers?.slice(2);
      const languages = langHeaders.map((header) => header?.toString()).filter(Boolean);
      console.log('语言列表:', languages);
      
      if (languages.length === 0) {
        vscode.window.showErrorMessage(`❌ 未找到有效的语言列\n\n请确保Excel文件包含语言列（第三列开始）`);
        return;
      }

      const allLanguageData: { [lang: string]: { [key: string]: string } } = {};
      let processedRows = 0;
      let skippedRows = 0;
      
      console.log("开始处理Excel数据，总行数:", sheet.actualRowCount);
      
      for (let rowIndex = 2; rowIndex <= sheet.actualRowCount; rowIndex++) {
        const row = sheet.getRow(rowIndex);
        const key = row.getCell(1)?.value?.toString();
        
        if (!key || key.trim() === '') {
          console.log(`跳过空键的行 ${rowIndex}`);
          skippedRows++;
          continue;
        }
        
        console.log(`处理第 ${rowIndex} 行，键: ${key}`);
        
        languages.forEach((lang, index) => {
          if (lang) {
            if (!allLanguageData[lang]) {
              allLanguageData[lang] = {};
            }
            const value = row?.getCell(index + 2)?.value?.toString() || "";
            allLanguageData[lang][key] = value;
            console.log(`语言 ${lang} 的键 ${key} 值: ${value}`);
          }
        });
        
        processedRows++;
      }
      
      console.log("数据处理完成");
      console.log("处理的键值对数量:", processedRows);
      console.log("跳过的行数:", skippedRows);
      console.log("语言数据:", allLanguageData);
      
      if (processedRows === 0) {
        vscode.window.showWarningMessage(`⚠️ 没有找到有效的键值对\n\n请检查Excel文件格式是否正确`);
        return;
      }
      
      // 显示进度
      const progressOptions = {
        location: vscode.ProgressLocation.Notification,
        title: "导入Excel数据",
        cancellable: false
      };

      await vscode.window.withProgress(progressOptions, async (progress) => {
        const languageEntries = Object.entries(allLanguageData);
        
        for (let i = 0; i < languageEntries.length; i++) {
          const [lang, newData] = languageEntries[i];
          progress.report({
            message: `处理语言: ${lang} (${i + 1}/${languageEntries.length})`,
            increment: (1 / languageEntries.length) * 100
          });
          
          const langFilePath = path.resolve(rootPath, outDir, `${lang}.${extname}`);
          console.log(`处理语言文件: ${langFilePath}`);

          // 读取现有文件内容（如果存在）
          let existingData: { [key: string]: string } = {};
          try {
            if (fs.pathExistsSync(langFilePath)) {
              console.log(`读取现有文件: ${langFilePath}`);
              const jsonData = fs.readFileSync(langFilePath, "utf8");
              existingData = JSON.parse(jsonData);
              console.log(`现有文件包含 ${Object.keys(existingData).length} 个键值对`);
            } else {
              console.log(`文件不存在，将创建新文件: ${langFilePath}`);
            }
          } catch (error) {
            console.error(`读取现有JSON文件失败 ${lang}:`, error);
            vscode.window.showWarningMessage(`⚠️ 读取现有文件失败 ${lang}: ${error}`);
          }

          // 合并现有数据与新数据
          const mergedData = { ...existingData, ...newData };
          console.log(`合并后数据包含 ${Object.keys(mergedData).length} 个键值对`);

          // 写入合并后数据
          try {
            fs.writeFileSync(langFilePath, JSON.stringify(mergedData, null, 2));
            console.log(`语言 ${lang} 数据已写入/合并到 ${langFilePath}`);
          } catch (error) {
            console.error(`写入语言文件失败 ${lang}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`❌ 写入语言文件失败 ${lang}: ${errorMessage}`);
          }
        }
      });

      const message = `✅ 导入成功\n\n处理键值对: ${processedRows} 个\n语言数量: ${languages.length} 个\n跳过的行数: ${skippedRows} 个\n\n语言文件已保存到: ${outDirPath}`;
      vscode.window.showInformationMessage(message);
      
    } catch (error) {
      console.error('导入Excel过程中出错:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`❌ 导入Excel失败: ${errorMessage}\n\n请检查:\n1. Excel文件格式是否正确\n2. 项目配置是否正确\n3. 插件是否正常激活`);
    }
  });
};
