export const CONFIG_FILE_NAME = "i18n.config.js";

export const IgnoredJSXAttributes = [
  "class",
  "url",
  "src",
  "href",
  "className",
  "key",
  "style",
  "ref",
  "onClick",
];
// 需要处理的文件扩展名列表(暂时没用)。
// extensions: [".vue", ".js", ".ts"],
// 读取default.config 还不行先写一个configTemplate吧
export const configTemplate = `
module.exports = {
  // 引号内的键名标识符，默认为'$t'，例如 $t("key")。
  quoteKeys: "$t",
  // 入口文件 暂时没用。
  entry: ["src"],
  // 输出目录，翻译文件将被生成到此目录下。
  outDir: "src/locales",
  // json的格式 1 扁平化 2 嵌套的格式。
  outShow: 1,
  // 需要从扫描中排除的目录或文件模式。
  exclude: ["src/locales"],
  // 默认源语言
  defaultLanguage: "zh_cn",
  // 目标语言。
  language: [],
  // 语言文件的扩展名 目前只能json了。vscode 中 es6 动态import 不支持 导致 没有好的方式 获取通过 Es module 导出的js jsx语言文件。
  extname: "json",
  // 导入声明的路径，如需自定义导入语句可以设置此项 例如 import $t from @/utils/i18n。
  importDeclarationPath: null,
};
`;
