# 🚀 VSCode插件完整发布指南

## 📋 发布前检查清单

### 1. 项目配置检查

- ✅ `package.json` 配置完整
- ✅ 插件图标 `logo.png` 存在
- ✅ README.md 文档完善
- ✅ CHANGELOG.md 更新
- ✅ 代码编译通过
- ✅ LICENSE文件已添加

### 2. 必要文件检查

```bash
# 检查编译输出
ls -la out/

# 检查必要文件
ls -la logo.png
ls -la README.md
ls -la CHANGELOG.md
ls -la LICENSE
```

## 🚀 发布步骤

### 步骤1: 环境准备

#### 1.1 升级Node.js版本
```bash
# 检查当前版本
node --version

# 如果版本低于16，升级到最新LTS
nvm install --lts
nvm use --lts

# 或者使用特定版本
nvm use 20
```

#### 1.2 安装VSCode扩展管理器
```bash
npm install -g @vscode/vsce
```

### 步骤2: 编译项目

```bash
# 安装依赖
yarn install

# 编译TypeScript
yarn compile

# 运行测试
yarn test
```

### 步骤3: 打包扩展

```bash
# 打包为.vsix文件
vsce package

# 或者指定输出文件名
vsce package --out i18n-extension.vsix
```

### 步骤4: 创建发布者账户

1. 访问 [Azure DevOps](https://dev.azure.com/)
2. 创建免费账户
3. 创建个人访问令牌 (PAT)
   - 范围: `Marketplace (Publish)`
   - 权限: `Full access`

### 步骤5: 登录VSCode Marketplace

```bash
# 使用个人访问令牌登录
vsce login <publisher-name>

# 例如
vsce login JayLee
```

### 步骤6: 发布扩展

```bash
# 发布到VSCode Marketplace
vsce publish

# 或者发布特定版本
vsce publish patch  # 0.0.8 -> 0.0.9
vsce publish minor  # 0.0.8 -> 0.1.0
vsce publish major  # 0.0.8 -> 1.0.0
```

## 📦 发布前优化

### 1. 更新package.json

```json
{
  "name": "i18n",
  "displayName": "i18n - 国际化工具",
  "description": "VSCode国际化插件，支持中文提取、自动翻译、Excel导入导出等功能",
  "publisher": "JayLee",
  "version": "0.0.8",
  "engines": {
    "vscode": "^1.87.0"
  },
  "categories": [
    "Other",
    "Programming Languages",
    "Snippets"
  ],
  "keywords": [
    "i18n",
    "internationalization",
    "translation",
    "chinese",
    "extract",
    "excel",
    "vue",
    "react"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/Ex-Caliburn/i18n-vscode.git"
  },
  "bugs": {
    "url": "https://github.com/Ex-Caliburn/i18n-vscode/issues"
  },
  "homepage": "https://github.com/Ex-Caliburn/i18n-vscode#readme",
  "license": "MIT",
  "icon": "logo.png",
  "galleryBanner": {
    "color": "#C80000",
    "theme": "dark"
  }
}
```

### 2. 更新README.md

```markdown
# i18n - VSCode国际化插件

[![Version](https://img.shields.io/badge/version-0.0.8-blue.svg)](https://marketplace.visualstudio.com/items?itemName=JayLee.i18n)
[![Downloads](https://img.shields.io/badge/downloads-0-brightgreen.svg)](https://marketplace.visualstudio.com/items?itemName=JayLee.i18n)

## 功能特性

- 🔍 **智能提取**: 自动扫描并提取项目中的中文文案
- 🌐 **多语言支持**: 支持Vue、React、TypeScript等多种框架
- 🤖 **自动翻译**: 集成火山翻译API，支持中英文互译
- 📊 **Excel导入导出**: 支持Excel格式的翻译文件处理
- ⚡ **实时提示**: 代码中显示翻译键值，支持快速跳转
- 🎯 **精确定位**: 支持注释忽略和自定义提取规则

## 快速开始

1. 安装插件
2. 右键选择"项目设置"初始化配置
3. 使用"提取当前"或"提取项目"开始提取中文
4. 使用"火山翻译"进行自动翻译
5. 导出Excel进行人工校对

## 支持的文件类型

- ✅ JavaScript (.js, .jsx)
- ✅ TypeScript (.ts, .tsx)
- ✅ Vue (.vue)
- ✅ React (.jsx, .tsx)

## 使用方法

### 1. 项目初始化

右键项目根目录 → "项目设置" → 配置i18n参数

### 2. 提取中文文案

- **提取当前文件**: 右键当前文件 → "提取当前"
- **提取当前目录**: 右键目录 → "提取当前目录"
- **提取整个项目**: 右键项目 → "提取项目"

### 3. 自动翻译

使用"火山翻译"功能，支持：
- 中文 → 英文翻译
- 批量翻译处理
- 翻译结果保存

### 4. Excel处理

- **导出Excel**: 将翻译结果导出为Excel文件
- **导入Excel**: 将Excel中的翻译结果导入项目

## 配置说明

在项目根目录创建 `i18n.config.js`:

```javascript
module.exports = {
  outDir: 'src/locales',        // 输出目录
  defaultLanguage: 'zh',         // 默认语言
  extname: 'json',              // 文件扩展名
  outShow: 1,                   // 输出格式 (1: 扁平化, 2: 嵌套)
  hsAccessKey: 'your-access-key', // 火山翻译AccessKey
  hsSecretKey: 'your-secret-key'  // 火山翻译SecretKey
}
```

## 更新日志

### [0.0.8] - 2024-08-04

- ✨ 新增火山翻译API集成
- 🔧 优化签名算法，与官方示例完全一致
- 📝 完善错误处理和调试信息
- 🎯 提升翻译质量和响应速度

### [0.0.7] - 2024-08-03

- 🐛 修复中文提取bug
- ✨ 新增Excel导入导出功能
- 🔧 优化Vue文件解析

## 问题反馈

如有问题或建议，请提交 [Issue](https://github.com/Ex-Caliburn/i18n-vscode/issues)

## 许可证

MIT License
```

### 3. 更新CHANGELOG.md

```markdown
# Change Log

All notable changes to the "i18n" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.8] - 2024-08-04

### Added
- ✨ 新增火山翻译API集成
- 🔧 优化签名算法，与官方示例完全一致
- 📝 完善错误处理和调试信息
- 🎯 提升翻译质量和响应速度

### Changed
- 🔧 重构翻译API调用逻辑
- 📝 更新文档和测试用例

### Fixed
- 🐛 修复签名算法不一致问题
- 🐛 修复API调用失败问题

## [0.0.7] - 2024-08-03

### Added
- ✨ 新增Excel导入导出功能
- 🔧 优化Vue文件解析

### Fixed
- 🐛 修复中文提取bug

## [Unreleased]

- Initial release
```

## 🔧 发布命令脚本

### 创建发布脚本 `scripts/publish.sh`:

```bash
#!/bin/bash

echo "🚀 开始发布VSCode插件..."

# 检查是否安装了vsce
if ! command -v vsce &> /dev/null; then
    echo "❌ 未安装vsce，正在安装..."
    npm install -g @vscode/vsce
fi

# 检查依赖
echo "📦 检查依赖..."
yarn install

# 编译项目
echo "🔨 编译项目..."
yarn compile

# 检查编译结果
if [ ! -f "out/extension.js" ]; then
    echo "❌ 编译失败，out/extension.js 不存在"
    exit 1
fi

echo "✅ 编译成功"

# 运行测试
echo "🧪 运行测试..."
yarn test

# 检查必要文件
echo "📋 检查必要文件..."
if [ ! -f "logo.png" ]; then
    echo "❌ logo.png 不存在"
    exit 1
fi

if [ ! -f "README.md" ]; then
    echo "❌ README.md 不存在"
    exit 1
fi

if [ ! -f "CHANGELOG.md" ]; then
    echo "❌ CHANGELOG.md 不存在"
    exit 1
fi

echo "✅ 必要文件检查通过"

# 打包扩展
echo "📦 打包扩展..."
vsce package

# 检查打包结果
if [ ! -f "*.vsix" ]; then
    echo "❌ 打包失败，未生成.vsix文件"
    exit 1
fi

echo "✅ 打包成功"

# 询问是否发布
read -p "是否要发布到VSCode Marketplace? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 发布扩展..."
    vsce publish
    echo "✅ 发布完成！"
else
    echo "📦 已打包完成，未发布到市场"
fi
```

### 更新package.json脚本

```json
{
  "scripts": {
    "vscode:prepublish": "yarn run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "yarn run compile && yarn run lint",
    "lint": "eslint src --ext ts",
    "test": "vscode-test",
    "test-simple": "node test-simple.js",
    "test-advanced": "node test-advanced.js",
    "check": "node check-env.js",
    "package": "vsce package",
    "publish": "vsce publish",
    "publish:patch": "vsce publish patch",
    "publish:minor": "vsce publish minor",
    "publish:major": "vsce publish major",
    "release": "bash scripts/publish.sh"
  }
}
```

## 📋 发布检查清单

### 发布前
- [ ] 代码编译通过
- [ ] 测试用例通过
- [ ] README.md 更新
- [ ] CHANGELOG.md 更新
- [ ] package.json 版本号更新
- [ ] 图标文件存在
- [ ] 许可证文件存在

### 发布时
- [ ] 登录VSCode Marketplace
- [ ] 打包扩展文件
- [ ] 发布到市场
- [ ] 验证发布成功

### 发布后
- [ ] 检查Marketplace页面
- [ ] 测试安装和功能
- [ ] 更新文档链接
- [ ] 推广插件

## 🎯 发布最佳实践

1. **版本管理**: 使用语义化版本号
2. **文档完善**: 提供详细的使用说明
3. **测试充分**: 确保功能稳定
4. **反馈收集**: 及时响应用户反馈
5. **持续更新**: 定期发布新版本

## 🚀 快速发布

### 一键发布

```bash
# 运行发布脚本
yarn release
```

### 手动发布步骤

#### 1. 安装发布工具
```bash
npm install -g @vscode/vsce
```

#### 2. 编译项目
```bash
yarn install
yarn compile
```

#### 3. 打包扩展
```bash
yarn package
```

#### 4. 登录VSCode Marketplace
```bash
vsce login JayLee
```

#### 5. 发布扩展
```bash
# 发布补丁版本 (0.0.8 -> 0.0.9)
yarn publish:patch

# 发布次要版本 (0.0.8 -> 0.1.0)
yarn publish:minor

# 发布主要版本 (0.0.8 -> 1.0.0)
yarn publish:major
```

## 📊 当前状态

### ✅ 已完成
- ✅ Node.js版本已升级到20.16.0
- ✅ vsce工具已安装并正常工作
- ✅ 项目编译成功
- ✅ 扩展打包成功 (245.33 KB)
- ✅ 所有警告已解决
- ✅ LICENSE文件已添加

### 📦 打包结果

```
文件: i18n-0.0.8.vsix
大小: 245.33 KB (37个文件)
状态: 打包成功，无警告
```

## 🔧 配置信息

### package.json 关键配置
```json
{
  "name": "i18n",
  "displayName": "i18n",
  "description": "VSCode国际化插件，支持中文提取、自动翻译、Excel导入导出等功能",
  "publisher": "JayLee",
  "version": "0.0.8",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/Ex-Caliburn/i18n-vscode.git"
  }
}
```

### 发布者信息
- **发布者名称**: JayLee
- **GitHub仓库**: https://github.com/Ex-Caliburn/i18n-vscode.git
- **许可证**: MIT

## 🌟 功能特性

- 🔍 **智能提取**: 自动扫描并提取项目中的中文文案
- 🌐 **多语言支持**: 支持Vue、React、TypeScript等多种框架
- 🤖 **自动翻译**: 集成火山翻译API，支持中英文互译
- 📊 **Excel导入导出**: 支持Excel格式的翻译文件处理
- ⚡ **实时提示**: 代码中显示翻译键值，支持快速跳转
- 🎯 **精确定位**: 支持注释忽略和自定义提取规则

## 📞 获取帮助

### 创建Azure DevOps账户
1. 访问 [Azure DevOps](https://dev.azure.com/)
2. 使用Microsoft账户登录
3. 创建免费组织
4. 创建个人访问令牌 (PAT)
   - 范围: `Marketplace (Publish)`
   - 权限: `Full access`

### 发布后检查
1. 访问 [VSCode Marketplace](https://marketplace.visualstudio.com/)
2. 搜索 "i18n" 或 "JayLee"
3. 检查插件页面信息
4. 测试安装和功能

## 📊 预期结果

发布成功后，你的插件将出现在：
- VSCode Marketplace: https://marketplace.visualstudio.com/
- 插件ID: `JayLee.i18n`
- 安装命令: `ext install JayLee.i18n`

## 🎉 恭喜！

你的VSCode插件已经准备就绪，可以发布到VSCode Marketplace了！

**下一步**: 创建Azure DevOps账户并获取个人访问令牌，然后运行 `yarn release` 开始发布流程。

## 📞 获取帮助

- [VSCode扩展开发文档](https://code.visualstudio.com/api)
- [VSCode Marketplace发布指南](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [VSCode扩展打包工具](https://github.com/microsoft/vscode-vsce) 