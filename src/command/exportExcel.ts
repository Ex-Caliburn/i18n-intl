import * as vscode from "vscode";
import fs from "fs-extra";
import { getI18nConfig, getRootPath, flatJson } from "../utils";
import path from "path";
import Excel from "exceljs";
import readLanguageFile from "../utils/readLanguageFile";
export default (context: vscode.ExtensionContext) => {
  vscode.commands.registerCommand("i18n.export", (data) => {
    console.log("data.url", data.path);
    const rootPath = getRootPath();
    const { outDir, defaultLanguage, language = [], extname } = getI18nConfig();
    // 读取 JSON 文件
    const defaultLanguageFileName = defaultLanguage + "." + extname;

    console.log("jsonFileName", defaultLanguageFileName);
    const jsonFilePath = path.resolve(
      rootPath,
      outDir,
      defaultLanguageFileName
    );
    // 预先读取所有语言文件的内容
    const langDataMap: { [lang: string]: { [key: string]: string } } = {};
    for (const lang of language) {
      const langFilePath = path.resolve(rootPath, outDir, lang + "." + extname);
      const langData = readLanguageFile(langFilePath);
      // 确保转换为扁平格式
      langDataMap[lang] = flatJson(langData as any);
    }
    console.log("jsonFilePath", jsonFilePath);
    const jsonObject = readLanguageFile(jsonFilePath);
    // 确保转换为扁平格式
    const flatJsonObject = flatJson(jsonObject as any);
    async function createAndExportExcel() {
      // 创建 Excel 工作簿和工作表
      const workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet("Sheet1");

      // 获取 JSON 对象的所有键，用于设置表头
      // 设置表头为 JSON 对象的键（key）
      const languageList = language.filter((item) => item !== defaultLanguage);
      console.log("languageList", languageList);
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
      console.log("langDataMap", langDataMap);
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
      }
      // 写入 Excel 文件
      const excelFilePath = path.resolve(rootPath, "excelFile.xlsx");
      workbook.xlsx
        .writeFile(excelFilePath)
        .then(() => {
          console.log(`Excel file has been created at ${excelFilePath}`);
          vscode.window.showInformationMessage("i18n成功导出excel请查看");
        })
        .catch((err: any) => {
          console.error("Error writing Excel file:", err);
        });
    }
    // 运行函数
    createAndExportExcel();
  });
};
