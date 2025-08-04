import * as vscode from "vscode";
import fs from "fs-extra";
import path from "path";
import { CONFIG_FILE_NAME } from "../constants";
import { merge } from "lodash";
import readLanguageFile from "./readLanguageFile";
export const editor = vscode.window.activeTextEditor;
const defaultConfig = require("../default.config");
export const getRootPath = (uri?: vscode.Uri) => {
  let rootPath = "";
  
  // 如果提供了 URI，优先使用它
  if (uri) {
    const selectedWorkspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (selectedWorkspaceFolder) {
      rootPath = selectedWorkspaceFolder.uri.fsPath;
      return rootPath;
    }
  }
  
  // 否则使用活动的文本编辑器
  if (editor) {
    const currentDocumentUri = editor.document.uri;
    const selectedWorkspaceFolder =
      vscode.workspace.getWorkspaceFolder(currentDocumentUri);
    if (selectedWorkspaceFolder) {
      rootPath = selectedWorkspaceFolder.uri.fsPath;
    }
  }
  
  return rootPath;
};
const getUserConfig = () => {
  const rootPath = getRootPath();
  console.log("rootPath", rootPath);
  
  if (!rootPath) {
    console.log("无法获取项目根路径");
    return {};
  }
  
  const configPath = path.resolve(rootPath, CONFIG_FILE_NAME);
  console.log("configPath", configPath);
  let config;
  if (!fs.existsSync(configPath)) {
    console.log("配置文件不存在");
    config = {};
  } else {
    config = require(configPath);
  }
  return config;
};

export const getI18nConfig = (): ProjectConfig => {
  const userConfig = getUserConfig();
  console.log("userConfig", userConfig);
  const config = merge(defaultConfig, userConfig);
  return config;
};

export const getSourceValue = (key: string): string | undefined => {
  const { outDir, defaultLanguage, extname } = getI18nConfig();
  const rootPath = getRootPath();
  const fileName = defaultLanguage + "." + extname;
  const jsonPatch = path.resolve(rootPath, outDir, fileName);
  const data = readLanguageFile(jsonPatch);
  console.log("data", data);
  const value = typeof data === 'object' && data !== null ? data[key] : undefined;
  console.log("value", value);
  return typeof value === 'string' ? value : undefined;
};
export const getKeySourceMap = (): Record<string, string> => {
  const { outDir, defaultLanguage, extname } = getI18nConfig();
  const rootPath = getRootPath();
  const fileName = defaultLanguage + "." + extname;
  const jsonPatch = path.resolve(rootPath, outDir, fileName);
  const data = readLanguageFile(jsonPatch);
  // 确保返回扁平格式的数据
  if (typeof data === 'object' && data !== null) {
    return flatJson(data);
  }
  return {};
};

export const getKeyBySourceText = (text: string): string => {
  if (text) {
    const keySourceMap = getKeySourceMap();
    const index = Object.values(keySourceMap).findIndex(
      (item) => item === text
    );
    if (index) {
      const key = Object.keys(keySourceMap)[index];
      return key;
    } else {
      return "";
    }
  }
  return "";
};

/**
 * 更新所有文件中指定key的引用
 * @param {string} oldKey 要替换的旧键
 * @param {string} newKey 新的键
 */
export async function updateFilesKey({
  oldKey,
  newKey,
}: {
  oldKey: string;
  newKey: string;
}) {
  const projectRoot = getRootPath();
  const srcPath = path.resolve(projectRoot, "src");
  // 支持的文件类型
  const supportedExtensions = [".js", ".jsx", ".ts", ".tsx"];
  // 定义正则表达式，匹配如 {t('oldKey')} 或 {i18n.t('oldKey')} 的模式
  const { quoteKeys } = getI18nConfig();
  const escapedOldKey = oldKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); // 正确转义oldKey中的特殊字符
  const regexPattern = new RegExp(
    `\\${quoteKeys}\\('\\${escapedOldKey}'\\)`,
    "g"
  );
  async function updateFileContent(filePath: string) {
    try {
      let content = await fs.readFile(filePath, "utf8");
      console.log("regexPattern", regexPattern);
      let updatedContent = content.replace(
        regexPattern,
        `{${quoteKeys}(${newKey})}`
      );
      if (content !== updatedContent) {
        fs.writeFile(filePath, updatedContent, "utf8");
        console.log(`Updated key in file: ${filePath}`);
      }
    } catch (err) {
      console.error(`Error reading or writing file: ${filePath}`, err);
    }
  }

  // 遍历项目文件
  function traverseAndUpdate(dirPath: string) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    entries.forEach((entry) => {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        traverseAndUpdate(entryPath);
      } else if (supportedExtensions.includes(path.extname(entry.name))) {
        updateFileContent(entryPath);
      }
    });
  }

  traverseAndUpdate(srcPath);
}

/**
 * 扁平化json
 * @param obj
 * @returns
 */
export function flatJson(obj: StringObject): { [key: string]: string } {
  let result: { [key: string]: string } = {};
  function _flatten(currentObj: StringObject, currentPrefix = ""): void {
    for (const key in currentObj) {
      if (currentObj.hasOwnProperty(key)) {
        const value = currentObj[key];
        const newKey = currentPrefix ? `${currentPrefix}.${key}` : key;
        if (typeof value === "object" && value !== null) {
          // 递归处理嵌套的对象
          _flatten(value, newKey);
        } else {
          // 确保值为字符串
          result[newKey] = String(value);
        }
      }
    }
  }

  _flatten(obj);
  return result;
}

/**
 * unFlattenJson
 * 扁平化json 转化为嵌套
 * @param obj
 * @returns
 */
export function unFlattenJson(obj: { [key: string]: string }): any {
  const result: StringObject = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) { 
      const keys = key.split('.') || [];
      let current = result;

      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        current[k] =
          i === keys.length - 1
            ? obj[key]
            : current[k] || (typeof keys[i + 1] === "string" ? {} : {}); // 这里初始化为空对象{}更合适
        current = current[k] as any; // 添加类型断言以避免类型错误
      }
    }
  }

  return result;
}

/**
 * 深度合并两个对象
 * @param target 目标对象
 * @param source 源对象
 * @returns 合并后的对象
 */
export function deepMerge(target: any, source: any): any {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

