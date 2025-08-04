# 🔧 VSCode插件发布故障排除指南

## ❌ 401错误解决方案

### 问题描述
```
ERROR  Failed request: (401)
```

### 可能原因
1. **个人访问令牌(PAT)权限不足**
2. **PAT已过期**
3. **发布者账户名称错误**
4. **Azure DevOps账户问题**

## 🛠️ 解决步骤

### 步骤1: 检查当前登录状态

```bash
# 检查是否已登录
vsce whoami

# 如果显示错误，需要重新登录
vsce logout
```

### 步骤2: 重新生成个人访问令牌

1. **访问Azure DevOps**
   - 打开 https://dev.azure.com/
   - 使用Microsoft账户登录

2. **进入个人设置**
   - 点击右上角头像
   - 选择 "Personal access tokens"

3. **删除旧令牌**
   - 找到之前的VSCode Marketplace令牌
   - 点击删除

4. **创建新令牌**
   - 点击 "New Token"
   - **名称**: `VSCode Marketplace`
   - **组织**: 选择你的组织
   - **过期时间**: 选择 "Custom defined" 并设置为1年
   - **范围**: 选择 "Custom defined"
   - **权限**: 确保勾选以下权限：
     - `Marketplace (Publish)` - `Full access`
     - `Marketplace (Manage)` - `Full access`

5. **复制令牌**
   - 生成后立即复制令牌
   - 令牌只显示一次！

### 步骤3: 重新登录

```bash
# 使用新令牌登录
vsce login JayLee
```

当提示输入Personal Access Token时，粘贴刚才复制的新令牌。

### 步骤4: 验证登录

```bash
# 验证登录状态
vsce whoami

# 应该显示你的发布者名称
```

### 步骤5: 重新发布

```bash
# 发布补丁版本
yarn publish:patch

# 或者发布次要版本
yarn publish:minor

# 或者发布主要版本
yarn publish:major
```

## 🔍 其他检查项

### 1. 检查发布者名称

确保你的Azure DevOps账户中的发布者名称与package.json中的一致：

```json
{
  "publisher": "JayLee"
}
```

### 2. 检查Azure DevOps组织

确保你在正确的Azure DevOps组织中创建了发布者账户。

### 3. 检查令牌权限

确保令牌具有以下权限：
- ✅ `Marketplace (Publish)` - `Full access`
- ✅ `Marketplace (Manage)` - `Full access`

## 🚨 常见错误及解决方案

### 错误1: "Personal Access Token verification failed"
**解决方案**: 重新生成令牌，确保权限正确

### 错误2: "Publisher not found"
**解决方案**: 
1. 检查package.json中的publisher名称
2. 在Azure DevOps中创建对应的发布者账户

### 错误3: "Token expired"
**解决方案**: 重新生成令牌，设置更长的过期时间

### 错误4: "Insufficient permissions"
**解决方案**: 确保令牌具有Marketplace发布权限

## 📞 获取帮助

### 官方文档
- [VSCode扩展发布指南](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Azure DevOps个人访问令牌](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate)

### 社区支持
- [VSCode扩展开发社区](https://github.com/microsoft/vscode-extension-samples)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/vscode-extension)

## ✅ 成功发布检查

发布成功后，你应该看到类似以下信息：

```
 INFO  Publishing 'JayLee.i18n v2.0.0'...
 INFO  Successfully published 'JayLee.i18n v2.0.0'
```

然后可以在以下位置找到你的插件：
- https://marketplace.visualstudio.com/
- 搜索 "i18n" 或 "JayLee"

## 🎯 预防措施

1. **定期更新令牌**: 设置较长的过期时间，避免频繁更新
2. **保存令牌**: 将令牌安全保存，避免丢失
3. **测试发布**: 在正式发布前先测试发布流程
4. **备份配置**: 保存重要的配置信息

## 📋 检查清单

- [ ] Azure DevOps账户正常
- [ ] 发布者账户已创建
- [ ] 个人访问令牌权限正确
- [ ] 令牌未过期
- [ ] package.json配置正确
- [ ] 登录状态正常
- [ ] 网络连接正常 