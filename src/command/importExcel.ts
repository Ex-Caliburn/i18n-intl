import * as vscode from "vscode";
import fs from "fs-extra";
import path from "path";
import Excel from "exceljs";
import { getI18nConfig, getRootPath } from "../utils";

export default (context: vscode.ExtensionContext) => {
  vscode.commands.registerCommand("jaylee-i18n.import", async () => {
    const excelFilePath = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: {
        "Excel Files": ["xlsx"],
      },
    });

    if (!excelFilePath || !excelFilePath[0]) {
      vscode.window.showErrorMessage("未选择Excel文件");
      return;
    }

    const excelFile = excelFilePath[0].fsPath;
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(excelFile);

    const sheet = workbook.worksheets[0];
    const headers = sheet.getRow(1).values as Excel.CellValue[];

    if (!headers || (headers?.length as number) < 3) {
      vscode.window.showErrorMessage(
        "Excel文件格式错误：至少需要包含默认语言列和其他一种语言列"
      );
    } else {
      const langHeaders = headers?.slice(2);
      const languages = langHeaders.map((header) => header?.toString());
      const rootPath = getRootPath();
      const { outDir, extname } = getI18nConfig();

      const allLanguageData: { [lang: string]: { [key: string]: string } } = {};
      console.log("languages", languages, sheet.actualRowCount);
      for (let rowIndex = 2; rowIndex <= sheet.actualRowCount; rowIndex++) {
        const row = sheet.getRow(rowIndex);
        console.log("row", row);

        const key = row.getCell(1)?.value?.toString() as string;
        console.log("key", key);
        languages.forEach((lang, index) => {
          if (lang) {
            if (!allLanguageData[lang]) {
              allLanguageData[lang] = {};
            }
            allLanguageData[lang][key] =
              row?.getCell(index + 2)?.value?.toString() || "";
          }
        });
      }
      console.log("allLanguageData", allLanguageData);
      // 写入数据到各个JSON文件，如果文件存在则合并数据
      Object.entries(allLanguageData).forEach(async ([lang, newData]) => {
        const langFilePath = path.resolve(
          rootPath,
          outDir,
          `${lang}.${extname}`
        );

        // 读取现有文件内容（如果存在）
        let existingData: { [key: string]: string } = {};
        try {
          if (fs.pathExistsSync(langFilePath)) {
            const jsonData = fs.readFileSync(langFilePath, "utf8");
            existingData = JSON.parse(jsonData);
          }
        } catch (error) {
          console.error(`Error reading existing JSON file for ${lang}:`, error);
        }

        // 合并现有数据与新数据
        const mergedData = { ...existingData, ...newData };

        // 写入合并后数据
        fs.writeFileSync(langFilePath, JSON.stringify(mergedData, null, 2));
        console.log(
          `Data for ${lang} has been written/merged to ${langFilePath}`
        );
      });

      vscode.window.showInformationMessage("导入成功");
    }
  });
};
