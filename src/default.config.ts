module.exports = {
  /**
   * 引号内的键名标识符，默认为'$t'，用于标记需要翻译的字符串。
   */
  quoteKeys: "$t",

  /**
   * 入口文件或目录数组，插件将从此处开始查找需要翻译的字符串。
   */
  entry: ["src"],

  /**
   * 输出目录，翻译文件将被生成到此目录下。
   */
  outDir: "src/locales",

  /**
   * json 格式 1 扁平 2 嵌套。
   */
  outShow: 1,

  /**
   * 需要从扫描中排除的目录或文件模式。
   */
  exclude: ["src/locales"],

  /**
   * 需要处理的文件扩展名列表。
   */
  extensions: [".vue", ".js", ".ts"],

  /**
   * 项目默认语言环境代码。
   */
  defaultLanguage: "zh_cn",

  /**
   * 支持的语言环境列表，空数组表示使用默认语言。
   */
  language: [],

  /**
   * 语言文件的扩展名 目前只能json了。vscode 中 es6 动态import 不支持
   * 所以 在vscode 中想获取 语言文件 中的内容没有好的方式，请使用json，后续我去掉。
   */
  extname: "json",

  /**
   * 导入声明的路径，如需自定义导入语句可以设置此项 例如 import $t from @/utils/i18n。
   */
  importDeclarationPath: null,
  /**
   * 火山翻译 密钥
   */
  hsAccessKey: "",
  hsSecretKey: "",
};
