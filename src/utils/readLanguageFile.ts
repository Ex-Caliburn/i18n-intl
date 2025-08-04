import fs from "fs-extra";
import { flatJson, getI18nConfig } from ".";
export default function readLanguageFile(
  filePath: string
): { [key: string]: string } | StringObject {
  try {
    const data = fs.readJSONSync(filePath, "utf8");
    const { outShow } = getI18nConfig();
    
    // 根据outShow配置决定是否转换为扁平格式
    if (outShow === 1) {
      // 扁平格式：转换为扁平化json
      console.log('data',data, flatJson(data));
      return flatJson(data);
    } else {
      // 嵌套格式：保持原样
      console.log('data',data);
      return data;
    }
  } catch (error) {
    console.error(`Error reading ${filePath} file:`, error);
    return {};
  }
}
