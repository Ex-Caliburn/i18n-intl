import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { getI18nConfig } from "./index";
export const hasImport = (ast: any) => {
  let found = false;
  const { importDeclarationPath } = getI18nConfig();
  traverse(ast, {
    ImportDeclaration(path) {
      const { node } = path;
      if (node.source.value === importDeclarationPath) {
        found = true;
      }
    },
  });
  return found;
};

export const myImportDeclaration = (): t.Statement | null => {
  const { importDeclarationPath } = getI18nConfig();
  if (importDeclarationPath) {
    return t.importDeclaration(
      [t.importDefaultSpecifier(t.identifier('useI18n'))], // 使用默认导入并指定本地绑定名称为usei18n
      t.stringLiteral(importDeclarationPath) // 导入路径来自配置
    );
  } else {
    return null;
  }
};
