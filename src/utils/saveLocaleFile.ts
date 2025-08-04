import * as vscode from "vscode";
import fs from "fs-extra";
import { serializeCode } from "./serializeCode";
import { getI18nConfig, getRootPath, flatJson, unFlattenJson, deepMerge } from ".";
import path from "path";
import readLanguageFile from "./readLanguageFile";

export async function saveLocaleFile(
  locale: {[key: string]: string},
  defaultLanguage: string,
  uri?: vscode.Uri
) {
  const { outDir, extname, outShow } = getI18nConfig();
  const rootPath = getRootPath(uri);
  const localsPath = path.join(rootPath, outDir);
  const fullFileName = `${defaultLanguage}.${extname}`;
  const localePath = path.join(localsPath, fullFileName);
  console.log("localePath", localePath);
  
  // 如果文件不存在，创建一个空的文件
  if (!fs.existsSync(localePath)) {
    try {
      // 确保目录存在
      fs.ensureDirSync(localsPath);
      // 确保文件存在
      fs.ensureFileSync(localePath);
      fs.writeFileSync(localePath, '{}', "utf8");
    } catch (error) {
      console.error('创建目录或文件失败:', error);
      // 如果创建失败，尝试使用更基础的方法
      try {
        const dir = path.dirname(localePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(localePath, '{}', "utf8");
      } catch (fallbackError) {
        console.error('备用创建方法也失败:', fallbackError);
        throw fallbackError;
      }
    }
  }
  
  if (extname === "json") {
    const existingData = readLanguageFile(localePath);
    let mergedData;
    
    if (outShow === 2) {
      // 嵌套格式：需要将新的扁平数据转换为嵌套格式，然后合并
      const nestedLocale = unFlattenJson(locale);
      mergedData = deepMerge(existingData || {}, nestedLocale);
      console.log('outShow',outShow);
    } else {
      // 扁平格式：直接合并
      mergedData = { ...(existingData || {}), ...locale };
    }
    
    fs.writeFileSync(localePath, JSON.stringify(mergedData, null, 2), "utf8");
  } else {
    // // js 情况处理
    // const data = await serializeCode(locale);
    // fs.writeFileSync(localePath, data, "utf8");
  }
}
