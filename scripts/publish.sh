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
    echo "�� 已打包完成，未发布到市场"
fi 