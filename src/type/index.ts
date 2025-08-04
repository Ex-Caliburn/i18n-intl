declare type ProjectConfig = {
  entry: string[]; //项目入口
  outDir: string;
  outShow: 1 | 2;
  exclude: string[];
  extensions: string[];
  defaultLanguage: string;
  language: string[];
  extname: "json" | "js";
};

declare type StringObject = {
  [key: string]: string | StringObject;
};

// 文件扩展名
declare type FileExtension = "js" | "ts" | "jsx" | "tsx" | "vue";

