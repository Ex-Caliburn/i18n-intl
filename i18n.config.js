
module.exports = {
  // 入口文件 暂时没用
  entry: ['src'],
  // 输出目录，翻译文件将被生成到此目录下。
  outDir: 'src/locales',
  // json的格式 1 扁平化 2 嵌套的格式。
  outShow: 1,
  // 需要从扫描中排除的目录或文件模式。
  exclude: ['src/locales'],
  // 默认源语言
  defaultLanguage: 'zh-cn',
  // 目标语言。
  language: ['en-us'],
  // 语言文件的扩展名 目前只能json了。vscode 中 es6 动态import 不支持 导致 没有好的方式 获取通过 Es module 导出的js jsx语言文件。
  extname: 'json',
  // 导入声明的路径，如需自定义导入语句可以设置此项 例如 import { useIntl } from "umi"。
  importDeclarationPath: 'umi',
  // 项目Id
  projectId: '',
  //翻译管理平台密钥
  secretKey: '',
  // 百度翻译appid
  baiduAppid: '',
  // 百度翻译密钥
  baiduSecret: '',
  // deeplApiKey
  deeplApiKey: '',
  // 火山
  hsAccessKey: "",
  hsSecretKey: "",
};