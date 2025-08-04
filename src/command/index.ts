/***
 * vscode 国际化 插件开发
 * 开发计划
 * 1 生成项目配置
 * 2 提取中文
 * 3 批量提取中文
 * 4 自动翻译
 * 5 导出execl
 * 6 导入execl
 * 7 远程拉取文案
 * 8 上传文案
 */

import initConfig from './initConfig';
import extraction from './extraction';
import exportExcel from './exportExcel';
import importExcel from './importExcel';
import translateToEnglish from './translateToEnglish';
export {
    extraction,
    initConfig,
    exportExcel,
    importExcel,
    translateToEnglish
};